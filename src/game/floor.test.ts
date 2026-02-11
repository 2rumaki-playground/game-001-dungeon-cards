import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ENEMY_HP,
	ENEMY_PARAMS,
	getEnemyCount,
	getMapSize,
	HAND_LIMIT,
	MAX_AP,
	TOTAL_DECK_SIZE,
} from "../constants";
import type { GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import * as storage from "../utils/storage"; // Import for mocking
import { createInitialDeckState } from "./deck";
import { transitionFloor } from "./floor";

// storage.saveGame をモック
vi.mock("../utils/storage", async (importOriginal) => {
	const mod = await importOriginal<typeof import("../utils/storage")>();
	return {
		...mod,
		saveGame: vi.fn(),
	};
});

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
			ap: 1,
			maxAp: MAX_AP,
		},
		enemies: [
			{
				id: "enemy-1",
				position: { x: 2, y: 2 },
				hp: 3,
				maxHp: 3,
				type: "normal",
			},
		],
		deck: createInitialDeckState(rng),
		actionLog: [],
		rng,
		defeatedEnemyCount: 0,
		rewardState: null,
		isCleared: false,
		remnants: {},
		rooms: [],
		visitedTiles: new Set<string>(),
		...overrides,
	};
}

describe("transitionFloor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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
				ap: 1,
				maxAp: MAX_AP,
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

	it("デッキが全カード山札に戻りシャッフルされる", () => {
		const state = createTestState();
		const result = transitionFloor(state);

		// 手札と捨て札は空
		expect(result.deck.hand).toHaveLength(HAND_LIMIT);
		expect(result.deck.discardPile).toHaveLength(0);
		// 山札 + 手札 = 全カード数
		expect(result.deck.drawPile.length + result.deck.hand.length).toBe(
			TOTAL_DECK_SIZE,
		);
	});

	it("ターンが player に設定される", () => {
		const state = createTestState({ turn: "enemy" });
		const result = transitionFloor(state);

		expect(result.turn).toBe("player");
	});

	it("APが最大値にリセットされる", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 7,
				maxHp: 10,
				ap: 0,
				maxAp: MAX_AP,
			},
		});
		const result = transitionFloor(state);

		expect(result.player.ap).toBe(MAX_AP);
	});

	it("手札が補充される", () => {
		const state = createTestState();
		const result = transitionFloor(state);

		expect(result.deck.hand.length).toBeGreaterThan(0);
		expect(result.deck.hand).toHaveLength(HAND_LIMIT);
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

	it("階層9遷移時にscout×2 + heavy×1の構成になる", () => {
		const state = createTestState({ floor: 8 });
		const result = transitionFloor(state);

		expect(result.floor).toBe(9);
		expect(result.enemies).toHaveLength(getEnemyCount(9));
		const scoutEnemies = result.enemies.filter((e) => e.type === "scout");
		const heavyEnemies = result.enemies.filter((e) => e.type === "heavy");
		// 構成テーブルはheavy×1 + scout×2 = 3体分のタイプ比率
		// 4体目以降はすべてnormal
		expect(scoutEnemies).toHaveLength(2);
		expect(heavyEnemies).toHaveLength(1);
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

	it("saveGame が呼び出され、更新後の状態が保存される", () => {
		const state = createTestState({ floor: 5 });
		const result = transitionFloor(state);

		expect(storage.saveGame).toHaveBeenCalledTimes(1);

		// 呼び出し引数が更新後の状態（result）と一致するか
		expect(storage.saveGame).toHaveBeenCalledWith(result);

		// 念のため、保存された状態が期待通りか確認（例：階層が進んでいるか）
		const savedState = vi.mocked(storage.saveGame).mock.calls[0][0];
		expect(savedState.floor).toBe(6);
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
