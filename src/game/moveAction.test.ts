import { describe, expect, it } from "vitest";
import { PLAYER_INITIAL_HP, TRAP_DAMAGE, TREASURE_HEAL } from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import { executeMove, markCardAsPlayed } from "./action";

describe("markCardAsPlayed", () => {
	it("カードが使用済みに記録される", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const result = markCardAsPlayed(state, "move-1");

		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds).toContain("move-1");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});

		markCardAsPlayed(state, "move-1");

		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.usedCardIds).toHaveLength(0);
	});
});

describe("executeMove", () => {
	it("床タイルへの移動成功: 位置更新・カード使用済み記録・行動ログ", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const { state: result, reachedStairs } = executeMove(
			state,
			"move-1",
			"right",
		);

		// 位置が更新される
		expect(result.player.position).toEqual({ x: 4, y: 3 });
		// カードが使用済みに記録
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds).toContain("move-1");
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
		// 階段ではない
		expect(reachedStairs).toBe(false);
	});

	it("壁タイルへの移動失敗: 位置変更なし・カード使用済み記録・失敗ログ", () => {
		// プレイヤーを壁の隣に配置（1,1から上は壁）
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "up");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 1, y: 1 });
		// カードが使用済みに記録
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		// 行動ログに失敗が記録
		expect(result.actionLog.length).toBeGreaterThan(0);
	});

	it("敵がいるマスへの移動失敗: 位置変更なし・カード使用済み", () => {
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
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "right");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 3, y: 3 });
		// カードが使用済みに記録
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
	});

	it("階段タイルへの移動成功: reachedStairsがtrueで階層遷移は行わない", () => {
		const map = createTestMap();
		// (4,3)を階段タイルに設定
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
			},
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
			},
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const { gameOver } = executeMove(state, "move-1", "right");

		expect(gameOver).toBe(true);
	});

	it("床タイルへの移動: tileEffectがnull", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const { tileEffect, gameOver } = executeMove(state, "move-1", "right");

		expect(tileEffect).toBeNull();
		expect(gameOver).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			},
		});
		const originalPosition = { ...state.player.position };

		executeMove(state, "move-1", "right"); // MoveResultを返すが、破棄

		expect(state.player.position).toEqual(originalPosition);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeMove - visitedTiles", () => {
	it("移動成功時に移動先が訪問済みに追加される", () => {
		const state = createTestState({
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
			},
			deck: {
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
				hand: [
					{
						id: "move-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
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
