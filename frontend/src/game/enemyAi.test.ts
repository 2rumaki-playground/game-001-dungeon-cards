import { describe, expect, it } from "vitest";
import {
	ENEMY_ATTACK_DAMAGE,
	ENEMY_HP,
	MAP_HEIGHT,
	MAP_WIDTH,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import type { Enemy, GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import {
	executeEnemyTurn,
	isAdjacent,
	manhattanDistance,
	pickMoveDirection,
} from "./enemyAi";

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
		turn: "enemy",
		floor: 1,
		map,
		player: {
			position: { x: 3, y: 3 },
			hp: PLAYER_INITIAL_HP,
			maxHp: PLAYER_INITIAL_HP,
			ap: MAX_AP,
			maxAp: MAX_AP,
		},
		enemies: [],
		deck: {
			drawPile: [],
			hand: [],
			discardPile: [],
		},
		actionLog: [],
		rng: new RNG(12345),
		...overrides,
	};
}

describe("isAdjacent", () => {
	it("上方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 2 })).toBe(true);
	});

	it("下方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 4 })).toBe(true);
	});

	it("左方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 2, y: 3 })).toBe(true);
	});

	it("右方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(true);
	});

	it("斜め方向は隣接していないのでfalseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(false);
	});

	it("同じ位置は隣接していないのでfalseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(false);
	});

	it("2マス以上離れている場合falseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false);
	});
});

describe("manhattanDistance", () => {
	it("同じ位置の距離は0", () => {
		expect(manhattanDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
	});

	it("隣接する位置の距離は1", () => {
		expect(manhattanDistance({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(1);
	});

	it("離れた位置の距離を正しく計算する", () => {
		expect(manhattanDistance({ x: 1, y: 1 }, { x: 5, y: 4 })).toBe(7);
	});
});

describe("pickMoveDirection", () => {
	it("プレイヤーが上にいる場合、上方向を返す", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("up");
	});

	it("プレイヤーが下にいる場合、下方向を返す", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 5 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("down");
	});

	it("プレイヤーが左にいる場合、左方向を返す", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("left");
	});

	it("同距離の方向がある場合、固定順序（上→下→左→右）で選択する", () => {
		// プレイヤーが斜め上左にいる → 上と左が同距離 → 上を選択
		const state = createTestState({
			player: {
				position: { x: 2, y: 2 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("up");
	});

	it("壁方向へは移動できず、別の方向を選択する", () => {
		// 敵が(1,1)にいて、プレイヤーが(1,3)にいる → 下へ移動したい
		// 上方向は壁(1,0)なので無効
		const state = createTestState({
			player: {
				position: { x: 1, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 1, y: 1 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBe("down");
	});

	it("他の敵がいるマスへは移動できない", () => {
		// 敵1が(3,3)、敵2が(3,2)（プレイヤー方向をブロック）
		// プレイヤーが(3,1)にいる → 上(3,2)は敵2がいるのでブロック
		const enemies: Enemy[] = [
			{
				id: "enemy-2",
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
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			enemies,
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		const dir = pickMoveDirection(state, enemy);
		// 上は敵2がいるのでブロック、次善の方向を選択
		expect(dir).not.toBe("up");
	});

	it("階段タイルへは移動できない", () => {
		const map = createTestMap();
		// (3,2)を階段タイルに設定
		map[2][3] = { type: "stairs" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		const dir = pickMoveDirection(state, enemy);
		expect(dir).not.toBe("up");
	});

	it("全方向移動不可の場合nullを返す", () => {
		// 敵(3,3)の周囲を全てブロック
		const enemies: Enemy[] = [
			{
				id: "enemy-2",
				position: { x: 3, y: 2 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-3",
				position: { x: 3, y: 4 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-4",
				position: { x: 2, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-5",
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
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			enemies,
		});
		const enemy: Enemy = {
			id: "enemy-1",
			position: { x: 3, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		expect(pickMoveDirection(state, enemy)).toBeNull();
	});
});

describe("executeEnemyTurn", () => {
	it("隣接する敵がプレイヤーを攻撃する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = executeEnemyTurn(state);

		// プレイヤーにダメージ
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
		// 敵は移動していない
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
	});

	it("隣接していない敵がプレイヤーに近づく", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 5, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = executeEnemyTurn(state);

		// 敵がプレイヤーに近づいた（左に1マス移動）
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		// プレイヤーにダメージなし
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
	});

	it("複数の敵がそれぞれ行動する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-2",
				position: { x: 1, y: 1 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = executeEnemyTurn(state);

		// 敵1は隣接 → 攻撃
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
		// 敵2は離れている → 移動
		const enemy2 = result.enemies.find((e) => e.id === "enemy-2");
		expect(enemy2).toBeDefined();
		// プレイヤー(3,3)に近づいた
		const originalDist = Math.abs(1 - 3) + Math.abs(1 - 3); // 4
		const newDist =
			Math.abs(enemy2!.position.x - 3) + Math.abs(enemy2!.position.y - 3);
		expect(newDist).toBeLessThan(originalDist);
	});

	it("行動順序がRNGでシャッフルされる", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 5, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-2",
				position: { x: 1, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-3",
				position: { x: 5, y: 1 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		// 同じシードなら同じ行動順序
		const state1 = createTestState({ enemies, rng: new RNG(42) });
		const state2 = createTestState({ enemies, rng: new RNG(42) });
		const result1 = executeEnemyTurn(state1);
		const result2 = executeEnemyTurn(state2);

		// 同一シードなら同じ結果
		for (let i = 0; i < result1.enemies.length; i++) {
			expect(result1.enemies[i].position).toEqual(result2.enemies[i].position);
		}
	});

	it("移動不可の敵はその場に留まる", () => {
		// 敵(3,5)の周囲を壁で囲む（行動順序に依存しない）
		const map = createTestMap();
		map[4][3] = { type: "wall" }; // (3,4) 上
		map[5][2] = { type: "wall" }; // (2,5) 左
		map[5][4] = { type: "wall" }; // (4,5) 右
		// 下(3,6)は外周で既に壁
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 3, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			map,
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			enemies,
		});
		const result = executeEnemyTurn(state);

		// 四方が壁で囲まれた敵1(3,5)は移動できずその場に留まる
		const enemy1 = result.enemies.find((e) => e.id === "enemy-1");
		expect(enemy1).toBeDefined();
		expect(enemy1!.position).toEqual({ x: 3, y: 5 });
	});

	it("プレイヤーがいるマスへは移動しない（隣接時は攻撃する）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = executeEnemyTurn(state);

		// 敵はプレイヤーの位置(3,3)に移動していない
		expect(result.enemies[0].position).not.toEqual({ x: 3, y: 3 });
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
		const state = createTestState({ enemies });
		const originalPlayerHp = state.player.hp;
		const originalEnemyPos = { ...state.enemies[0].position };

		executeEnemyTurn(state);

		expect(state.player.hp).toBe(originalPlayerHp);
		expect(state.enemies[0].position).toEqual(originalEnemyPos);
	});
});
