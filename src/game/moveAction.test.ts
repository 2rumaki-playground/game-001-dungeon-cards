import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	MAX_AP,
	PLAYER_INITIAL_HP,
	TRAP_DAMAGE,
	TREASURE_HEAL,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import { consumeApAndPlayCard, executeMove } from "./action";

describe("consumeApAndPlayCard", () => {
	it("APが指定コスト分減少する", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const result = consumeApAndPlayCard(state, "move-1", CARD_COST.move);

		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
	});

	it("カードが手札から捨て札に移動する", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack", keyword: "flame" }],
				discardPile: [],
			},
		});
		const result = consumeApAndPlayCard(state, "attack-1", CARD_COST.attack);

		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("attack-1");
	});

	it("コスト0の場合APが変化しない", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "wait-1", type: "wait", keyword: "flame" }],
				discardPile: [],
			},
		});
		const result = consumeApAndPlayCard(state, "wait-1", CARD_COST.wait);

		expect(result.player.ap).toBe(MAX_AP);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const originalAp = state.player.ap;

		consumeApAndPlayCard(state, "move-1", CARD_COST.move);

		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.discardPile).toHaveLength(0);
	});
});

describe("executeMove", () => {
	it("床タイルへの移動成功: 位置更新・AP消費・カード捨て札移動・行動ログ", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { state: result, reachedStairs } = executeMove(
			state,
			"move-1",
			"right",
		);

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
		// 階段ではない
		expect(reachedStairs).toBe(false);
	});

	it("壁タイルへの移動失敗: 位置変更なし・AP消費・カード捨て札移動・失敗ログ", () => {
		// プレイヤーを壁の隣に配置（1,1から上は壁）
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "up");

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
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 3,
				maxHp: 3,
				type: "normal",
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "right");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 3, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
	});

	it("階段タイルへの移動成功: reachedStairsがtrueで階層遷移は行わない", () => {
		const map = createTestMap();
		// (4,3)を階段タイルに設定
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { state: result, reachedStairs } = executeMove(
			state,
			"move-1",
			"right",
		);

		// 階段到達フラグ
		expect(reachedStairs).toBe(true);
		// 階層遷移は行わない（floorは変わらない）
		expect(result.floor).toBe(1);
		// プレイヤーは階段マスに移動している
		expect(result.player.position).toEqual({ x: 4, y: 3 });
	});

	it("罠タイルへの移動: ダメージを受けてtileEffectがtrap", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			tileEffect,
			gameOver,
		} = executeMove(state, "move-1", "right");

		expect(result.player.position).toEqual({ x: 4, y: 3 });
		expect(tileEffect).toBe("trap");
		expect(gameOver).toBe(false);
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - TRAP_DAMAGE);
		expect(result.map[3][4].type).toBe("floor");
	});

	it("宝箱タイルへの移動: HP回復してtileEffectがtreasure", () => {
		const map = createTestMap();
		map[3][4] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { state: result, tileEffect } = executeMove(state, "move-1", "right");

		expect(tileEffect).toBe("treasure");
		expect(result.player.hp).toBe(5 + TREASURE_HEAL);
	});

	it("罠タイルでHP0: gameOverがtrue", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { gameOver } = executeMove(state, "move-1", "right");

		expect(gameOver).toBe(true);
	});

	it("床タイルへの移動: tileEffectがnull", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const { tileEffect, gameOver } = executeMove(state, "move-1", "right");

		expect(tileEffect).toBeNull();
		expect(gameOver).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeMove(state, "move-1", "right"); // MoveResultを返すが、破棄

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeMove - visitedTiles", () => {
	it("移動成功時に移動先が訪問済みに追加される", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		const result = executeMove(state, "move-1", "right");
		expect(result.state.visitedTiles.has("4,3")).toBe(true);
	});

	it("移動失敗時にvisitedTilesは変更されない", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		// (1,1)からupは(1,0)=壁なので失敗
		const result = executeMove(state, "move-1", "up");
		expect(result.state.visitedTiles.size).toBe(0);
	});

	it("部屋に入った場合、部屋全体が訪問済みになる", () => {
		const room = { x: 4, y: 2, width: 2, height: 2 };
		const state = createTestState({
			rooms: [room],
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "move-1", type: "move", keyword: "flame" }],
				discardPile: [],
			},
		});
		// (3,3)から右に移動→(4,3)は部屋内
		const result = executeMove(state, "move-1", "right");
		expect(result.state.visitedTiles.has("4,2")).toBe(true);
		expect(result.state.visitedTiles.has("5,2")).toBe(true);
		expect(result.state.visitedTiles.has("4,3")).toBe(true);
		expect(result.state.visitedTiles.has("5,3")).toBe(true);
	});
});
