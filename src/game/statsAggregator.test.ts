import { describe, expect, it } from "vitest";
import type { PlaySession } from "../types";
import { aggregateStats, formatDuration } from "./statsAggregator";

/** テスト用セッション生成ヘルパー */
function createDeathSession(overrides: Partial<PlaySession> = {}): PlaySession {
	return {
		id: "test-1",
		startedAt: 1000,
		endedAt: 61000,
		maxFloor: 5,
		cardUsage: { move: 10, attack: 5, strong_attack: 2, jump: 1, wait: 3 },
		totalDamageDealt: 20,
		totalDamageTaken: 10,
		playerTurnCount: 15,
		result: "death",
		deathCause: "enemy_attack",
		...overrides,
	} as PlaySession;
}

function createClearSession(overrides: Partial<PlaySession> = {}): PlaySession {
	return {
		id: "test-2",
		startedAt: 2000,
		endedAt: 302000,
		maxFloor: 20,
		cardUsage: { move: 30, attack: 20, strong_attack: 8, jump: 5, wait: 10 },
		totalDamageDealt: 80,
		totalDamageTaken: 15,
		playerTurnCount: 50,
		result: "clear",
		deathCause: null,
		...overrides,
	} as PlaySession;
}

describe("aggregateStats", () => {
	it("空配列で全フィールドがゼロまたはnull", () => {
		const stats = aggregateStats([]);

		expect(stats.totalPlays).toBe(0);
		expect(stats.clearCount).toBe(0);
		expect(stats.clearRate).toBeNull();
		expect(stats.floorDistribution.size).toBe(0);
		expect(stats.cardUsageRanking).toHaveLength(0);
		expect(stats.deathCauseRanking).toHaveLength(0);
		expect(stats.deathFloorDistribution.size).toBe(0);
		expect(stats.averageRunTime).toBeNull();
		expect(stats.maxFloorReached).toBe(0);
		expect(stats.averageMaxFloor).toBeNull();
	});

	it("1件のdeathセッションで正しく集計", () => {
		const session = createDeathSession();
		const stats = aggregateStats([session]);

		expect(stats.totalPlays).toBe(1);
		expect(stats.clearCount).toBe(0);
		expect(stats.clearRate).toBe(0);
		expect(stats.maxFloorReached).toBe(5);
		expect(stats.averageMaxFloor).toBe(5);
		expect(stats.averageRunTime).toBe(60000);
	});

	it("1件のclearセッションで正しく集計", () => {
		const session = createClearSession();
		const stats = aggregateStats([session]);

		expect(stats.totalPlays).toBe(1);
		expect(stats.clearCount).toBe(1);
		expect(stats.clearRate).toBe(1);
		expect(stats.deathCauseRanking).toHaveLength(0);
		expect(stats.deathFloorDistribution.size).toBe(0);
	});

	it("複数セッションで総プレイ回数が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1" }),
			createClearSession({ id: "s2" }),
			createDeathSession({ id: "s3" }),
		]);

		expect(stats.totalPlays).toBe(3);
	});

	it("クリア率の計算が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1" }),
			createClearSession({ id: "s2" }),
			createDeathSession({ id: "s3" }),
			createClearSession({ id: "s4" }),
		]);

		expect(stats.clearRate).toBe(0.5);
	});

	it("到達階層分布が正しくカウントされる", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", maxFloor: 3 }),
			createDeathSession({ id: "s2", maxFloor: 5 }),
			createDeathSession({ id: "s3", maxFloor: 3 }),
			createClearSession({ id: "s4", maxFloor: 20 }),
		]);

		expect(stats.floorDistribution.get(3)).toBe(2);
		expect(stats.floorDistribution.get(5)).toBe(1);
		expect(stats.floorDistribution.get(20)).toBe(1);
		expect(stats.floorDistribution.get(1)).toBeUndefined();
	});

	it("カード使用回数が降順ソートされる", () => {
		const stats = aggregateStats([
			createDeathSession({
				cardUsage: {
					move: 10,
					attack: 5,
					strong_attack: 2,
					jump: 1,
					wait: 3,
				},
			}),
		]);

		expect(stats.cardUsageRanking[0].cardType).toBe("move");
		expect(stats.cardUsageRanking[0].count).toBe(10);
		expect(stats.cardUsageRanking[1].cardType).toBe("attack");
		expect(stats.cardUsageRanking[1].count).toBe(5);
		// 使用回数0のカードは含まれない（全てが0でない前提）
		for (const entry of stats.cardUsageRanking) {
			expect(entry.count).toBeGreaterThan(0);
		}
	});

	it("複数セッションのカード使用回数を合算する", () => {
		const stats = aggregateStats([
			createDeathSession({
				id: "s1",
				cardUsage: {
					move: 10,
					attack: 5,
					strong_attack: 0,
					jump: 0,
					wait: 0,
				},
			}),
			createDeathSession({
				id: "s2",
				cardUsage: {
					move: 5,
					attack: 10,
					strong_attack: 0,
					jump: 0,
					wait: 0,
				},
			}),
		]);

		expect(stats.cardUsageRanking[0].cardType).toBe("move");
		expect(stats.cardUsageRanking[0].count).toBe(15);
		expect(stats.cardUsageRanking[1].cardType).toBe("attack");
		expect(stats.cardUsageRanking[1].count).toBe(15);
	});

	it("死因ランキングが降順ソートされる", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", deathCause: "enemy_attack" }),
			createDeathSession({ id: "s2", deathCause: "enemy_attack" }),
			createDeathSession({ id: "s3", deathCause: "trap" }),
		]);

		expect(stats.deathCauseRanking[0]).toEqual({
			cause: "enemy_attack",
			count: 2,
		});
		expect(stats.deathCauseRanking[1]).toEqual({
			cause: "trap",
			count: 1,
		});
	});

	it("階層別死亡分布が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", maxFloor: 5 }),
			createDeathSession({ id: "s2", maxFloor: 10 }),
			createDeathSession({ id: "s3", maxFloor: 5 }),
			createClearSession({ id: "s4", maxFloor: 20 }),
		]);

		expect(stats.deathFloorDistribution.get(5)).toBe(2);
		expect(stats.deathFloorDistribution.get(10)).toBe(1);
		expect(stats.deathFloorDistribution.get(20)).toBeUndefined();
	});

	it("平均ラン時間の計算が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({
				id: "s1",
				startedAt: 0,
				endedAt: 60000,
			}),
			createDeathSession({
				id: "s2",
				startedAt: 0,
				endedAt: 120000,
			}),
		]);

		expect(stats.averageRunTime).toBe(90000);
	});

	it("最高到達階層が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", maxFloor: 3 }),
			createDeathSession({ id: "s2", maxFloor: 15 }),
			createDeathSession({ id: "s3", maxFloor: 8 }),
		]);

		expect(stats.maxFloorReached).toBe(15);
	});

	it("平均到達階層の計算が正しい", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", maxFloor: 3 }),
			createDeathSession({ id: "s2", maxFloor: 9 }),
		]);

		expect(stats.averageMaxFloor).toBe(6);
	});

	it("空配列でenemyTypeDeathRankingが空", () => {
		const stats = aggregateStats([]);
		expect(stats.enemyTypeDeathRanking).toHaveLength(0);
	});

	it("killedByEnemyTypeがあるセッションで敵タイプ別ランキングを集計する", () => {
		const stats = aggregateStats([
			createDeathSession({
				id: "s1",
				deathCause: "enemy_attack",
				killedByEnemyType: "normal",
			}),
			createDeathSession({
				id: "s2",
				deathCause: "enemy_attack",
				killedByEnemyType: "boss",
			}),
			createDeathSession({
				id: "s3",
				deathCause: "enemy_attack",
				killedByEnemyType: "normal",
			}),
		]);

		expect(stats.enemyTypeDeathRanking).toHaveLength(2);
		expect(stats.enemyTypeDeathRanking[0]).toEqual({
			enemyType: "normal",
			count: 2,
		});
		expect(stats.enemyTypeDeathRanking[1]).toEqual({
			enemyType: "boss",
			count: 1,
		});
	});

	it("killedByEnemyTypeがないセッションはenemyTypeDeathRankingに含まれない", () => {
		const stats = aggregateStats([
			createDeathSession({ id: "s1", deathCause: "trap" }),
			createDeathSession({ id: "s2", deathCause: "enemy_attack" }),
		]);

		expect(stats.enemyTypeDeathRanking).toHaveLength(0);
	});
});

describe("formatDuration", () => {
	it("0msは「0分0秒」", () => {
		expect(formatDuration(0)).toBe("0分0秒");
	});

	it("60000msは「1分0秒」", () => {
		expect(formatDuration(60000)).toBe("1分0秒");
	});

	it("90000msは「1分30秒」", () => {
		expect(formatDuration(90000)).toBe("1分30秒");
	});

	it("3661000msは「61分1秒」", () => {
		expect(formatDuration(3661000)).toBe("61分1秒");
	});

	it("小数点以下のミリ秒は切り捨て", () => {
		expect(formatDuration(59999)).toBe("0分59秒");
	});
});
