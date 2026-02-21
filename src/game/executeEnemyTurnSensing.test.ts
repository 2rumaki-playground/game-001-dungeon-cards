import { describe, expect, it } from "vitest";
import { ENEMY_HP, ENEMY_PARAMS, PLAYER_INITIAL_HP } from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy, EnemyType } from "../types";
import { executeEnemyTurn } from "./enemyAi";
import { createFixedLayoutMap } from "./map";

describe("executeEnemyTurn - 索敵範囲", () => {
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

	it.each([
		[
			"ミニボス",
			"miniboss" as EnemyType,
			undefined,
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
		],
		[
			"ボス",
			"boss" as EnemyType,
			createFixedLayoutMap(15, 15),
			{ x: 8, y: 4 },
			{ x: 8, y: 5 },
		],
	])("%sの索敵範囲境界で追従/待機が切り替わる", (_, type, map, inRangePos, outOfRangePos) => {
		const hp = ENEMY_PARAMS[type].hp;
		const playerOverride = {
			position: { x: 1, y: 1 },
			hp: PLAYER_INITIAL_HP,
			maxHp: PLAYER_INITIAL_HP,
		};

		const inRangeState = createTestState({
			turn: "enemy",
			...(map ? { map } : {}),
			enemies: [{ id: "enemy-1", type, position: inRangePos, hp, maxHp: hp }],
			player: playerOverride,
		});
		const outOfRangeState = createTestState({
			turn: "enemy",
			...(map ? { map } : {}),
			enemies: [
				{ id: "enemy-1", type, position: outOfRangePos, hp, maxHp: hp },
			],
			player: playerOverride,
		});

		const { state: inRangeResult } = executeEnemyTurn(inRangeState);
		const { state: outOfRangeResult } = executeEnemyTurn(outOfRangeState);

		expect(inRangeResult.enemies[0].position).not.toEqual(inRangePos);
		expect(outOfRangeResult.enemies[0].position).toEqual(outOfRangePos);
	});
});

describe("executeEnemyTurn - 部屋境界", () => {
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
			},
		});
		const { state: result } = executeEnemyTurn(state);

		// ボスも部屋制約を受け、異なる部屋のプレイヤーは追わない
		const enemy = result.enemies.find((e) => e.id === "enemy-1");
		expect(enemy?.position).toEqual({ x: 2, y: 2 });
	});
});
