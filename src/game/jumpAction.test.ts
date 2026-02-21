import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_HP,
	MAX_AP,
	PLAYER_INITIAL_HP,
	TREASURE_HEAL,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Direction } from "../types";
import { executeJump } from "./action";

describe("executeJump", () => {
	it("ジャンプ成功（2マス先が床）: 位置2マス先・AP消費・カード捨て札移動", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds[0]).toBe("jump-1");
		expect(jumped).toBe(true);
		expect(reachedStairs).toBe(false);
	});

	it.each([
		[
			"着地先が壁",
			() => {
				const map = createTestMap();
				map[3][5] = { type: "wall" as const };
				return { map };
			},
			"right" as Direction,
			{ x: 3, y: 3 },
			{ x: 3, y: 3 },
		],
		[
			"着地先がマップ外",
			() => ({}),
			"up" as Direction,
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
		],
		[
			"着地先に敵",
			() => ({
				enemies: [
					{
						id: "enemy-1",
						type: "normal" as const,
						position: { x: 5, y: 3 },
						hp: ENEMY_HP,
						maxHp: ENEMY_HP,
					},
				],
			}),
			"right" as Direction,
			{ x: 3, y: 3 },
			{ x: 3, y: 3 },
		],
	])("%s: 移動なし・AP消費", (_, createOverrides, direction, startPos, expectedPos) => {
		const state = createTestState({
			player: {
				position: startPos,
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			...createOverrides(),
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", direction);

		expect(result.player.position).toEqual(expectedPos);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(jumped).toBe(false);
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds).toContain("jump-1");
	});

	it.each([
		[
			"敵",
			() => ({
				enemies: [
					{
						id: "enemy-1",
						type: "normal" as const,
						position: { x: 4, y: 3 },
						hp: ENEMY_HP,
						maxHp: ENEMY_HP,
					},
				],
			}),
		],
		[
			"壁",
			() => {
				const map = createTestMap();
				map[3][4] = { type: "wall" as const };
				return { map };
			},
		],
		[
			"階段",
			() => {
				const map = createTestMap();
				map[3][4] = { type: "stairs" as const };
				return { map };
			},
		],
	])("1マス先に%sがあっても飛び越えて2マス先に着地", (_, createOverrides) => {
		const state = createTestState({
			...createOverrides(),
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(result.floor).toBe(1);
		expect(jumped).toBe(true);
		expect(reachedStairs).toBe(false);
	});

	it("着地先が階段: reachedStairsがtrueで階層遷移は行わない", () => {
		const map = createTestMap();
		map[3][5] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(reachedStairs).toBe(true);
		expect(result.floor).toBe(1);
		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(jumped).toBe(true);
	});

	it("1マス先の罠を飛び越え: 罠効果は発動しない", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.jumped).toBe(true);
		expect(result.state.player.position).toEqual({ x: 5, y: 3 });
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.tileEffects).toEqual([]);
	});

	it("着地先の罠→HP0→ゲームオーバー", () => {
		const map = createTestMap();
		map[3][5] = { type: "trap" };
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
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.gameOver).toBe(true);
		expect(result.jumped).toBe(true);
		expect(result.state.player.position).toEqual({ x: 5, y: 3 });
		expect(result.tileEffects).toContainEqual(
			expect.objectContaining({ tile: "trap" }),
		);
	});

	it("着地先の宝箱: 着地先の効果のみ発動", () => {
		const map = createTestMap();
		map[3][5] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP - 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.jumped).toBe(true);
		expect(result.tileEffects).toEqual([
			{ tile: "treasure", position: { x: 5, y: 3 } },
		]);
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP - 5 + TREASURE_HEAL);
	});

	it("1マス先に罠、着地先に宝箱: 罠は無視、宝箱のみ発動", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		map[3][5] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP - 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.tileEffects).toEqual([
			{ tile: "treasure", position: { x: 5, y: 3 } },
		]);
		// HP: 5 + 3(treasure) = 8（罠ダメージなし）
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP - 5 + TREASURE_HEAL);
	});

	it("ジャンプで特殊タイルなし: tileEffectsが空", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.tileEffects).toEqual([]);
		expect(result.gameOver).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeJump(state, "jump-1", "right");

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeJump - visitedTiles", () => {
	it("ジャンプ着地時に着地先が訪問済みに追加される", () => {
		const state = createTestState({
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");
		expect(result.state.visitedTiles.has("5,3")).toBe(true);
	});

	it("ジャンプ失敗時にvisitedTilesは変更されない", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				hand: [{ id: "jump-1", type: "jump", keyword: "flame" }],
				usedCardIds: [],
			},
		});
		// (1,1)からupは(1,-1)=マップ外なので失敗
		const result = executeJump(state, "jump-1", "up");
		expect(result.state.visitedTiles.size).toBe(0);
	});
});
