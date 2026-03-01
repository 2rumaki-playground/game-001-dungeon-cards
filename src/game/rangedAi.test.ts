import { describe, expect, it } from "vitest";
import { ENEMY_PARAMS, PLAYER_INITIAL_HP } from "../constants";
import {
	createTestEnemy,
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import {
	executeEnemyTurn,
	getRetreatPosition,
	hasLineOfSight,
} from "./enemyAi";

// テストマップ: 7x7（外周壁、内側5x5床）
// プレイヤーデフォルト位置: (3,3)

describe("hasLineOfSight", () => {
	it("同x座標・壁なし → true", () => {
		const state = createTestState();
		expect(hasLineOfSight(state, { x: 3, y: 1 }, { x: 3, y: 3 })).toBe(true);
	});

	it("同y座標・壁なし → true", () => {
		const state = createTestState();
		expect(hasLineOfSight(state, { x: 1, y: 3 }, { x: 3, y: 3 })).toBe(true);
	});

	it("同x座標・間に壁 → false", () => {
		const map = createTestMap();
		map[2][3] = { type: "wall" };
		const state = createTestState({ map });
		expect(hasLineOfSight(state, { x: 3, y: 1 }, { x: 3, y: 3 })).toBe(false);
	});

	it("同y座標・間に壁 → false", () => {
		const map = createTestMap();
		map[3][2] = { type: "wall" };
		const state = createTestState({ map });
		expect(hasLineOfSight(state, { x: 1, y: 3 }, { x: 3, y: 3 })).toBe(false);
	});

	it("斜め → false", () => {
		const state = createTestState();
		expect(hasLineOfSight(state, { x: 1, y: 1 }, { x: 3, y: 3 })).toBe(false);
	});

	it("隣接（壁なし） → true", () => {
		const state = createTestState();
		expect(hasLineOfSight(state, { x: 3, y: 2 }, { x: 3, y: 3 })).toBe(true);
	});
});

describe("getRetreatPosition", () => {
	it("プレイヤーが左にいる場合、右に後退する", () => {
		// プレイヤー(3,3)、敵(4,3) → 右に後退 → (5,3)
		const enemy = createTestEnemy("ranged", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toEqual({ x: 5, y: 3 });
	});

	it("プレイヤーが右にいる場合、左に後退する", () => {
		// プレイヤー(3,3)、敵(2,3) → 左に後退 → (1,3)
		const enemy = createTestEnemy("ranged", { x: 2, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toEqual({ x: 1, y: 3 });
	});

	it("プレイヤーが上にいる場合、下に後退する", () => {
		// プレイヤー(3,3)、敵(3,4) → 下に後退 → (3,5)
		const enemy = createTestEnemy("ranged", { x: 3, y: 4 });
		const state = createTestState({ enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toEqual({ x: 3, y: 5 });
	});

	it("プレイヤーが下にいる場合、上に後退する", () => {
		// プレイヤー(3,3)、敵(3,2) → 上に後退 → (3,1)
		const enemy = createTestEnemy("ranged", { x: 3, y: 2 });
		const state = createTestState({ enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toEqual({ x: 3, y: 1 });
	});

	it("後退先が壁 → null", () => {
		// プレイヤー(3,3)、敵(2,3) → 左(1,3)に後退しようとするが壁を配置
		const map = createTestMap();
		map[3][1] = { type: "wall" };
		const enemy = createTestEnemy("ranged", { x: 2, y: 3 });
		const state = createTestState({ map, enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toBeNull();
	});

	it("後退先に他の敵がいる → null", () => {
		const enemy = createTestEnemy("ranged", { x: 4, y: 3 });
		const blocker = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy, blocker] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toBeNull();
	});

	it("後退先が階段 → null", () => {
		const map = createTestMap();
		map[3][5] = { type: "stairs" };
		const enemy = createTestEnemy("ranged", { x: 4, y: 3 });
		const state = createTestState({ map, enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toBeNull();
	});

	it("後退先がマップ外 → null", () => {
		// プレイヤー(3,3)、敵(1,3) → 左(0,3)は外周壁
		const enemy = createTestEnemy("ranged", { x: 1, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const pos = getRetreatPosition(state, enemy);
		expect(pos).toBeNull();
	});
});

describe("executeEnemyTurn - 射撃敵行動テーブル", () => {
	const rangedHp = ENEMY_PARAMS.ranged.hp;

	it("非隣接 + 射線内 + 射程内 → 射撃", () => {
		// プレイヤー(3,3)、射撃敵(3,1) → 距離2、同x、壁なし
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 3, y: 1 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(ENEMY_PARAMS.ranged.attackDamage);
		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.ranged.attackDamage,
		);
		// 射撃敵は移動しない
		expect(result.enemies[0].position).toEqual({ x: 3, y: 1 });
	});

	it("非隣接 + 射程外 → 待機（ダメージなし）", () => {
		// プレイヤー(3,3)、射撃敵(3,1) → 距離2だが、射程外テスト用に距離3
		// 射撃敵(1,1) → プレイヤーとの距離=4、斜めなので射線なし → 待機
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 1, y: 1 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(0);
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.enemies[0].position).toEqual({ x: 1, y: 1 });
	});

	it("非隣接 + 同軸だが射程外（距離3） → 待機", () => {
		// プレイヤー(3,3)、射撃敵(3,5) → 距離2なので射程内
		// 距離3にする: プレイヤー(1,3)、敵(4,3) → 距離3
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 4, y: 3 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({
			turn: "enemy",
			enemies,
			player: {
				position: { x: 1, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const { totalDamage } = executeEnemyTurn(state);
		expect(totalDamage).toBe(0);
	});

	it("非隣接 + 壁遮蔽 → 待機", () => {
		const map = createTestMap();
		map[2][3] = { type: "wall" }; // (3,2)に壁
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 3, y: 1 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({ turn: "enemy", map, enemies });
		const { totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(0);
	});

	it("隣接 + 後退可能 → 後退のみ（ダメージなし）", () => {
		// プレイヤー(3,3)、射撃敵(4,3) → 隣接、右(5,3)に後退可能
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 4, y: 3 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(0);
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
		// 後退している
		expect(result.enemies[0].position).toEqual({ x: 5, y: 3 });
	});

	it("隣接 + 後退不可 → その場で射撃", () => {
		// プレイヤー(3,3)、射撃敵(4,3)、(5,3)を壁に → 後退不可
		const map = createTestMap();
		map[3][5] = { type: "wall" };
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 4, y: 3 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({ turn: "enemy", map, enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(ENEMY_PARAMS.ranged.attackDamage);
		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.ranged.attackDamage,
		);
		// 位置は変わらない
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("部屋内 + プレイヤー不在 → 待機", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 3, y: 1 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const rooms = [{ x: 1, y: 1, width: 5, height: 3 }];
		// プレイヤーを部屋の外に配置
		const state = createTestState({
			turn: "enemy",
			enemies,
			rooms,
			player: {
				position: { x: 3, y: 5 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const { totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(0);
	});

	it("索敵範囲外 → 待機", () => {
		// マンハッタン距離(1,1)-(5,5)=8 > senseRange=6 → 待機
		const state = createTestState({
			turn: "enemy",
			enemies: [
				{
					id: "enemy-1",
					type: "ranged",
					position: { x: 5, y: 5 },
					hp: rangedHp,
					maxHp: rangedHp,
				},
			],
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const { totalDamage } = executeEnemyTurn(state);
		expect(totalDamage).toBe(0);
	});

	it("射撃敵はプレイヤーを倒せる", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "ranged",
				position: { x: 3, y: 1 },
				hp: rangedHp,
				maxHp: rangedHp,
			},
		];
		const state = createTestState({
			turn: "enemy",
			enemies,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const { state: result } = executeEnemyTurn(state);
		expect(result.player.hp).toBe(0);
		expect(result.screen).toBe("gameOver");
	});
});
