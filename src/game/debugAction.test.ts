import { describe, expect, it } from "vitest";
import { TRAP_DAMAGE } from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import { executeDebugOneshotKill, executeDebugTeleport } from "./debugAction";

describe("executeDebugOneshotKill", () => {
	it("指定した敵を即撃破する", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
		});

		const result = executeDebugOneshotKill(state, "enemy-1");

		expect(result.enemies).toHaveLength(0);
	});

	it("撃破数カウントが増加する", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
			defeatedEnemyCount: 2,
		});

		const result = executeDebugOneshotKill(state, "enemy-1");

		expect(result.defeatedEnemyCount).toBe(3);
	});

	it("APが消費されない", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
		});
		const apBefore = state.player.ap;

		const result = executeDebugOneshotKill(state, "enemy-1");

		expect(result.player.ap).toBe(apBefore);
	});

	it("存在しない敵IDの場合は無操作", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
		});

		const result = executeDebugOneshotKill(state, "nonexistent");

		expect(result.enemies).toHaveLength(1);
		expect(result).toBe(state);
	});

	it("元の状態が変更されない（イミュータブル）", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
		});
		const enemiesBefore = [...state.enemies];

		executeDebugOneshotKill(state, "enemy-1");

		expect(state.enemies).toEqual(enemiesBefore);
	});

	it("手札が消費されない", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				discardPile: [],
			},
		});

		const result = executeDebugOneshotKill(state, "enemy-1");

		expect(result.deck.hand).toHaveLength(2);
	});
});

describe("executeDebugTeleport", () => {
	it("指定位置にテレポートする", () => {
		const state = createTestState();

		const { state: result } = executeDebugTeleport(state, { x: 5, y: 5 });

		expect(result.player.position).toEqual({ x: 5, y: 5 });
	});

	it("APが消費されない", () => {
		const state = createTestState();
		const apBefore = state.player.ap;

		const { state: result } = executeDebugTeleport(state, { x: 5, y: 5 });

		expect(result.player.ap).toBe(apBefore);
	});

	it("手札が消費されない", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				discardPile: [],
			},
		});

		const { state: result } = executeDebugTeleport(state, { x: 5, y: 5 });

		expect(result.deck.hand).toHaveLength(2);
	});

	it("罠タイルでダメージを受ける", () => {
		const map = createTestMap();
		map[5][5] = { type: "trap" };
		const state = createTestState({ map });
		const hpBefore = state.player.hp;

		const { state: result } = executeDebugTeleport(state, {
			x: 5,
			y: 5,
		});

		expect(result.player.hp).toBe(hpBefore - TRAP_DAMAGE);
		expect(result.map[5][5].type).toBe("floor");
	});

	it("階段タイルでreachedStairsがtrueになる", () => {
		const map = createTestMap();
		map[5][5] = { type: "stairs" };
		const state = createTestState({ map });

		const { reachedStairs } = executeDebugTeleport(state, { x: 5, y: 5 });

		expect(reachedStairs).toBe(true);
	});

	it("元の状態が変更されない（イミュータブル）", () => {
		const state = createTestState();
		const positionBefore = { ...state.player.position };

		executeDebugTeleport(state, { x: 5, y: 5 });

		expect(state.player.position).toEqual(positionBefore);
	});

	it("範囲外座標へのテレポートは拒否される", () => {
		const state = createTestState();

		const {
			state: result,
			reachedStairs,
			gameOver,
		} = executeDebugTeleport(state, { x: -1, y: 3 });

		expect(result.player.position).toEqual(state.player.position);
		expect(reachedStairs).toBe(false);
		expect(gameOver).toBe(false);
	});

	it("壁タイルへのテレポートは拒否される", () => {
		const state = createTestState();

		const {
			state: result,
			reachedStairs,
			gameOver,
		} = executeDebugTeleport(state, { x: 0, y: 0 });

		expect(result.player.position).toEqual(state.player.position);
		expect(reachedStairs).toBe(false);
		expect(gameOver).toBe(false);
	});

	it("敵がいる位置へのテレポートは拒否される", () => {
		const state = createTestState({
			enemies: [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 4, y: 3 },
					hp: 3,
					maxHp: 3,
				},
			],
		});

		const {
			state: result,
			reachedStairs,
			gameOver,
		} = executeDebugTeleport(state, { x: 4, y: 3 });

		expect(result.player.position).toEqual(state.player.position);
		expect(reachedStairs).toBe(false);
		expect(gameOver).toBe(false);
	});
});
