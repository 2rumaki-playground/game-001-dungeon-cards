import { beforeEach, describe, expect, it } from "vitest";
import {
	endSession,
	getCurrentSession,
	recordCardUsage,
	recordDamageDealt,
	recordDamageTaken,
	recordFloorReached,
	recordTurnEnd,
	resetSession,
	startSession,
} from "./playStats";

describe("playStats", () => {
	beforeEach(() => {
		resetSession();
	});

	describe("startSession", () => {
		it("セッションを開始できる", () => {
			startSession();
			const session = getCurrentSession();
			expect(session).not.toBeNull();
			expect(session?.id).toBeTruthy();
			expect(session?.startedAt).toBeGreaterThan(0);
			expect(session?.maxFloor).toBe(1);
			expect(session?.playerTurnCount).toBe(0);
		});

		it("initialFloorを指定するとmaxFloorがその値で初期化される", () => {
			startSession(5);
			const session = getCurrentSession();
			expect(session?.maxFloor).toBe(5);
		});

		it("開始時にcardUsageが全カードタイプ0で初期化される", () => {
			startSession();
			const session = getCurrentSession();
			expect(session?.cardUsage).toEqual({
				move: 0,
				fire: 0,
				thunder: 0,
				jump: 0,
				wait: 0,
			});
		});
	});

	describe("recordCardUsage", () => {
		it("カード使用回数を記録できる", () => {
			startSession();
			recordCardUsage("move");
			recordCardUsage("move");
			recordCardUsage("fire");
			const session = getCurrentSession();
			expect(session?.cardUsage.move).toBe(2);
			expect(session?.cardUsage.fire).toBe(1);
		});

		it("セッション未開始時はnoopになる", () => {
			recordCardUsage("move"); // エラーにならない
		});
	});

	describe("recordDamageDealt", () => {
		it("与ダメージを累計できる", () => {
			startSession();
			recordDamageDealt(3);
			recordDamageDealt(5);
			expect(getCurrentSession()?.totalDamageDealt).toBe(8);
		});

		it("セッション未開始時はnoopになる", () => {
			recordDamageDealt(1); // エラーにならない
		});
	});

	describe("recordDamageTaken", () => {
		it("被ダメージを累計できる", () => {
			startSession();
			recordDamageTaken(2);
			recordDamageTaken(3);
			expect(getCurrentSession()?.totalDamageTaken).toBe(5);
		});

		it("セッション未開始時はnoopになる", () => {
			recordDamageTaken(1); // エラーにならない
		});
	});

	describe("recordFloorReached", () => {
		it("最大階層を更新できる", () => {
			startSession();
			recordFloorReached(3);
			expect(getCurrentSession()?.maxFloor).toBe(3);
		});

		it("既存の最大階層より小さい場合は更新しない", () => {
			startSession();
			recordFloorReached(5);
			recordFloorReached(3);
			expect(getCurrentSession()?.maxFloor).toBe(5);
		});

		it("セッション未開始時はnoopになる", () => {
			recordFloorReached(1); // エラーにならない
		});
	});

	describe("recordTurnEnd", () => {
		it("ターン数を加算できる", () => {
			startSession();
			recordTurnEnd();
			recordTurnEnd();
			expect(getCurrentSession()?.playerTurnCount).toBe(2);
		});

		it("セッション未開始時はnoopになる", () => {
			recordTurnEnd(); // エラーにならない
		});
	});

	describe("endSession", () => {
		it("セッションを終了しPlaySessionを返す", () => {
			startSession();
			recordCardUsage("fire");
			recordDamageDealt(5);
			recordTurnEnd();
			const result = endSession("death", "enemy_attack");
			expect(result).not.toBeNull();
			expect(result?.result).toBe("death");
			expect(result?.deathCause).toBe("enemy_attack");
			expect(result?.endedAt).toBeGreaterThan(0);
			expect(result?.cardUsage.fire).toBe(1);
			expect(result?.totalDamageDealt).toBe(5);
			expect(result?.playerTurnCount).toBe(1);
		});

		it("クリア時はdeathCauseがnull", () => {
			startSession();
			const result = endSession("clear", null);
			expect(result?.result).toBe("clear");
			expect(result?.deathCause).toBeNull();
		});

		it("終了後にcurrentSessionがクリアされる", () => {
			startSession();
			endSession("death", "trap");
			expect(getCurrentSession()).toBeNull();
		});

		it("セッション未開始時はnullを返す", () => {
			expect(endSession("death", "unknown")).toBeNull();
		});

		it("killedByEnemyTypeを渡すとPlaySessionに含まれる", () => {
			startSession();
			const result = endSession("death", "enemy_attack", "boss");
			expect(result).not.toBeNull();
			expect(result?.result).toBe("death");
			expect(result?.deathCause).toBe("enemy_attack");
			if (result?.result === "death") {
				expect(result.killedByEnemyType).toBe("boss");
			}
		});

		it("killedByEnemyTypeを省略するとフィールドが含まれない", () => {
			startSession();
			const result = endSession("death", "enemy_attack");
			expect(result).not.toBeNull();
			if (result?.result === "death") {
				expect(result.killedByEnemyType).toBeUndefined();
			}
		});

		it("クリア時はkilledByEnemyTypeが含まれない", () => {
			startSession();
			const result = endSession("clear", null);
			expect(result?.result).toBe("clear");
			expect(result?.deathCause).toBeNull();
		});
	});

	describe("resetSession", () => {
		it("セッションをクリアする", () => {
			startSession();
			resetSession();
			expect(getCurrentSession()).toBeNull();
		});
	});
});
