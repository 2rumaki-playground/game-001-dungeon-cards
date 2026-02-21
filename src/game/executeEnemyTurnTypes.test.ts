import { describe, expect, it } from "vitest";
import {
	BOSS_SKILL,
	ENEMY_HP,
	ENEMY_PARAMS,
	PLAYER_INITIAL_HP,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy, EnemyType } from "../types";
import { executeEnemyTurn } from "./enemyAi";

describe("executeEnemyTurn - 敵タイプ別行動", () => {
	it("totalDamageにnormal敵の攻撃ダメージが含まれる", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(ENEMY_PARAMS.normal.attackDamage);
	});

	it.each([
		"heavy",
		"scout",
		"miniboss",
		"boss",
	] as EnemyType[])("%s敵が隣接時にattackDamage分のダメージを与える", (type) => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type,
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS[type].hp,
				maxHp: ENEMY_PARAMS[type].hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS[type].attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS[type].attackDamage);
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("heavy敵は隣接していなくても移動しない", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "heavy",
				position: { x: 5, y: 5 },
				hp: ENEMY_PARAMS.heavy.hp,
				maxHp: ENEMY_PARAMS.heavy.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		// 移動しない
		expect(result.enemies[0].position).toEqual({ x: 5, y: 5 });
		// ダメージなし
		expect(totalDamage).toBe(0);
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
	});

	it("scout敵が2マス移動する", () => {
		// プレイヤー(3,3)、scout(3,5) → 1マス目(3,4)で隣接しないのでもう1マス → (3,4)は隣接なので停止
		// 再考: scout(3,5) → 1マス目で(3,4)に移動 → 隣接判定で停止
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "scout",
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS.scout.hp,
				maxHp: ENEMY_PARAMS.scout.hp,
			},
		];
		// プレイヤー(3,3)、scout(5,3) → 距離2
		// 1マス目: (4,3)に移動 → 隣接 → 2マス目スキップ
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		// 1マス移動後に隣接 → そこで停止
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("scout敵が2マス移動で接近する（隣接しない距離）", () => {
		// プレイヤー(3,3)、scout(3,1) → 距離2
		// 1マス目: (3,2)に移動 → 隣接 → 2マス目スキップ
		// 距離3以上のケースが必要
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "scout",
				position: { x: 1, y: 1 },
				hp: ENEMY_PARAMS.scout.hp,
				maxHp: ENEMY_PARAMS.scout.hp,
			},
		];
		// プレイヤー(3,3)、scout(1,1) → 距離4
		// 1マス目: 上下左右で(1,2)距離3 vs (2,1)距離3 → 下が優先 → (1,2)
		// 隣接しない → 2マス目: (1,2)から(1,3)距離2 vs (2,2)距離2 → 下が優先 → (1,3)
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		// 2マス移動
		expect(result.enemies[0].position).toEqual({ x: 1, y: 3 });
	});

	it("scout敵の1マス目移動失敗で停止する", () => {
		// scoutの周囲を壁で囲む
		const map = createTestMap();
		map[4][3] = { type: "wall" }; // (3,4)
		map[5][2] = { type: "wall" }; // (2,5)
		map[5][4] = { type: "wall" }; // (4,5)
		// 下(3,6)は外周で既に壁
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "scout",
				position: { x: 3, y: 5 },
				hp: ENEMY_PARAMS.scout.hp,
				maxHp: ENEMY_PARAMS.scout.hp,
			},
		];
		const state = createTestState({
			turn: "enemy",
			map,
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
			enemies,
		});
		const { state: result } = executeEnemyTurn(state);

		// 移動できずその場に留まる
		expect(result.enemies[0].position).toEqual({ x: 3, y: 5 });
	});

	it.each([
		"trap",
		"treasure",
		"rest_area",
	] as const)("敵が%sタイル上に移動できる", (tileType) => {
		const map = createTestMap();
		map[4][3] = { type: tileType };
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 3, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ turn: "enemy", map, enemies });
		const { state: result } = executeEnemyTurn(state);

		expect(result.enemies[0].position).toEqual({ x: 3, y: 4 });
	});

	it.each([
		"miniboss",
		"boss",
	] as EnemyType[])("%s敵がプレイヤーに近づく（moveDistance=1）", (type) => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type,
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS[type].hp,
				maxHp: ENEMY_PARAMS[type].hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("異なるタイプの敵が混在した場合のtotalDamageが正しい", () => {
		// normal(隣接) + heavy(隣接) → totalDamage = 1 + 2 = 3
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-2",
				type: "heavy",
				position: { x: 2, y: 3 },
				hp: ENEMY_PARAMS.heavy.hp,
				maxHp: ENEMY_PARAMS.heavy.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { totalDamage } = executeEnemyTurn(state);

		expect(totalDamage).toBe(
			ENEMY_PARAMS.normal.attackDamage + ENEMY_PARAMS.heavy.attackDamage,
		);
	});

	it("ミニボスが予告済みpower_strikeを隣接時に発動する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "miniboss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
				pendingSkill: { type: "power_strike" },
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		const expectedDamage =
			ENEMY_PARAMS.miniboss.attackDamage * BOSS_SKILL.powerStrikeMultiplier;
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - expectedDamage);
		expect(totalDamage).toBe(expectedDamage);
		// pendingSkillがクリアされている
		const enemy = result.enemies.find((e) => e.id === "enemy-1");
		expect(enemy?.pendingSkill).toBeUndefined();
	});

	it("ボスが予告済みarea_attackをマンハッタン距離2以内で発動する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "boss",
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "area_attack" },
			},
		];
		// プレイヤー(3,3)、ボス(5,3) → 距離2
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - BOSS_SKILL.areaAttackDamage,
		);
		expect(totalDamage).toBe(BOSS_SKILL.areaAttackDamage);
	});

	it("ボスがHP50%以下で激昂状態になる", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "boss",
				position: { x: 5, y: 3 },
				hp: 7,
				maxHp: ENEMY_PARAMS.boss.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		const enemy = result.enemies.find((e) => e.id === "enemy-1");
		expect(enemy?.enraged).toBe(true);
	});

	it("激昂状態のボスが攻撃時にボーナスダメージを与える", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "boss",
				position: { x: 4, y: 3 },
				hp: 7,
				maxHp: ENEMY_PARAMS.boss.hp,
				enraged: true,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		const expectedDamage =
			ENEMY_PARAMS.boss.attackDamage + BOSS_SKILL.enrageBonusDamage;
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - expectedDamage);
		expect(totalDamage).toBe(expectedDamage);
	});
});
