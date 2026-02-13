import { describe, expect, it } from "vitest";
import {
	ENEMY_ATTACK_DAMAGE,
	ENEMY_HP,
	ENEMY_PARAMS,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy, Screen } from "../types";
import { RNG } from "../utils/rng";
import { executeEnemyTurn } from "./enemyAi";

describe("executeEnemyTurn", () => {
	it("隣接する敵がプレイヤーを攻撃する", () => {
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
		const { state: result } = executeEnemyTurn(state);

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
				type: "normal",
				position: { x: 5, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		// 敵がプレイヤーに近づいた（左に1マス移動）
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		// プレイヤーにダメージなし
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
	});

	it("複数の敵がそれぞれ行動する", () => {
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
				type: "normal",
				position: { x: 1, y: 1 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		// 敵1は隣接 → 攻撃
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
		// 敵2は離れている → 移動
		const enemy2 = result.enemies.find((e) => e.id === "enemy-2");
		expect(enemy2).toBeDefined();
		if (!enemy2) return;
		// プレイヤー(3,3)に近づいた
		const originalDist = Math.abs(1 - 3) + Math.abs(1 - 3); // 4
		const newDist =
			Math.abs(enemy2.position.x - 3) + Math.abs(enemy2.position.y - 3);
		expect(newDist).toBeLessThan(originalDist);
	});

	it("行動順序がRNGでシャッフルされる", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 5, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-2",
				type: "normal",
				position: { x: 1, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-3",
				type: "normal",
				position: { x: 5, y: 1 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		// 同じシードなら同じ行動順序
		const state1 = createTestState({
			turn: "enemy",
			enemies,
			rng: new RNG(42),
		});
		const state2 = createTestState({
			turn: "enemy",
			enemies,
			rng: new RNG(42),
		});
		const { state: result1 } = executeEnemyTurn(state1);
		const { state: result2 } = executeEnemyTurn(state2);

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
				type: "normal",
				position: { x: 3, y: 5 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			turn: "enemy",
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
		const { state: result } = executeEnemyTurn(state);

		// 四方が壁で囲まれた敵1(3,5)は移動できずその場に留まる
		const enemy1 = result.enemies.find((e) => e.id === "enemy-1");
		expect(enemy1).toBeDefined();
		if (!enemy1) return;
		expect(enemy1.position).toEqual({ x: 3, y: 5 });
	});

	it("プレイヤーがいるマスへは移動しない（隣接時は攻撃する）", () => {
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
		const { state: result } = executeEnemyTurn(state);

		// 敵はプレイヤーの位置(3,3)に移動していない
		expect(result.enemies[0].position).not.toEqual({ x: 3, y: 3 });
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
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
		const originalPlayerHp = state.player.hp;
		const originalEnemyPos = { ...state.enemies[0].position };

		executeEnemyTurn(state);

		expect(state.player.hp).toBe(originalPlayerHp);
		expect(state.enemies[0].position).toEqual(originalEnemyPos);
	});

	it.each([
		["HP0以下でゲームオーバーに遷移", 1, 1 - ENEMY_ATTACK_DAMAGE, "gameOver"],
		[
			"HPが残っていればゲーム続行",
			PLAYER_INITIAL_HP,
			PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE,
			"game",
		],
	] as [
		string,
		number,
		number,
		Screen,
	][])("敵の攻撃: %s", (_, startHp, expectedHp, expectedScreen) => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			turn: "enemy",
			enemies,
			player: {
				position: { x: 3, y: 3 },
				hp: startHp,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const { state: result } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(expectedHp);
		expect(result.screen).toBe(expectedScreen);
	});

	it("プレイヤー死亡後は残りの敵が行動しない", () => {
		// 敵2体が隣接、HP1のプレイヤー → 1体目の攻撃で死亡 → 2体目は行動しない
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
				type: "normal",
				position: { x: 2, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			turn: "enemy",
			enemies,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const { state: result } = executeEnemyTurn(state);

		// ダメージは1回分のみ（追加ダメージなし）
		expect(result.player.hp).toBe(1 - ENEMY_ATTACK_DAMAGE);
		expect(result.screen).toBe("gameOver");
		// 攻撃ログは1回分のみ
		const attackLogs = result.actionLog.filter(
			(log) => log.message === "敵が攻撃した",
		);
		expect(attackLogs).toHaveLength(1);
	});

	it("入力stateのRNGが変更されない", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 5, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const rngBefore = state.rng.random();

		const state2 = createTestState({ turn: "enemy", enemies });
		executeEnemyTurn(state2);
		const rngAfter = state2.rng.random();

		// 同じシードから同じ最初の値が得られる（RNGが進んでいない）
		expect(rngAfter).toBe(rngBefore);
	});

	it("通常敵にはボススキルが適用されない", () => {
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
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.normal.attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS.normal.attackDamage);
	});

	it("壁で直線が塞がれた敵が迂回して接近する", () => {
		const map = createTestMap();
		// (3,2)を壁に設定 → 敵(3,3)からプレイヤー(3,1)への直線をブロック
		map[2][3] = { type: "wall" };
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 3, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			turn: "enemy",
			map,
			enemies,
			player: {
				position: { x: 3, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const { state: result } = executeEnemyTurn(state);
		const enemy = result.enemies.find((e) => e.id === "enemy-1");
		// BFSで迂回: left(2,3)に移動
		expect(enemy?.position).toEqual({ x: 2, y: 3 });
	});
});
