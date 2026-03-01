import { describe, expect, it } from "vitest";
import { MILESTONE_DEFEAT_COUNT } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { MilestoneType } from "../types";
import { checkMilestone, getTotalDefeatCount } from "./milestone";

describe("getTotalDefeatCount", () => {
	it("全敵タイプの撃破数を合算する", () => {
		const state = createTestState({
			acquisitionCounters: {
				defeatCounts: {
					normal: 3,
					heavy: 2,
					scout: 1,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
		});
		expect(getTotalDefeatCount(state)).toBe(6);
	});

	it("初期状態では0を返す", () => {
		const state = createTestState();
		expect(getTotalDefeatCount(state)).toBe(0);
	});
});

describe("checkMilestone", () => {
	describe("enemy_defeated イベント", () => {
		it("累計撃破数1でfirst_defeatを返す", () => {
			const state = createTestState({
				acquisitionCounters: {
					defeatCounts: {
						normal: 1,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
					hitCounts: {
						normal: 0,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
				},
			});
			expect(checkMilestone(state, "enemy_defeated")).toBe("first_defeat");
		});

		it("first_defeat達成済みで累計10未満ならnullを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>(["first_defeat"]),
				acquisitionCounters: {
					defeatCounts: {
						normal: 5,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
					hitCounts: {
						normal: 0,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
				},
			});
			expect(checkMilestone(state, "enemy_defeated")).toBeNull();
		});

		it("累計撃破数がMILESTONE_DEFEAT_COUNTに到達でten_defeatsを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>(["first_defeat"]),
				acquisitionCounters: {
					defeatCounts: {
						normal: 5,
						heavy: 3,
						scout: 2,
						miniboss: 0,
						boss: 0,
					},
					hitCounts: {
						normal: 0,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
				},
			});
			expect(getTotalDefeatCount(state)).toBe(MILESTONE_DEFEAT_COUNT);
			expect(checkMilestone(state, "enemy_defeated")).toBe("ten_defeats");
		});

		it("first_defeatとten_defeatsの両方が同時に達成可能な場合、first_defeatが優先される", () => {
			// 初撃破がちょうど10体目（first_defeatもten_defeatsも未達成の状態で10に到達）
			const state = createTestState({
				acquisitionCounters: {
					defeatCounts: {
						normal: 10,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
					hitCounts: {
						normal: 0,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
				},
			});
			expect(checkMilestone(state, "enemy_defeated")).toBe("first_defeat");
		});

		it("両方とも達成済みならnullを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>([
					"first_defeat",
					"ten_defeats",
				]),
				acquisitionCounters: {
					defeatCounts: {
						normal: 15,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
					hitCounts: {
						normal: 0,
						heavy: 0,
						scout: 0,
						miniboss: 0,
						boss: 0,
					},
				},
			});
			expect(checkMilestone(state, "enemy_defeated")).toBeNull();
		});

		it("累計撃破数0ではnullを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "enemy_defeated")).toBeNull();
		});
	});

	describe("trap_triggered イベント", () => {
		it("初めての罠でfirst_trapを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "trap_triggered")).toBe("first_trap");
		});

		it("達成済みならnullを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>(["first_trap"]),
			});
			expect(checkMilestone(state, "trap_triggered")).toBeNull();
		});
	});

	describe("game_over イベント", () => {
		it("初めてのゲームオーバーでlast_wordを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "game_over")).toBe("last_word");
		});

		it("達成済みならnullを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>(["last_word"]),
			});
			expect(checkMilestone(state, "game_over")).toBeNull();
		});
	});

	describe("floor_reached イベント", () => {
		it("初めての階層遷移でfirst_floor_clearを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "floor_reached")).toBe("first_floor_clear");
		});

		it("達成済みならnullを返す", () => {
			const state = createTestState({
				achievedMilestones: new Set<MilestoneType>(["first_floor_clear"]),
			});
			expect(checkMilestone(state, "floor_reached")).toBeNull();
		});
	});

	describe("関係ないイベント", () => {
		it("move_successではnullを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "move_success")).toBeNull();
		});

		it("damage_takenではnullを返す", () => {
			const state = createTestState();
			expect(checkMilestone(state, "damage_taken")).toBeNull();
		});
	});
});
