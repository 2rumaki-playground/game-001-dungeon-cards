import { describe, expect, it } from "vitest";
import {
	ENEMY_COUNT,
	ENEMY_HP,
	HAND_LIMIT,
	MAP_HEIGHT,
	MAP_WIDTH,
	MAX_AP,
	TOTAL_DECK_SIZE,
} from "../constants";
import type { GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import { createInitialDeckState } from "./deck";
import { transitionFloor } from "./floor";

/**
 * テスト用の7x7マップを生成（外周壁・内側床・階段1つ）
 */
function createTestMap(): GameMap {
	const map: GameMap = [];
	for (let y = 0; y < MAP_HEIGHT; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < MAP_WIDTH; x++) {
			const isBoundary =
				x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
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
		enemies: [{ id: "enemy-1", position: { x: 2, y: 2 }, hp: 3, maxHp: 3 }],
		deck: createInitialDeckState(rng),
		actionLog: [],
		rng,
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

		// マップが存在し、正しいサイズ
		expect(result.map).toHaveLength(MAP_HEIGHT);
		expect(result.map[0]).toHaveLength(MAP_WIDTH);
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

	it("敵が新規配置される（ENEMY_COUNT体）", () => {
		const state = createTestState();
		const result = transitionFloor(state);

		expect(result.enemies).toHaveLength(ENEMY_COUNT);
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
});
