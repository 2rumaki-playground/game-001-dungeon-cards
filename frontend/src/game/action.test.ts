import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_HP,
	MAP_HEIGHT,
	MAP_WIDTH,
	MAX_AP,
	PLAYER_ATTACK_DAMAGE,
} from "../constants";
import type { Enemy, GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import { executeAttack, executeMove, executeWait } from "./action";

/**
 * テスト用の7x7マップを生成（外周壁・内側床）
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
	const map = createTestMap();
	return {
		screen: "game",
		turn: "player",
		floor: 1,
		map,
		player: {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: MAX_AP,
			maxAp: MAX_AP,
		},
		enemies: [],
		deck: {
			drawPile: [],
			hand: [{ id: "move-1", type: "move" }],
			discardPile: [],
		},
		actionLog: [],
		rng: new RNG(12345),
		...overrides,
	};
}

describe("executeMove", () => {
	it("床タイルへの移動成功: 位置更新・AP消費・カード捨て札移動・行動ログ", () => {
		const state = createTestState();
		const result = executeMove(state, "move-1", "right");

		// 位置が更新される
		expect(result.player.position).toEqual({ x: 4, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("move-1");
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
	});

	it("壁タイルへの移動失敗: 位置変更なし・AP消費・カード捨て札移動・失敗ログ", () => {
		// プレイヤーを壁の隣に配置（1,1から上は壁）
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: 10,
				maxHp: 10,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const result = executeMove(state, "move-1", "up");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 1, y: 1 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 行動ログに失敗が記録
		expect(result.actionLog.length).toBeGreaterThan(0);
	});

	it("敵がいるマスへの移動失敗: 位置変更なし・AP消費", () => {
		const enemies: Enemy[] = [
			{ id: "enemy-1", position: { x: 4, y: 3 }, hp: 3, maxHp: 3 },
		];
		const state = createTestState({ enemies });
		const result = executeMove(state, "move-1", "right");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 3, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
	});

	it("階段タイルへの移動成功: 位置更新・行動ログに階段到達記録", () => {
		const map = createTestMap();
		// (4,3)を階段タイルに設定
		map[3][4] = { type: "stairs" };

		const state = createTestState({ map });
		const result = executeMove(state, "move-1", "right");

		// 位置が更新される
		expect(result.player.position).toEqual({ x: 4, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// 行動ログに階段到達が記録
		const hasStairsLog = result.actionLog.some((log) =>
			log.message.includes("階段"),
		);
		expect(hasStairsLog).toBe(true);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeMove(state, "move-1", "right");

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeAttack", () => {
	it("攻撃成功: 敵HPが減少・AP消費・カード捨て札移動・行動ログ", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const result = executeAttack(state, "attack-1", "right");

		// 敵HPが減少
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].hp).toBe(ENEMY_HP - PLAYER_ATTACK_DAMAGE);
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("attack-1");
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("敵に攻撃した");
	});

	it("攻撃成功（敵HP0で死亡）: 敵がenemiesから削除される", () => {
		const enemies: Enemy[] = [
			{ id: "enemy-1", position: { x: 4, y: 3 }, hp: 1, maxHp: ENEMY_HP },
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const result = executeAttack(state, "attack-1", "right");

		// 敵が削除される
		expect(result.enemies).toHaveLength(0);
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// 行動ログに死亡が記録
		expect(result.actionLog[0].message).toBe("敵を倒した");
	});

	it("攻撃不成立（敵がいない方向）: AP消費・カード捨て札移動・失敗ログ", () => {
		const state = createTestState({
			enemies: [],
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const result = executeAttack(state, "attack-1", "right");

		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("攻撃不成立（壁方向）: AP消費・カード捨て札移動", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: 10,
				maxHp: 10,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const result = executeAttack(state, "attack-1", "up");

		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("攻撃不成立（マップ外方向）: AP消費・カード捨て札移動", () => {
		const state = createTestState({
			player: {
				position: { x: 0, y: 0 },
				hp: 10,
				maxHp: 10,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const result = executeAttack(state, "attack-1", "up");

		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const originalEnemyHp = state.enemies[0].hp;
		const originalAp = state.player.ap;

		executeAttack(state, "attack-1", "right");

		expect(state.enemies[0].hp).toBe(originalEnemyHp);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeWait", () => {
	it("待機成功: AP消費なし・カード捨て札移動・行動ログ", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "wait-1", type: "wait" }],
				discardPile: [],
			},
		});
		const result = executeWait(state, "wait-1");

		// APが減らない（コスト0）
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.wait);
		expect(result.player.ap).toBe(MAX_AP);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("wait-1");
		// 行動ログに記録
		expect(result.actionLog).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("待機した");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "wait-1", type: "wait" }],
				discardPile: [],
			},
		});
		const originalAp = state.player.ap;

		executeWait(state, "wait-1");

		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.discardPile).toHaveLength(0);
	});
});
