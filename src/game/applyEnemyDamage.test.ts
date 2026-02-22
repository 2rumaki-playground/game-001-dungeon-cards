import { describe, expect, it } from "vitest";
import { PLAYER_INITIAL_HP } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import { applyEnemyDamageToPlayer } from "./combat";

describe("applyEnemyDamageToPlayer", () => {
	it("プレイヤーにダメージを適用しlastAttackerEnemyTypeを設定する", () => {
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(state, 3, "heavy");

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - 3);
		expect(result.lastAttackerEnemyType).toBe("heavy");
	});

	it("HPが減少した場合にhitCounterが更新される", () => {
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(state, 3, "normal");

		expect(result.acquisitionCounters.hitCounts.normal).toBe(1);
	});

	it("HPが減少しなかった場合にhitCounterが更新されない", () => {
		// ダメージ0の場合はHPが変わらないためhitCounterは更新されない
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(state, 0, "scout");

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.acquisitionCounters.hitCounts.scout).toBe(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalHp = state.player.hp;
		const originalCounters = state.acquisitionCounters;

		applyEnemyDamageToPlayer(state, 3, "normal");

		expect(state.player.hp).toBe(originalHp);
		expect(state.acquisitionCounters).toBe(originalCounters);
	});

	it("異なる敵タイプで正しくhitCounterが更新される", () => {
		let state = createTestState();
		state = applyEnemyDamageToPlayer(state, 1, "normal");
		state = applyEnemyDamageToPlayer(state, 1, "boss");
		state = applyEnemyDamageToPlayer(state, 1, "normal");

		expect(state.acquisitionCounters.hitCounts.normal).toBe(2);
		expect(state.acquisitionCounters.hitCounts.boss).toBe(1);
		expect(state.acquisitionCounters.hitCounts.scout).toBe(0);
	});
});
