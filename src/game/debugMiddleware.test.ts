import { afterEach, describe, expect, it } from "vitest";
import { ENEMY_ATTACK_DAMAGE, PLAYER_INITIAL_HP } from "../constants";
import {
	createTestEnemy,
	createTestState,
} from "../test-utils/createTestFixtures";
import { resetDebugCheats, toggleDebugCheat } from "./debugCheats";
import {
	applyDamageToPlayerWithDebug,
	executeEnemyTurnWithDebug,
} from "./debugMiddleware";

afterEach(() => {
	resetDebugCheats();
});

describe("applyDamageToPlayerWithDebug", () => {
	it("無敵ONの場合、ダメージを受けない", () => {
		toggleDebugCheat("invincible");
		const state = createTestState();
		const result = applyDamageToPlayerWithDebug(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result).toBe(state);
	});

	it("無敵OFFの場合、通常通りダメージを受ける", () => {
		const state = createTestState();
		const result = applyDamageToPlayerWithDebug(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
	});
});

describe("executeEnemyTurnWithDebug", () => {
	it("敵行動スキップONの場合、敵が行動しない", () => {
		toggleDebugCheat("skipEnemyTurn");
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const { state: result, totalDamage } = executeEnemyTurnWithDebug(state);

		expect(result).toBe(state);
		expect(totalDamage).toBe(0);
	});

	it("敵行動スキップOFFの場合、通常通り敵が行動する", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const { state: result } = executeEnemyTurnWithDebug(state);

		// 敵が移動または攻撃していることを確認（状態が変化している）
		expect(result).not.toBe(state);
	});

	it("無敵ONの場合、敵の攻撃ダメージを受けない", () => {
		// 無敵OFFの場合のダメージを確認して、敵が実際に攻撃していることを保証する
		const enemyWithoutInvincible = createTestEnemy("normal", { x: 4, y: 3 });
		const stateWithoutInvincible = createTestState({
			enemies: [enemyWithoutInvincible],
		});
		const { state: damagedState, totalDamage: damageWithoutInvincible } =
			executeEnemyTurnWithDebug(stateWithoutInvincible);

		expect(damageWithoutInvincible).toBeGreaterThan(0);
		expect(damagedState.player.hp).toBeLessThan(PLAYER_INITIAL_HP);

		// 無敵ONの場合、同じ状況でもダメージを受けないことを確認する
		toggleDebugCheat("invincible");
		const enemyWithInvincible = createTestEnemy("normal", { x: 4, y: 3 });
		const stateWithInvincible = createTestState({
			enemies: [enemyWithInvincible],
		});
		const { state: invincibleState, totalDamage: damageWithInvincible } =
			executeEnemyTurnWithDebug(stateWithInvincible);

		expect(damageWithInvincible).toBe(0);
		expect(invincibleState.player.hp).toBe(PLAYER_INITIAL_HP);
	});
});
