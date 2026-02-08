import { describe, expect, it } from "vitest";
import { BOSS_SKILL, ENEMY_PARAMS } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import type { RNG } from "../utils/rng";
import {
	checkEnrage,
	decideBossSkill,
	decideMinibossSkill,
	executePendingSkill,
} from "./bossSkill";

/** random()が固定値を返すスタブRNG */
function createStubRng(value: number): RNG {
	return { random: () => value } as unknown as RNG;
}

describe("checkEnrage", () => {
	it("HP50%以下のボスに激昂を付与する", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 3, y: 3 },
			hp: 7,
			maxHp: 15,
		};
		const result = checkEnrage(enemy);
		expect(result.enraged).toBe(true);
	});

	it("HP50%超のボスには激昂を付与しない", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 3, y: 3 },
			hp: 8,
			maxHp: 15,
		};
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});

	it("既に激昂済みのボスは変化しない", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 3, y: 3 },
			hp: 5,
			maxHp: 15,
			enraged: true,
		};
		const result = checkEnrage(enemy);
		expect(result.enraged).toBe(true);
	});

	it("ミニボスには激昂を付与しない", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "miniboss",
			position: { x: 3, y: 3 },
			hp: 2,
			maxHp: 8,
		};
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});

	it("通常敵には激昂を付与しない", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 3, y: 3 },
			hp: 1,
			maxHp: 3,
		};
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});
});

describe("decideMinibossSkill", () => {
	it("確率に基づいてpower_strikeスキルを予告する", () => {
		const rng = createStubRng(BOSS_SKILL.powerStrikeChance - 0.001);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "miniboss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.miniboss.hp,
			maxHp: ENEMY_PARAMS.miniboss.hp,
		};
		const result = decideMinibossSkill(enemy, rng);
		expect(result.pendingSkill).toEqual({ type: "power_strike" });
	});

	it("確率外ではスキルを予告しない", () => {
		const rng = createStubRng(BOSS_SKILL.powerStrikeChance);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "miniboss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.miniboss.hp,
			maxHp: ENEMY_PARAMS.miniboss.hp,
		};
		const result = decideMinibossSkill(enemy, rng);
		expect(result.pendingSkill).toBeUndefined();
	});

	it("既に予告中のスキルがある場合は新しいスキルを予告しない", () => {
		const rng = createStubRng(0);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "miniboss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.miniboss.hp,
			maxHp: ENEMY_PARAMS.miniboss.hp,
			pendingSkill: { type: "power_strike" },
		};
		const result = decideMinibossSkill(enemy, rng);
		expect(result.pendingSkill).toEqual({ type: "power_strike" });
	});
});

describe("decideBossSkill", () => {
	it("確率に基づいてarea_attackスキルを予告する", () => {
		const rng = createStubRng(BOSS_SKILL.areaAttackChance - 0.001);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.boss.hp,
			maxHp: ENEMY_PARAMS.boss.hp,
		};
		const result = decideBossSkill(enemy, rng);
		expect(result.pendingSkill).toEqual({ type: "area_attack" });
	});

	it("確率外ではスキルを予告しない", () => {
		const rng = createStubRng(BOSS_SKILL.areaAttackChance);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.boss.hp,
			maxHp: ENEMY_PARAMS.boss.hp,
		};
		const result = decideBossSkill(enemy, rng);
		expect(result.pendingSkill).toBeUndefined();
	});

	it("既に予告中のスキルがある場合は新しいスキルを予告しない", () => {
		const rng = createStubRng(0);
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.boss.hp,
			maxHp: ENEMY_PARAMS.boss.hp,
			pendingSkill: { type: "area_attack" },
		};
		const result = decideBossSkill(enemy, rng);
		expect(result.pendingSkill).toEqual({ type: "area_attack" });
	});
});

