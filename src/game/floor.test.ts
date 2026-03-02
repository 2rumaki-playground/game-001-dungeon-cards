import { describe, expect, it } from "vitest";
import {
	DEFAULT_PERSONALITY,
	ENEMY_HP,
	ENEMY_PARAMS,
	getEnemyCount,
	getMapSize,
} from "../constants";
import { createTestEnemy } from "../test-utils/createTestFixtures";
import type { GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import { createInitialCounters } from "./cardAcquisition";
import { createInitialDeckState } from "./deck";
import { transitionFloor } from "./floor";

/**
 * テスト用の7x7マップを生成（外周壁・内側床・階段1つ）
 */
function createTestMap(): GameMap {
	const size = 7;
	const map: GameMap = [];
	for (let y = 0; y < size; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < size; x++) {
			const isBoundary = x === 0 || y === 0 || x === size - 1 || y === size - 1;
			row.push({ type: isBoundary ? "wall" : "floor" });
		}
		map.push(row);
	}
	return map;
}

/**
 * テスト用のGameStateを生成
 */
function createTestState(overrides?: Partial<GameState>): GameState {
	const rng = new RNG(12345);
	const map = createTestMap();
	return {
		screen: "game",
		turn: "player",
		floor: 1,
		map,
		player: {
			position: { x: 3, y: 3 },
			hp: 7,
			maxHp: 10,
		},
		enemies: [createTestEnemy("normal", { x: 2, y: 2 })],
		deck: createInitialDeckState(),
		actionLog: [],
		rng,
		defeatedEnemyCount: 0,
		isCleared: false,
		remnants: {},
		rooms: [],
		visitedTiles: new Set<string>(),
		lastAttackerEnemyType: null,
		acquisitionCounters: createInitialCounters(),
		cardExchangeQueue: [],
		comboHistory: null,
		personality: DEFAULT_PERSONALITY,
		speechLog: null,
		achievedMilestones: new Set(),
		pendingMilestone: null,
		...overrides,
	};
}

describe("transitionFloor", () => {
	it("階層番号が +1 される", () => {
		const state = createTestState({ floor: 3 });
		const result = transitionFloor(state);

		expect(result.floor).toBe(4);
	});

	it("新マップが生成される", () => {
		const state = createTestState();
		const result = transitionFloor(state);

		const expectedSize = getMapSize(result.floor);
		expect(result.map.length).toBe(expectedSize.height);
		for (const row of result.map) {
			expect(row.length).toBe(expectedSize.width);
		}
	});

	it("プレイヤーHPが維持される", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 7,
				maxHp: 10,
			},
		});
		const result = transitionFloor(state);

		expect(result.player.hp).toBe(7);
		expect(result.player.maxHp).toBe(10);
	});

	it("敵が新規配置される（階層に応じた体数）", () => {
		const state = createTestState();
		const result = transitionFloor(state);

		expect(result.enemies).toHaveLength(getEnemyCount(result.floor));
		// 階層2はnormal×3なので全員normalのHPを持つ
		for (const enemy of result.enemies) {
			expect(enemy.hp).toBe(ENEMY_HP);
			expect(enemy.maxHp).toBe(ENEMY_HP);
		}
	});

	it("使用済みカードIDリストがリセットされる", () => {
		const state = createTestState();
		// 事前に使用済みIDを設定
		state.deck = {
			...state.deck,
			usedCardIds: ["card-1", "card-2"],
		};
		const result = transitionFloor(state);

		// 使用済みIDリストが空になっている
		expect(result.deck.usedCardIds).toHaveLength(0);
		// 手札は維持されている
		expect(result.deck.hand.length).toBeGreaterThan(0);
	});

	it("ターンが player に設定される", () => {
		const state = createTestState({ turn: "enemy" });
		const result = transitionFloor(state);

		expect(result.turn).toBe("player");
	});

	it("手札が維持される", () => {
		const state = createTestState();
		const handBefore = state.deck.hand;
		const result = transitionFloor(state);

		// 手札は固定で変化しない
		expect(result.deck.hand).toHaveLength(handBefore.length);
		expect(result.deck.hand.map((c) => c.id)).toEqual(
			handBefore.map((c) => c.id),
		);
	});

	it("行動ログに記録される", () => {
		const state = createTestState({ floor: 1 });
		const result = transitionFloor(state);

		const hasFloorLog = result.actionLog.some((log) =>
			log.message.includes("2階に到達した"),
		);
		expect(hasFloorLog).toBe(true);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalFloor = state.floor;
		const originalHp = state.player.hp;
		const originalPosition = { ...state.player.position };

		transitionFloor(state);

		expect(state.floor).toBe(originalFloor);
		expect(state.player.hp).toBe(originalHp);
		expect(state.player.position).toEqual(originalPosition);
	});

	it("階層5遷移時にheavy敵が含まれる", () => {
		const state = createTestState({ floor: 4 });
		const result = transitionFloor(state);

		expect(result.floor).toBe(5);
		expect(result.enemies).toHaveLength(getEnemyCount(5));
		const heavyEnemies = result.enemies.filter((e) => e.type === "heavy");
		expect(heavyEnemies).toHaveLength(1);
		expect(heavyEnemies[0].hp).toBe(ENEMY_PARAMS.heavy.hp);
		expect(heavyEnemies[0].maxHp).toBe(ENEMY_PARAMS.heavy.hp);
	});

	it("階層9遷移時にscout×1 + heavy×1 + summoner×1の構成になる", () => {
		const state = createTestState({ floor: 8 });
		const result = transitionFloor(state);

		expect(result.floor).toBe(9);
		expect(result.enemies).toHaveLength(getEnemyCount(9));
		const scoutEnemies = result.enemies.filter((e) => e.type === "scout");
		const heavyEnemies = result.enemies.filter((e) => e.type === "heavy");
		const summonerEnemies = result.enemies.filter((e) => e.type === "summoner");
		// 構成テーブルはheavy×1 + scout×1 + summoner×1 = 3体分のタイプ比率
		// 4体目以降はすべてnormal
		expect(scoutEnemies).toHaveLength(1);
		expect(heavyEnemies).toHaveLength(1);
		expect(summonerEnemies).toHaveLength(1);
	});

	it("階層2→3遷移でマップサイズが9x9から11x11に拡大する", () => {
		const state = createTestState({ floor: 2 });
		const result = transitionFloor(state);

		expect(result.floor).toBe(3);
		expect(result.map.length).toBe(11);
		expect(result.map[0].length).toBe(11);
		expect(result.enemies).toHaveLength(getEnemyCount(3));
	});

	it("階層遷移時にremnantsがリセットされる", () => {
		const state = createTestState({
			remnants: { "2,2": 1, "4,3": 2 },
		});
		const result = transitionFloor(state);

		expect(result.remnants).toEqual({});
	});

	it("階層遷移時にvisitedTilesがリセットされ新開始位置が訪問済みになる", () => {
		const state = createTestState({
			visitedTiles: new Set(["1,1", "2,2", "3,3"]),
		});
		const result = transitionFloor(state);

		// 旧visitedTilesはリセットされている
		expect(result.visitedTiles.has("1,1")).toBe(false);
		// 新プレイヤー位置は訪問済み
		const playerKey = `${result.player.position.x},${result.player.position.y}`;
		expect(result.visitedTiles.has(playerKey)).toBe(true);
		// 少なくとも1つは訪問済み
		expect(result.visitedTiles.size).toBeGreaterThanOrEqual(1);
	});
});
