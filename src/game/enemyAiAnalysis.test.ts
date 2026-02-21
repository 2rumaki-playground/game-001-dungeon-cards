import { describe, expect, it } from "vitest";
import { ENEMY_PARAMS } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import { analyzeAllEnemies, analyzeEnemy } from "./enemyAiAnalysis";

function createEnemy(overrides: Partial<Enemy> = {}): Enemy {
	return {
		id: "enemy-1",
		type: "normal",
		position: { x: 3, y: 1 },
		hp: ENEMY_PARAMS.normal.hp,
		maxHp: ENEMY_PARAMS.normal.hp,
		...overrides,
	};
}

describe("analyzeEnemy", () => {
	describe("行動判定の分類", () => {
		it("隣接時はattack判定になる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({ position: { x: 3, y: 2 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("attack");
			expect(result.decision.reason).toContain("隣接");
		});

		it("索敵範囲内ではmove判定になる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			// 距離3（senseRange=5以内）
			const enemy = createEnemy({ position: { x: 3, y: 1 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("move");
		});

		it("索敵範囲外ではwait_out_of_range判定になる", () => {
			// MAP_WIDTH=7のテストマップで、プレイヤーとの距離がsenseRange外
			const state = createTestState({
				player: {
					position: { x: 1, y: 1 },
					hp: 10,
					maxHp: 10,
				},
			});
			// senseRange=5, 距離8（壁の中以外の場所で離す）
			const enemy = createEnemy({
				position: { x: 5, y: 5 },
				type: "heavy",
			}); // heavy: senseRange=3
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("wait_out_of_range");
		});

		it("部屋内でプレイヤーが外にいる場合はwait_room判定になる", () => {
			const state = createTestState({
				player: {
					position: { x: 1, y: 1 },
					hp: 10,
					maxHp: 10,
				},
				rooms: [{ x: 3, y: 3, width: 3, height: 3 }],
			});
			const enemy = createEnemy({ position: { x: 4, y: 4 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("wait_room");
		});

		it("スキル予告中はskill_pending判定になる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({
				position: { x: 3, y: 1 },
				type: "miniboss",
				hp: 8,
				maxHp: 8,
				pendingSkill: { type: "power_strike" },
			});
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("skill_pending");
		});

		it("移動不可（moveDistance=0）ではwait_no_move判定になる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			// heavy: moveDistance=0, senseRange=3, 距離2（索敵範囲内だが動けない）
			const enemy = createEnemy({
				position: { x: 3, y: 1 },
				type: "heavy",
				hp: 5,
				maxHp: 5,
			});
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.type).toBe("wait_no_move");
		});
	});

	describe("移動候補タイルの計算", () => {
		it("開けた場所で移動候補が返される", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 5 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({ position: { x: 3, y: 3 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.moveCandidates.length).toBeGreaterThan(0);
		});

		it("isBestChoiceが正しく1つだけtrueになる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 5 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({ position: { x: 3, y: 3 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			const bestChoices = result.moveCandidates.filter((c) => c.isBestChoice);
			expect(bestChoices.length).toBe(1);
		});

		it("他の敵がいるマスは候補に含まれない", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 5 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy1 = createEnemy({
				id: "enemy-1",
				position: { x: 3, y: 3 },
			});
			const enemy2 = createEnemy({
				id: "enemy-2",
				position: { x: 3, y: 4 },
			});
			state.enemies = [enemy1, enemy2];

			const result = analyzeEnemy(state, enemy1);
			const blockedPos = result.moveCandidates.find(
				(c) => c.position.x === 3 && c.position.y === 4,
			);
			expect(blockedPos).toBeUndefined();
		});
	});

	describe("攻撃範囲の計算", () => {
		it("隣接4タイルが返される", () => {
			const state = createTestState();
			const enemy = createEnemy({ position: { x: 3, y: 3 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.attackRange).toHaveLength(4);
			expect(result.attackRange).toContainEqual({ x: 3, y: 2 });
			expect(result.attackRange).toContainEqual({ x: 3, y: 4 });
			expect(result.attackRange).toContainEqual({ x: 2, y: 3 });
			expect(result.attackRange).toContainEqual({ x: 4, y: 3 });
		});

		it("マップ端では範囲外タイルが除外される", () => {
			const state = createTestState();
			// 壁の内側の端（1,1）
			const enemy = createEnemy({ position: { x: 1, y: 1 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			// (1,0)と(0,1)はマップ内だが壁なので含まれるはず（攻撃範囲はマップ内の隣接4方向）
			expect(result.attackRange.length).toBeLessThanOrEqual(4);
			// 全て有効範囲内
			for (const pos of result.attackRange) {
				expect(pos.x).toBeGreaterThanOrEqual(0);
				expect(pos.y).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("行動理由の文言", () => {
		it("攻撃判定の理由に攻撃力が含まれる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({ position: { x: 3, y: 2 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.reason).toContain("ATK:");
		});

		it("移動判定の理由に距離が含まれる", () => {
			const state = createTestState({
				player: {
					position: { x: 3, y: 3 },
					hp: 10,
					maxHp: 10,
				},
			});
			const enemy = createEnemy({ position: { x: 3, y: 1 } });
			state.enemies = [enemy];

			const result = analyzeEnemy(state, enemy);
			expect(result.decision.reason).toMatch(/距離/);
		});
	});
});

describe("analyzeAllEnemies", () => {
	it("全敵の分析結果を返す", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 10,
				maxHp: 10,
			},
		});
		state.enemies = [
			createEnemy({ id: "e1", position: { x: 3, y: 1 } }),
			createEnemy({ id: "e2", position: { x: 5, y: 5 } }),
		];

		const results = analyzeAllEnemies(state);
		expect(results).toHaveLength(2);
		expect(results[0].enemyId).toBe("e1");
		expect(results[1].enemyId).toBe("e2");
	});
});