describe("executePendingSkill", () => {
	describe("power_strike", () => {
		it("隣接プレイヤーに2倍ダメージを与える", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "miniboss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
				pendingSkill: { type: "power_strike" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const expectedDamage =
				ENEMY_PARAMS.miniboss.attackDamage * BOSS_SKILL.powerStrikeMultiplier;
			expect(result.state.player.hp).toBe(state.player.hp - expectedDamage);
			expect(result.damage).toBe(expectedDamage);
			expect(result.executed).toBe(true);
		});

		it("隣接していない場合はスキルを発動しない", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "miniboss",
				position: { x: 5, y: 5 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
				pendingSkill: { type: "power_strike" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			expect(result.state.player.hp).toBe(state.player.hp);
			expect(result.damage).toBe(0);
			expect(result.executed).toBe(false);
		});

		it("発動後にpendingSkillがクリアされる", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "miniboss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.miniboss.hp,
				maxHp: ENEMY_PARAMS.miniboss.hp,
				pendingSkill: { type: "power_strike" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const updatedEnemy = result.state.enemies.find((e) => e.id === "enemy-1");
			expect(updatedEnemy?.pendingSkill).toBeUndefined();
		});
	});

	describe("area_attack", () => {
		it("隣接プレイヤーに範囲ダメージを与える", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "boss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "area_attack" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			expect(result.state.player.hp).toBe(
				state.player.hp - BOSS_SKILL.areaAttackDamage,
			);
			expect(result.damage).toBe(BOSS_SKILL.areaAttackDamage);
			expect(result.executed).toBe(true);
		});

		it("マンハッタン距離2以内のプレイヤーにダメージを与える", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "boss",
				position: { x: 5, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "area_attack" },
			};
			// プレイヤー(3,3)、ボス(5,3) → 距離2 → 範囲内
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			expect(result.state.player.hp).toBe(
				state.player.hp - BOSS_SKILL.areaAttackDamage,
			);
			expect(result.executed).toBe(true);
		});

		it("マンハッタン距離3以上のプレイヤーにはダメージを与えない", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "boss",
				position: { x: 1, y: 1 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "area_attack" },
			};
			// プレイヤー(3,3)、ボス(1,1) → 距離4 → 範囲外
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			expect(result.state.player.hp).toBe(state.player.hp);
			expect(result.damage).toBe(0);
			expect(result.executed).toBe(false);
		});

		it("発動後にpendingSkillがクリアされる", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "boss",
				position: { x: 4, y: 3 },
				hp: ENEMY_PARAMS.boss.hp,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "area_attack" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const updatedEnemy = result.state.enemies.find((e) => e.id === "enemy-1");
			expect(updatedEnemy?.pendingSkill).toBeUndefined();
		});
	});

	describe("enemy.typeとスキルの不整合ガード", () => {
		it("通常敵がpower_strikeを持つ場合はpendingSkillクリアで未実行", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: 3,
				maxHp: 3,
				pendingSkill: { type: "power_strike" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const updatedEnemy = result.state.enemies.find((e) => e.id === "enemy-1");
			expect(updatedEnemy?.pendingSkill).toBeUndefined();
			expect(result.executed).toBe(false);
			expect(result.damage).toBe(0);
		});

		it("通常敵がarea_attackを持つ場合はpendingSkillクリアで未実行", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: 3,
				maxHp: 3,
				pendingSkill: { type: "area_attack" },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const updatedEnemy = result.state.enemies.find((e) => e.id === "enemy-1");
			expect(updatedEnemy?.pendingSkill).toBeUndefined();
			expect(result.executed).toBe(false);
			expect(result.damage).toBe(0);
		});
	});

	describe("想定外のスキルタイプ", () => {
		it("未知のスキルタイプはpendingSkillをクリアして未実行扱い", () => {
			const enemy: Enemy = {
				id: "enemy-1",
				type: "boss",
				position: { x: 4, y: 3 },
				hp: 5,
				maxHp: ENEMY_PARAMS.boss.hp,
				pendingSkill: { type: "unknown" as never },
			};
			const state = createTestState({ enemies: [enemy] });
			const result = executePendingSkill(state, enemy);

			const updatedEnemy = result.state.enemies.find((e) => e.id === "enemy-1");
			expect(updatedEnemy?.pendingSkill).toBeUndefined();
			expect(result.executed).toBe(false);
			expect(result.damage).toBe(0);
		});
	});

	it("pendingSkillがない場合は何もしない", () => {
		const enemy: Enemy = {
			id: "enemy-1",
			type: "boss",
			position: { x: 4, y: 3 },
			hp: ENEMY_PARAMS.boss.hp,
			maxHp: ENEMY_PARAMS.boss.hp,
		};
		const state = createTestState({ enemies: [enemy] });
		const result = executePendingSkill(state, enemy);

		expect(result.state).toBe(state);
		expect(result.damage).toBe(0);
		expect(result.executed).toBe(false);
	});
});
