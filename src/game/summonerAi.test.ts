import { beforeEach, describe, expect, it } from "vitest";
import { ENEMY_PARAMS, SUMMONER_COOLDOWN } from "../constants";
import {
	createTestEnemy,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import { executeEnemyTurn, getRetreatPosition } from "./enemyAi";

/**
 * テスト用に敵のみで構成されたターンを実行
 * RNGシャッフルの影響を排除するため、敵1体だけの状態で実行する
 */
function executeSingleEnemyTurn(
	state: ReturnType<typeof createTestState>,
): ReturnType<typeof executeEnemyTurn> {
	return executeEnemyTurn(state);
}

describe("召喚敵AI", () => {
	beforeEach(() => {
		resetTestEnemySeq();
	});

	describe("召喚", () => {
		it("非隣接 + 召喚ターン + 空きマスあり → 通常敵が1体増える", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 5, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			expect(result.state.enemies.length).toBe(2);
		});

		it("非隣接 + 召喚ターン + 空きマスなし → 敵数変化なし", () => {
			// 召喚敵の8近傍すべてを敵で埋める
			const summoner = createTestEnemy(
				"summoner",
				{ x: 3, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const blockers: Enemy[] = [
				createTestEnemy("heavy", { x: 2, y: 2 }),
				createTestEnemy("heavy", { x: 3, y: 2 }),
				createTestEnemy("heavy", { x: 4, y: 2 }),
				createTestEnemy("heavy", { x: 2, y: 3 }),
				createTestEnemy("heavy", { x: 4, y: 3 }),
				createTestEnemy("heavy", { x: 2, y: 4 }),
				createTestEnemy("heavy", { x: 3, y: 4 }),
				createTestEnemy("heavy", { x: 4, y: 4 }),
			];
			const state = createTestState({
				// プレイヤーを離れた位置に配置
				player: { position: { x: 1, y: 1 }, hp: 10, maxHp: 10 },
				enemies: [summoner, ...blockers],
			});

			const result = executeSingleEnemyTurn(state);
			// 元と同数（召喚できない）
			expect(result.state.enemies.length).toBe(state.enemies.length);
		});

		it("召喚された敵はtype: normalである", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 5, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			const summonedEnemy = result.state.enemies.find(
				(e) => e.id !== summoner.id,
			);
			expect(summonedEnemy).toBeDefined();
			expect(summonedEnemy?.type).toBe("normal");
			expect(summonedEnemy?.hp).toBe(ENEMY_PARAMS.normal.hp);
			expect(summonedEnemy?.maxHp).toBe(ENEMY_PARAMS.normal.hp);
		});

		it("召喚された敵のIDが既存と重複しない", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 5, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			const ids = result.state.enemies.map((e) => e.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it("召喚後にcooldownがSUMMONER_COOLDOWNにリセットされる", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 5, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			const updatedSummoner = result.state.enemies.find(
				(e) => e.type === "summoner",
			);
			expect(updatedSummoner?.summonCooldown).toBe(SUMMONER_COOLDOWN);
		});
	});

	describe("待機", () => {
		it("非隣接 + 非召喚ターン → 待機、cooldown減少", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 5, y: 3 },
				{
					summonCooldown: 2,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			const updatedSummoner = result.state.enemies.find(
				(e) => e.type === "summoner",
			);
			expect(updatedSummoner?.summonCooldown).toBe(1);
			expect(result.state.enemies.length).toBe(1);
		});

		it("索敵範囲外 → 待機", () => {
			// senseRange=5 なので距離6以上に配置
			const summoner = createTestEnemy(
				"summoner",
				{ x: 1, y: 1 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				// プレイヤーを遠くに配置（マンハッタン距離 > 5）
				player: { position: { x: 5, y: 5 }, hp: 10, maxHp: 10 },
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			// 召喚されない（待機）
			expect(result.state.enemies.length).toBe(1);
		});

		it("部屋内 + プレイヤー不在 → 待機", () => {
			const summoner = createTestEnemy(
				"summoner",
				{ x: 3, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				player: { position: { x: 5, y: 5 }, hp: 10, maxHp: 10 },
				enemies: [summoner],
				rooms: [{ x: 2, y: 2, width: 3, height: 3 }],
			});

			const result = executeSingleEnemyTurn(state);
			expect(result.state.enemies.length).toBe(1);
		});
	});

	describe("後退", () => {
		it("隣接 + 後退可能 → 後退のみ（攻撃しない）", () => {
			// プレイヤーの隣に配置
			const summoner = createTestEnemy(
				"summoner",
				{ x: 4, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			const state = createTestState({
				enemies: [summoner],
			});

			const result = executeSingleEnemyTurn(state);
			const updatedSummoner = result.state.enemies.find(
				(e) => e.type === "summoner",
			);
			// 後退した（プレイヤーから離れた）
			expect(updatedSummoner?.position.x).toBe(5);
			expect(updatedSummoner?.position.y).toBe(3);
			// プレイヤーのHPが変わらない（攻撃しない）
			expect(result.totalDamage).toBe(0);
		});

		it("隣接 + 後退不可 → 待機（攻撃しない）", () => {
			// プレイヤーの右隣に配置、さらに右が壁
			// テストマップは7x7で外周が壁なので (5,y) が壁境界
			const summoner = createTestEnemy(
				"summoner",
				{ x: 4, y: 3 },
				{
					summonCooldown: 0,
				},
			);
			// 後退先 (5,3) に敵を配置して後退不可にする
			const blocker = createTestEnemy("normal", { x: 5, y: 3 });
			const state = createTestState({
				enemies: [summoner, blocker],
			});

			const result = executeSingleEnemyTurn(state);
			const updatedSummoner = result.state.enemies.find(
				(e) => e.type === "summoner",
			);
			// 位置が変わらない
			expect(updatedSummoner?.position.x).toBe(4);
			expect(updatedSummoner?.position.y).toBe(3);
			// プレイヤーのHPが変わらない
			expect(result.totalDamage).toBe(0);
		});
	});

	describe("getRetreatPosition", () => {
		it("プレイヤーの反対方向に後退位置を返す", () => {
			const summoner = createTestEnemy("summoner", { x: 4, y: 3 });
			const state = createTestState({
				enemies: [summoner],
			});

			const pos = getRetreatPosition(state, summoner);
			expect(pos).toEqual({ x: 5, y: 3 });
		});

		it("後退先が壁の場合はnullを返す", () => {
			// テストマップで外周が壁なので (1,y) の左は壁(0,y)
			const summoner = createTestEnemy("summoner", { x: 1, y: 3 });
			const state = createTestState({
				// プレイヤーを右に配置
				player: { position: { x: 2, y: 3 }, hp: 10, maxHp: 10 },
				enemies: [summoner],
			});

			const pos = getRetreatPosition(state, summoner);
			// (0,3) は壁なのでnull
			expect(pos).toBeNull();
		});
	});
});
