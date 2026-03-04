import { beforeEach, describe, expect, it } from "vitest";
import { BOSS_SKILL, ENEMY_PARAMS } from "../constants";
import {
	createTestEnemy,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import type { RNG } from "../utils/rng";
import { checkEnrage, tryMinibossSkill } from "./bossSkill";

/** random()が固定値を返すスタブRNG */
function createStubRng(value: number): RNG {
	return { random: () => value } as unknown as RNG;
}

beforeEach(() => resetTestEnemySeq());

describe("checkEnrage", () => {
	it("HP50%以下のボスに激昂を付与する", () => {
		const enemy = createTestEnemy("boss", { x: 3, y: 3 }, { hp: 7, maxHp: 15 });
		const result = checkEnrage(enemy);
		expect(result.enraged).toBe(true);
	});

	it("HP50%超のボスには激昂を付与しない", () => {
		const enemy = createTestEnemy("boss", { x: 3, y: 3 }, { hp: 8, maxHp: 15 });
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});

	it("既に激昂済みのボスは変化しない", () => {
		const enemy = createTestEnemy(
			"boss",
			{ x: 3, y: 3 },
			{ hp: 5, maxHp: 15, enraged: true },
		);
		const result = checkEnrage(enemy);
		expect(result.enraged).toBe(true);
	});

	it("ミニボスには激昂を付与しない", () => {
		const enemy = createTestEnemy(
			"miniboss",
			{ x: 3, y: 3 },
			{ hp: 2, maxHp: 8 },
		);
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});

	it("通常敵には激昂を付与しない", () => {
		const enemy = createTestEnemy(
			"normal",
			{ x: 3, y: 3 },
			{ hp: 1, maxHp: 3 },
		);
		const result = checkEnrage(enemy);
		expect(result.enraged).toBeUndefined();
	});
});

describe("tryMinibossSkill", () => {
	it("確率判定成功かつ隣接時に即ダメージを与える", () => {
		const rng = createStubRng(BOSS_SKILL.powerStrikeChance - 0.001);
		const enemy = createTestEnemy("miniboss", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = tryMinibossSkill(state, enemy, rng);

		const expectedDamage = Math.floor(
			ENEMY_PARAMS.miniboss.attackDamage * BOSS_SKILL.powerStrikeMultiplier,
		);
		expect(result.state.player.hp).toBe(state.player.hp - expectedDamage);
		expect(result.damage).toBe(expectedDamage);
		expect(result.executed).toBe(true);
		expect(result.state.lastAttackerEnemyType).toBe("miniboss");
	});

	it("確率判定不発でダメージなし", () => {
		const rng = createStubRng(BOSS_SKILL.powerStrikeChance);
		const enemy = createTestEnemy("miniboss", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = tryMinibossSkill(state, enemy, rng);

		expect(result.state.player.hp).toBe(state.player.hp);
		expect(result.damage).toBe(0);
		expect(result.executed).toBe(false);
	});

	it("確率判定成功でも非隣接ならダメージなし", () => {
		const rng = createStubRng(BOSS_SKILL.powerStrikeChance - 0.001);
		const enemy = createTestEnemy("miniboss", { x: 5, y: 5 });
		const state = createTestState({ enemies: [enemy] });
		const result = tryMinibossSkill(state, enemy, rng);

		expect(result.state.player.hp).toBe(state.player.hp);
		expect(result.damage).toBe(0);
		expect(result.executed).toBe(false);
	});
});
