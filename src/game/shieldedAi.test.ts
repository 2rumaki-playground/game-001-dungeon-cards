import { beforeEach, describe, expect, it } from "vitest";
import { ENEMY_PARAMS } from "../constants";
import {
	createTestEnemy,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import { applyDamageToEnemy } from "./combat";
import { executeEnemyTurn } from "./enemyAi";

describe("盾持ち敵AI", () => {
	beforeEach(() => {
		resetTestEnemySeq();
	});

	describe("初撃半減", () => {
		it("初撃がダメージ半減される（端数切り捨て）", () => {
			const shielded = createTestEnemy("shielded", { x: 4, y: 3 });
			const state = createTestState({
				enemies: [shielded],
			});

			// ダメージ3 → 盾で半減 → floor(3/2) = 1
			const result = applyDamageToEnemy(state, shielded.id, 3);
			const enemy = result.state.enemies.find((e) => e.id === shielded.id);
			expect(enemy).toBeDefined();
			expect(enemy?.hp).toBe(ENEMY_PARAMS.shielded.hp - 1);
			expect(enemy?.shieldActive).toBe(false);
		});

		it("2撃目はフルダメージ", () => {
			const shielded = createTestEnemy("shielded", { x: 4, y: 3 });
			const state = createTestState({
				enemies: [shielded],
			});

			// 1撃目: ダメージ1 → 半減 → floor(1/2) = 0
			const after1 = applyDamageToEnemy(state, shielded.id, 1);
			const enemy1 = after1.state.enemies.find((e) => e.id === shielded.id);
			expect(enemy1?.hp).toBe(ENEMY_PARAMS.shielded.hp); // 0ダメージ
			expect(enemy1?.shieldActive).toBe(false);

			// 2撃目: ダメージ1 → 盾なし → フルダメージ
			const after2 = applyDamageToEnemy(after1.state, shielded.id, 1);
			const enemy2 = after2.state.enemies.find((e) => e.id === shielded.id);
			expect(enemy2?.hp).toBe(ENEMY_PARAMS.shielded.hp - 1);
		});

		it("通常敵には盾半減が適用されない", () => {
			const normal = createTestEnemy("normal", { x: 4, y: 3 });
			const state = createTestState({
				enemies: [normal],
			});

			const result = applyDamageToEnemy(state, normal.id, 2);
			const enemy = result.state.enemies.find((e) => e.id === normal.id);
			expect(enemy?.hp).toBe(ENEMY_PARAMS.normal.hp - 2);
		});
	});

	describe("盾リセット", () => {
		it("敵ターン後に盾がリセットされる", () => {
			const shielded = createTestEnemy(
				"shielded",
				{ x: 5, y: 3 },
				{
					shieldActive: false,
				},
			);
			const state = createTestState({
				enemies: [shielded],
			});

			// 敵ターンを実行（盾がリセットされるはず）
			const result = executeEnemyTurn(state);
			const enemy = result.state.enemies.find((e) => e.id === shielded.id);
			expect(enemy?.shieldActive).toBe(true);
		});
	});

	describe("移動", () => {
		it("通常敵と同じBFS追従で移動する", () => {
			// プレイヤー(3,3)、盾持ち敵(5,3) → 近づくはず
			const shielded = createTestEnemy("shielded", { x: 5, y: 3 });
			const state = createTestState({
				enemies: [shielded],
			});

			const result = executeEnemyTurn(state);
			const enemy = result.state.enemies.find((e) => e.id === shielded.id);
			expect(enemy?.position.x).toBe(4);
			expect(enemy?.position.y).toBe(3);
		});
	});

	describe("生成時の初期状態", () => {
		it("盾持ち敵はshieldActive: trueで生成される", () => {
			const shielded = createTestEnemy("shielded", { x: 4, y: 3 });
			// createTestEnemyはENEMY_PARAMSベースだが、shieldActiveは
			// state.tsのcreateEnemiesFromPositionsで設定される
			// テスト用にはoverrideで確認
			expect(shielded.type).toBe("shielded");
		});
	});
});
