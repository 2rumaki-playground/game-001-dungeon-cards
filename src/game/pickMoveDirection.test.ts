import { describe, expect, it } from "vitest";
import { ENEMY_HP, PLAYER_INITIAL_HP } from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import { pickMoveDirection } from "./enemyAi";

describe("pickMoveDirection", () => {
	it.each([
		["上", { x: 3, y: 1 }, "up"],
		["下", { x: 3, y: 5 }, "down"],
		["左", { x: 1, y: 3 }, "left"],
	] as [
		string,
		{ x: number; y: number },
		string,
	][])("プレイヤーが%sにいる場合、対応する方向を返す", (_, playerPos, expected) => {
		const state = createTestState({
			player: {
				position: playerPos,
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe(expected);
	});

	it("同距離の方向がある場合、固定順序（上→下→左→右）で選択する", () => {
		// プレイヤーが斜め上左にいる → 上と左が同距離 → 上を選択
		const state = createTestState({
			player: {
				position: { x: 2, y: 2 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("up");
	});

	it("壁に隣接していても最善方向が床なら移動できる", () => {
		// 敵(1,1)、プレイヤー(1,3) → 最善方向は下(1,2)で距離1、移動可能
		// 上(1,0)は壁だが距離3なので最善方向にならない
		const state = createTestState({
			player: {
				position: { x: 1, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 1, y: 1 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("down");
	});

	it("最善方向に他の敵がいる場合、移動失敗でnullを返す", () => {
		// 敵1が(3,3)、敵2が(3,2)（プレイヤー方向をブロック）
		// プレイヤーが(3,1)にいる → 最善方向は上(3,2)だが敵2がいる → 留まる
		const enemies: Enemy[] = [
			{
				id: "enemy-2",
				type: "normal",
				position: { x: 3, y: 2 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
			enemies,
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		// BFS経路の最初の一歩に他の敵がいる → canEnemyMoveToで拒否
		expect(pickMoveDirection(state, enemy)).toBeNull();
	});

	it("最善方向が階段タイルの場合、迂回して移動する", () => {
		const map = createTestMap();
		// (3,2)を階段タイルに設定
		map[2][3] = { type: "stairs" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		// 最善方向は上(3,2)だが階段 → BFSが迂回路を見つけてleftを返す
		expect(pickMoveDirection(state, enemy)).toBe("left");
	});

	it("全方向移動不可の場合nullを返す", () => {
		// 敵(3,3)の周囲を全てブロック
		const enemies: Enemy[] = [
			{
				id: "enemy-2",
				type: "normal",
				position: { x: 3, y: 2 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-3",
				type: "normal",
				position: { x: 3, y: 4 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-4",
				type: "normal",
				position: { x: 2, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-5",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
			enemies,
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBeNull();
	});

	it("壁で直線が塞がれた場合、迂回して移動する", () => {
		const map = createTestMap();
		// (3,2)を壁に設定 → 敵(3,3)から上への直線をブロック
		map[2][3] = { type: "wall" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		// BFSが壁を迂回してleft(2,3)→(2,2)→(2,1)→(3,1)の経路を見つける
		expect(pickMoveDirection(state, enemy)).toBe("left");
	});

	it("到達不可能な場合nullを返す", () => {
		const map = createTestMap();
		// 敵(3,3)を壁で完全に囲む
		map[2][3] = { type: "wall" };
		map[4][3] = { type: "wall" };
		map[3][2] = { type: "wall" };
		map[3][4] = { type: "wall" };
		const state = createTestState({
			map,
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBeNull();
	});
});
