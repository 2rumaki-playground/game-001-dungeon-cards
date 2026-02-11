import { describe, expect, it } from "vitest";
import {
	BOSS_SKILL,
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
import type { Enemy } from "../types";
import { RNG } from "../utils/rng";
import { executeEnemyTurn, pickMoveDirection } from "./enemyAi";
import { createFixedLayoutMap } from "./map";

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
			type: "normal",
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
			type: "normal",
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
			type: "normal",
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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
				ap: MAX_AP,
				maxAp: MAX_AP,
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

	it("敵の攻撃でプレイヤーHP0以下になるとゲームオーバーに遷移する", () => {
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
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const { state: result } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(1 - ENEMY_ATTACK_DAMAGE);
		expect(result.screen).toBe("gameOver");
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

	it("敵の攻撃でプレイヤーHPが残っていればゲームは続行する", () => {
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

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
		expect(result.screen).toBe("game");
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

	it("heavy敵が隣接時にattackDamage分のダメージを与える", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "heavy",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.heavy.hp,
				maxHp: ENEMY_PARAMS.heavy.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.heavy.attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS.heavy.attackDamage);
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
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			enemies,
		});
		const { state: result } = executeEnemyTurn(state);

		// 移動できずその場に留まる
		expect(result.enemies[0].position).toEqual({ x: 3, y: 5 });
	});

	it("scout敵が隣接時に攻撃する（移動しない）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "scout",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.scout.hp,
				maxHp: ENEMY_PARAMS.scout.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.scout.attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS.scout.attackDamage);
		// 移動していない
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("敵が罠タイル上に移動できる", () => {
		const map = createTestMap();
		map[4][3] = { type: "trap" };
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

		// 罠タイルの上に移動できる
		expect(result.enemies[0].position).toEqual({ x: 3, y: 4 });
	});

	it("敵が宝箱タイル上に移動できる", () => {
		const map = createTestMap();
		map[4][3] = { type: "treasure" };
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

	it("敵が休憩所タイル上に移動できる", () => {
		const map = createTestMap();
		map[4][3] = { type: "rest_area" };
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

	it("miniboss敵が隣接時にattackDamage分のダメージを与える", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "miniboss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.miniboss.attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS.miniboss.attackDamage);
	});

	it("miniboss敵がプレイヤーに近づく（moveDistance=1）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "miniboss",
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result } = executeEnemyTurn(state);

		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});

	it("boss敵が隣接時にattackDamage分のダメージを与える", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "boss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
			},
		];
		const state = createTestState({ turn: "enemy", enemies });
		const { state: result, totalDamage } = executeEnemyTurn(state);

		expect(result.player.hp).toBe(
			PLAYER_INITIAL_HP - ENEMY_PARAMS.boss.attackDamage,
		);
		expect(totalDamage).toBe(ENEMY_PARAMS.boss.attackDamage);
	});

	it("boss敵がプレイヤーに近づく（moveDistance=1）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "boss",
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
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

	describe("索敵範囲", () => {
		it("索敵範囲内の敵が追従する", () => {
			// normal senseRange=5, プレイヤー(3,3)、敵(5,3) → 距離2 ≤ 5
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

			// プレイヤーに近づいた
			expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		});

		it("索敵範囲外の敵が追従しない", () => {
			// normal senseRange=5, プレイヤー(1,1)、敵(5,5) → 距離8 > 5
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 5, y: 5 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			const state = createTestState({
				turn: "enemy",
				enemies,
				player: {
					position: { x: 1, y: 1 },
					hp: PLAYER_INITIAL_HP,
					maxHp: PLAYER_INITIAL_HP,
					ap: MAX_AP,
					maxAp: MAX_AP,
				},
			});
			const { state: result } = executeEnemyTurn(state);

			// 索敵範囲外なので移動しない
			expect(result.enemies[0].position).toEqual({ x: 5, y: 5 });
		});

		it("隣接敵は索敵範囲に関係なく攻撃する", () => {
			// heavy senseRange=3だが隣接なら攻撃
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "heavy",
					position: { x: 4, y: 3 },
					hp: ENEMY_PARAMS.heavy.hp,
					maxHp: ENEMY_PARAMS.heavy.hp,
				},
			];
			const state = createTestState({ turn: "enemy", enemies });
			const { state: result, totalDamage } = executeEnemyTurn(state);

			expect(result.player.hp).toBe(
				PLAYER_INITIAL_HP - ENEMY_PARAMS.heavy.attackDamage,
			);
			expect(totalDamage).toBe(ENEMY_PARAMS.heavy.attackDamage);
		});

		it("敵タイプごとに索敵範囲が異なる", () => {
			// プレイヤー(1,1)、敵(5,5) → 距離8
			// scout senseRange=8 → 範囲内 → 移動する
			// normal senseRange=5 → 範囲外 → 移動しない
			const scoutEnemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "scout",
					position: { x: 5, y: 5 },
					hp: ENEMY_PARAMS.scout.hp,
					maxHp: ENEMY_PARAMS.scout.hp,
				},
			];
			const normalEnemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 5, y: 5 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			const playerOverride = {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			};

			const scoutState = createTestState({
				turn: "enemy",
				enemies: scoutEnemies,
				player: playerOverride,
			});
			const normalState = createTestState({
				turn: "enemy",
				enemies: normalEnemies,
				player: playerOverride,
			});

			const { state: scoutResult } = executeEnemyTurn(scoutState);
			const { state: normalResult } = executeEnemyTurn(normalState);

			// scoutは索敵範囲内なので移動する
			expect(scoutResult.enemies[0].position).not.toEqual({ x: 5, y: 5 });
			// normalは索敵範囲外なので移動しない
			expect(normalResult.enemies[0].position).toEqual({ x: 5, y: 5 });
		});

		it("ミニボスの索敵範囲境界で追従/待機が切り替わる", () => {
			// miniboss senseRange=7
			// プレイヤー(1,1)、敵(5,4) → 距離7 → 範囲内 → 移動する
			// プレイヤー(1,1)、敵(5,5) → 距離8 → 範囲外 → 移動しない
			const playerOverride = {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			};

			const inRangeState = createTestState({
				turn: "enemy",
				enemies: [
					{
						id: "enemy-1",
						type: "miniboss",
						position: { x: 5, y: 4 },
						hp: ENEMY_PARAMS.miniboss.hp,
						maxHp: ENEMY_PARAMS.miniboss.hp,
					},
				],
				player: playerOverride,
			});
			const outOfRangeState = createTestState({
				turn: "enemy",
				enemies: [
					{
						id: "enemy-1",
						type: "miniboss",
						position: { x: 5, y: 5 },
						hp: ENEMY_PARAMS.miniboss.hp,
						maxHp: ENEMY_PARAMS.miniboss.hp,
					},
				],
				player: playerOverride,
			});

			const { state: inRangeResult } = executeEnemyTurn(inRangeState);
			const { state: outOfRangeResult } = executeEnemyTurn(outOfRangeState);

			expect(inRangeResult.enemies[0].position).not.toEqual({ x: 5, y: 4 });
			expect(outOfRangeResult.enemies[0].position).toEqual({ x: 5, y: 5 });
		});

		it("ボスの索敵範囲境界で追従/待機が切り替わる", () => {
			// boss senseRange=10
			// 15x15マップを使用して距離10以上を実現
			// プレイヤー(1,1)、敵(8,4) → 距離10 → 範囲内 → 移動する
			// プレイヤー(1,1)、敵(8,5) → 距離11 → 範囲外 → 移動しない
			const largeMap = createFixedLayoutMap(15, 15);
			const playerOverride = {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			};

			const inRangeState = createTestState({
				turn: "enemy",
				map: largeMap,
				enemies: [
					{
						id: "enemy-1",
						type: "boss",
						position: { x: 8, y: 4 },
						hp: ENEMY_PARAMS.boss.hp,
						maxHp: ENEMY_PARAMS.boss.hp,
					},
				],
				player: playerOverride,
			});
			const outOfRangeState = createTestState({
				turn: "enemy",
				map: largeMap,
				enemies: [
					{
						id: "enemy-1",
						type: "boss",
						position: { x: 8, y: 5 },
						hp: ENEMY_PARAMS.boss.hp,
						maxHp: ENEMY_PARAMS.boss.hp,
					},
				],
				player: playerOverride,
			});

			const { state: inRangeResult } = executeEnemyTurn(inRangeState);
			const { state: outOfRangeResult } = executeEnemyTurn(outOfRangeState);

			expect(inRangeResult.enemies[0].position).not.toEqual({ x: 8, y: 4 });
			expect(outOfRangeResult.enemies[0].position).toEqual({ x: 8, y: 5 });
		});
	});

	describe("部屋境界", () => {
		const roomA = { x: 1, y: 1, width: 3, height: 3 };
		const roomB = { x: 8, y: 8, width: 3, height: 3 };

		it("同じ部屋にプレイヤーがいる場合、敵が追従する", () => {
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
				enemies,
				rooms: [roomA],
				player: {
					position: { x: 1, y: 1 },
					hp: PLAYER_INITIAL_HP,
					maxHp: PLAYER_INITIAL_HP,
					ap: MAX_AP,
					maxAp: MAX_AP,
				},
			});
			const { state: result } = executeEnemyTurn(state);

			// 同じ部屋内なので追従
			const enemy = result.enemies.find((e) => e.id === "enemy-1");
			expect(enemy?.position).not.toEqual({ x: 3, y: 3 });
		});

		it("異なる部屋にプレイヤーがいる場合、敵が待機する", () => {
			const map = createTestMap();
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 2, y: 2 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			const state = createTestState({
				turn: "enemy",
				map,
				enemies,
				rooms: [roomA, roomB],
				player: {
					position: { x: 5, y: 5 },
					hp: PLAYER_INITIAL_HP,
					maxHp: PLAYER_INITIAL_HP,
					ap: MAX_AP,
					maxAp: MAX_AP,
				},
			});
			const { state: result } = executeEnemyTurn(state);

			// 異なる部屋（プレイヤーは廊下）なので待機
			const enemy = result.enemies.find((e) => e.id === "enemy-1");
			expect(enemy?.position).toEqual({ x: 2, y: 2 });
		});

		it("廊下の敵は部屋制約なしで索敵範囲ベースで行動する", () => {
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 5, y: 3 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			// 敵(5,3)はどの部屋にも属さない（廊下）
			const state = createTestState({
				turn: "enemy",
				enemies,
				rooms: [roomA, roomB],
			});
			const { state: result } = executeEnemyTurn(state);

			// 廊下なので索敵範囲ベースで追従
			expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		});

		it("部屋内の敵でもプレイヤーが隣接していれば攻撃する", () => {
			// 敵がroomA端(3,2)にいて、プレイヤーが部屋外かつ隣接(4,2)
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 3, y: 2 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			const state = createTestState({
				turn: "enemy",
				enemies,
				rooms: [roomA],
				player: {
					position: { x: 4, y: 2 },
					hp: PLAYER_INITIAL_HP,
					maxHp: PLAYER_INITIAL_HP,
					ap: MAX_AP,
					maxAp: MAX_AP,
				},
			});
			const { state: result, totalDamage } = executeEnemyTurn(state);

			// 隣接なので部屋境界に関係なく攻撃
			expect(totalDamage).toBe(ENEMY_PARAMS.normal.attackDamage);
			expect(result.player.hp).toBe(
				PLAYER_INITIAL_HP - ENEMY_PARAMS.normal.attackDamage,
			);
		});

		it("roomsが空の場合（非BSPマップ）は従来通り動作する", () => {
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "normal",
					position: { x: 5, y: 3 },
					hp: ENEMY_HP,
					maxHp: ENEMY_HP,
				},
			];
			const state = createTestState({
				turn: "enemy",
				enemies,
				rooms: [],
			});
			const { state: result } = executeEnemyTurn(state);

			// rooms空なので全敵が廊下扱い → 従来通り追従
			expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
		});

		it("ボスも部屋制約を受ける", () => {
			const map = createTestMap();
			const enemies: Enemy[] = [
				{
					id: "enemy-1",
					type: "boss",
					position: { x: 2, y: 2 },
					hp: ENEMY_PARAMS.boss.hp,
					maxHp: ENEMY_PARAMS.boss.hp,
				},
			];
			const state = createTestState({
				turn: "enemy",
				map,
				enemies,
				rooms: [roomA, roomB],
				player: {
					position: { x: 5, y: 5 },
					hp: PLAYER_INITIAL_HP,
					maxHp: PLAYER_INITIAL_HP,
					ap: MAX_AP,
					maxAp: MAX_AP,
				},
			});
			const { state: result } = executeEnemyTurn(state);

			// ボスも部屋制約を受け、異なる部屋のプレイヤーは追わない
			const enemy = result.enemies.find((e) => e.id === "enemy-1");
			expect(enemy?.position).toEqual({ x: 2, y: 2 });
		});
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
