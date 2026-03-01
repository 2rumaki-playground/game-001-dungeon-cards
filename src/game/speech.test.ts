import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
	DEEP_FLOOR_THRESHOLD,
	DEFAULT_PERSONALITY,
	HP_CRITICAL_RATIO,
	PERSONALITIES,
	PLAYER_INITIAL_HP,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { MilestoneType, Personality, SpeechEventType } from "../types";
import { CONTEXTUAL_SPEECH_VARIANTS } from "./contextualSpeechData";
import { MILESTONE_SPEECH_VARIANTS } from "./milestoneSpeechData";
import { addSpeechLog, matchesContext } from "./speech";
import {
	RARE_SPEECH_VARIANTS,
	SPEECH_SEQUENCE_VARIANTS,
	SPEECH_VARIANTS,
} from "./speechData";

/** デフォルト発話とレア発話の両方を結合した配列を返す */
function allDefaultVariants(
	personality: Personality,
	eventType: SpeechEventType,
): readonly string[] {
	return [
		...SPEECH_VARIANTS[personality][eventType],
		...(RARE_SPEECH_VARIANTS[personality][eventType] ?? []),
	];
}

describe("addSpeechLog", () => {
	it("発話ログがstateに設定される", () => {
		const state = createTestState();
		expect(state.speechLog).toBeNull();

		const next = addSpeechLog(state, "move_success");
		expect(next.speechLog).not.toBeNull();
		expect(next.speechLog?.eventType).toBe("move_success");
		expect(next.speechLog?.timestamp).toBeGreaterThan(0);
	});

	it("発話メッセージがバリエーション内のいずれかである", () => {
		const state = createTestState();
		const next = addSpeechLog(state, "enemy_defeated");
		const variants = allDefaultVariants(DEFAULT_PERSONALITY, "enemy_defeated");
		expect(variants).toContain(next.speechLog?.message);
	});

	it("元のstateを変更しない（イミュータブル）", () => {
		const state = createTestState();
		const next = addSpeechLog(state, "damage_taken");
		expect(state.speechLog).toBeNull();
		expect(next.speechLog).not.toBeNull();
	});

	it("連続呼び出しで最新の発話に上書きされる", () => {
		const state = createTestState();
		const s1 = addSpeechLog(state, "move_success");
		const s2 = addSpeechLog(s1, "enemy_defeated");
		expect(s2.speechLog?.eventType).toBe("enemy_defeated");
	});

	it.each(
		PERSONALITIES,
	)("性格 %s の発話が該当バリエーションから選択される", (personality: Personality) => {
		// HP満タン（PLAYER_INITIAL_HP）でhp_tensionを回避（PLAYER_INITIAL_HP >= maxHp * HP_TENSION_RATIO）、deep_floor/consecutive_comboも非該当の状態
		const state = createTestState({
			personality,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "move_success");
		const variants = allDefaultVariants(personality, "move_success");
		expect(variants).toContain(next.speechLog?.message);
	});

	it("連続パターン一致時にSPEECH_SEQUENCE_VARIANTSから選択される", () => {
		const state = createTestState();
		const s1 = addSpeechLog(state, "damage_taken");
		const s2 = addSpeechLog(s1, "enemy_defeated");
		const seqVariants =
			SPEECH_SEQUENCE_VARIANTS[DEFAULT_PERSONALITY].damage_taken_enemy_defeated;
		expect(seqVariants).toContain(s2.speechLog?.message);
	});

	it("連続パターン未定義時にデフォルト発話にフォールバックする", () => {
		const state = createTestState();
		const s1 = addSpeechLog(state, "move_success");
		// move_success → move_success は連続パターン未定義
		const s2 = addSpeechLog(s1, "move_success");
		const variants = allDefaultVariants(DEFAULT_PERSONALITY, "move_success");
		expect(variants).toContain(s2.speechLog?.message);
	});

	it("speechLogがnull（初回）の場合はデフォルト発話が選択される", () => {
		const state = createTestState();
		expect(state.speechLog).toBeNull();
		const next = addSpeechLog(state, "enemy_defeated");
		const variants = allDefaultVariants(DEFAULT_PERSONALITY, "enemy_defeated");
		expect(variants).toContain(next.speechLog?.message);
	});

	it("連続発話でもeventTypeは現在イベントが記録される", () => {
		const state = createTestState();
		const s1 = addSpeechLog(state, "damage_taken");
		const s2 = addSpeechLog(s1, "enemy_defeated");
		expect(s2.speechLog?.eventType).toBe("enemy_defeated");
	});

	it.each(
		PERSONALITIES,
	)("性格 %s で連続発話が動作する", (personality: Personality) => {
		const state = createTestState({ personality });
		const s1 = addSpeechLog(state, "damage_taken");
		const s2 = addSpeechLog(s1, "enemy_defeated");
		const seqVariants =
			SPEECH_SEQUENCE_VARIANTS[personality].damage_taken_enemy_defeated;
		expect(seqVariants).toContain(s2.speechLog?.message);
	});
});

describe("matchesContext", () => {
	it("hp_critical: hp <= maxHp * 0.25 で true", () => {
		const criticalHp = Math.floor(PLAYER_INITIAL_HP * HP_CRITICAL_RATIO);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: criticalHp,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		expect(matchesContext(state, "hp_critical")).toBe(true);
	});

	it("hp_critical: hp=0 では false（死亡状態）", () => {
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 0, maxHp: PLAYER_INITIAL_HP },
		});
		expect(matchesContext(state, "hp_critical")).toBe(false);
	});

	it("hp_critical: hp > maxHp * 0.25 で false", () => {
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 5, maxHp: PLAYER_INITIAL_HP },
		});
		expect(matchesContext(state, "hp_critical")).toBe(false);
	});

	it("hp_tension: hp < maxHp * 0.75 で true", () => {
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 5, maxHp: PLAYER_INITIAL_HP },
		});
		expect(matchesContext(state, "hp_tension")).toBe(true);
	});

	it("hp_tension: hp >= maxHp * 0.75 で false", () => {
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 8, maxHp: PLAYER_INITIAL_HP },
		});
		expect(matchesContext(state, "hp_tension")).toBe(false);
	});

	it("hp_tension: hp_critical の範囲でも true（hp_tensionはhp_criticalを包含）", () => {
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 1, maxHp: PLAYER_INITIAL_HP },
		});
		expect(matchesContext(state, "hp_tension")).toBe(true);
	});

	it("deep_floor: floor >= DEEP_FLOOR_THRESHOLD で true", () => {
		const state = createTestState({ floor: DEEP_FLOOR_THRESHOLD });
		expect(matchesContext(state, "deep_floor")).toBe(true);
	});

	it("deep_floor: floor < DEEP_FLOOR_THRESHOLD で false", () => {
		const state = createTestState({ floor: DEEP_FLOOR_THRESHOLD - 1 });
		expect(matchesContext(state, "deep_floor")).toBe(false);
	});

	it("consecutive_combo: 直前の発話が combo_activated で true", () => {
		const state = createTestState({
			speechLog: {
				eventType: "combo_activated",
				message: "test",
				timestamp: Date.now(),
			},
		});
		expect(matchesContext(state, "consecutive_combo")).toBe(true);
	});

	it("consecutive_combo: 直前の発話が他のイベントで false", () => {
		const state = createTestState({
			speechLog: {
				eventType: "move_success",
				message: "test",
				timestamp: Date.now(),
			},
		});
		expect(matchesContext(state, "consecutive_combo")).toBe(false);
	});
});

describe("コンテキスト発話の優先選択", () => {
	it("hp_critical状態でコンテキスト発話が選択される", () => {
		const criticalHp = Math.floor(PLAYER_INITIAL_HP * HP_CRITICAL_RATIO);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: criticalHp,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "damage_taken");

		const contextualEntries =
			CONTEXTUAL_SPEECH_VARIANTS[DEFAULT_PERSONALITY].damage_taken;
		const criticalEntry = contextualEntries?.find(
			(e) => e.context === "hp_critical",
		);
		expect(criticalEntry).toBeDefined();
		expect(criticalEntry?.variants).toContain(next.speechLog?.message);
	});

	it("hp_tension状態でhp_criticalより低優先のhp_tension発話が選択される", () => {
		// hp=5: hp_tension該当（5 < 7.5）、hp_critical非該当（5 > 2.5）
		const state = createTestState({
			player: { position: { x: 3, y: 3 }, hp: 5, maxHp: PLAYER_INITIAL_HP },
		});
		const next = addSpeechLog(state, "damage_taken");

		const contextualEntries =
			CONTEXTUAL_SPEECH_VARIANTS[DEFAULT_PERSONALITY].damage_taken;
		const tensionEntry = contextualEntries?.find(
			(e) => e.context === "hp_tension",
		);
		expect(tensionEntry).toBeDefined();
		expect(tensionEntry?.variants).toContain(next.speechLog?.message);
	});

	it("deep_floor条件でdeep_floor発話が選択される（HP正常時）", () => {
		const state = createTestState({
			floor: DEEP_FLOOR_THRESHOLD,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
			achievedMilestones: new Set<MilestoneType>(["first_floor_clear"]),
		});
		const next = addSpeechLog(state, "floor_reached");

		const contextualEntries =
			CONTEXTUAL_SPEECH_VARIANTS[DEFAULT_PERSONALITY].floor_reached;
		const deepEntry = contextualEntries?.find(
			(e) => e.context === "deep_floor",
		);
		expect(deepEntry).toBeDefined();
		expect(deepEntry?.variants).toContain(next.speechLog?.message);
	});

	it("hp_critical + deep_floor同時該当でhp_criticalが優先される", () => {
		const criticalHp = Math.floor(PLAYER_INITIAL_HP * HP_CRITICAL_RATIO);
		const state = createTestState({
			floor: DEEP_FLOOR_THRESHOLD,
			player: {
				position: { x: 3, y: 3 },
				hp: criticalHp,
				maxHp: PLAYER_INITIAL_HP,
			},
			achievedMilestones: new Set<MilestoneType>(["first_floor_clear"]),
		});
		const next = addSpeechLog(state, "floor_reached");

		const contextualEntries =
			CONTEXTUAL_SPEECH_VARIANTS[DEFAULT_PERSONALITY].floor_reached;
		const criticalEntry = contextualEntries?.find(
			(e) => e.context === "hp_critical",
		);
		expect(criticalEntry).toBeDefined();
		expect(criticalEntry?.variants).toContain(next.speechLog?.message);
	});

	it("consecutive_combo条件でコンボ発話が選択される（HP正常時）", () => {
		const state = createTestState({
			speechLog: {
				eventType: "combo_activated",
				message: "test",
				timestamp: Date.now(),
			},
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "combo_activated");

		const contextualEntries =
			CONTEXTUAL_SPEECH_VARIANTS[DEFAULT_PERSONALITY].combo_activated;
		const comboEntry = contextualEntries?.find(
			(e) => e.context === "consecutive_combo",
		);
		expect(comboEntry).toBeDefined();
		expect(comboEntry?.variants).toContain(next.speechLog?.message);
	});

	it("条件非該当時にデフォルトバリエーションが選択される", () => {
		// HP満タン、floor=1、comboなし → コンテキスト全非該当
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "move_success");
		const variants = allDefaultVariants(DEFAULT_PERSONALITY, "move_success");
		expect(variants).toContain(next.speechLog?.message);
	});

	it("game_overイベントは常にデフォルトバリエーション（コンテキスト発話なし）", () => {
		const criticalHp = Math.floor(PLAYER_INITIAL_HP * HP_CRITICAL_RATIO);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: criticalHp,
				maxHp: PLAYER_INITIAL_HP,
			},
			achievedMilestones: new Set<MilestoneType>(["last_word"]),
		});
		const next = addSpeechLog(state, "game_over");
		const variants = allDefaultVariants(DEFAULT_PERSONALITY, "game_over");
		expect(variants).toContain(next.speechLog?.message);
	});
});

describe("マイルストーン発話", () => {
	it("累計撃破数1でマイルストーン発話が選択される", () => {
		const state = createTestState({
			acquisitionCounters: {
				defeatCounts: {
					normal: 1,
					heavy: 0,
					scout: 0,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_defeat;
		expect(msVariants).toContain(next.speechLog?.message);
	});

	it("マイルストーン達成時にachievedMilestonesが更新される", () => {
		const state = createTestState({
			acquisitionCounters: {
				defeatCounts: {
					normal: 1,
					heavy: 0,
					scout: 0,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		expect(next.achievedMilestones.has("first_defeat")).toBe(true);
	});

	it("マイルストーン達成済みなら通常発話にフォールバックする", () => {
		const state = createTestState({
			achievedMilestones: new Set<MilestoneType>(["first_defeat"]),
			acquisitionCounters: {
				defeatCounts: {
					normal: 1,
					heavy: 0,
					scout: 0,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		const allVariants = [
			...SPEECH_VARIANTS[DEFAULT_PERSONALITY].enemy_defeated,
			...(RARE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].enemy_defeated ?? []),
		];
		expect(allVariants).toContain(next.speechLog?.message);
	});

	it("first_trap: 罠初踏みでマイルストーン発話が選択される", () => {
		const state = createTestState();
		const next = addSpeechLog(state, "trap_triggered");
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_trap;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.achievedMilestones.has("first_trap")).toBe(true);
	});

	it("last_word: ゲームオーバーでマイルストーン発話が選択される", () => {
		const state = createTestState();
		const next = addSpeechLog(state, "game_over");
		const msVariants = MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].last_word;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.achievedMilestones.has("last_word")).toBe(true);
	});

	it("first_floor_clear: 階層遷移でマイルストーン発話が選択される", () => {
		const state = createTestState();
		const next = addSpeechLog(state, "floor_reached");
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_floor_clear;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.achievedMilestones.has("first_floor_clear")).toBe(true);
	});

	it("連続発話とマイルストーン到達が同時の場合、到達は記録されpendingに保持される", () => {
		const state = createTestState({
			speechLog: {
				eventType: "damage_taken",
				message: "test",
				timestamp: Date.now(),
			},
			acquisitionCounters: {
				defeatCounts: {
					normal: 1,
					heavy: 0,
					scout: 0,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		// マイルストーン到達は記録される
		expect(next.achievedMilestones.has("first_defeat")).toBe(true);
		// 発話はマイルストーン発話（pendingが即消化される）
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_defeat;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.pendingMilestone).toBeNull();
	});

	it("pendingMilestoneがある場合、次回発話で最優先消化される", () => {
		const state = createTestState({
			pendingMilestone: "first_defeat",
			achievedMilestones: new Set<MilestoneType>(["first_defeat"]),
		});
		const next = addSpeechLog(state, "move_success");
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_defeat;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.pendingMilestone).toBeNull();
	});

	it("pendingMilestoneは連続発話より優先される", () => {
		const state = createTestState({
			pendingMilestone: "first_defeat",
			achievedMilestones: new Set<MilestoneType>(["first_defeat"]),
			speechLog: {
				eventType: "damage_taken",
				message: "test",
				timestamp: Date.now(),
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		const msVariants =
			MILESTONE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].first_defeat;
		expect(msVariants).toContain(next.speechLog?.message);
		expect(next.pendingMilestone).toBeNull();
	});

	it("元のstateのachievedMilestonesは変更されない（イミュータブル）", () => {
		const state = createTestState({
			acquisitionCounters: {
				defeatCounts: {
					normal: 1,
					heavy: 0,
					scout: 0,
					miniboss: 0,
					boss: 0,
				},
				hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			},
		});
		addSpeechLog(state, "enemy_defeated");
		expect(state.achievedMilestones.size).toBe(0);
	});
});

describe("レアセリフ判定", () => {
	let randomSpy: MockInstance;

	afterEach(() => {
		randomSpy?.mockRestore();
	});

	it("Math.random < RARE_SPEECH_RATE のときレアセリフが選択される", () => {
		// Math.random を固定: 1回目=0.05(レア判定), 2回目=0(バリエーション選択)
		randomSpy = vi
			.spyOn(Math, "random")
			.mockReturnValueOnce(0.05)
			.mockReturnValueOnce(0);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		const rareVariants =
			RARE_SPEECH_VARIANTS[DEFAULT_PERSONALITY].enemy_defeated;
		expect(rareVariants).toContain(next.speechLog?.message);
	});

	it("Math.random >= RARE_SPEECH_RATE のとき通常セリフが選択される", () => {
		randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "enemy_defeated");
		const defaultVariants = SPEECH_VARIANTS[DEFAULT_PERSONALITY].enemy_defeated;
		expect(defaultVariants).toContain(next.speechLog?.message);
	});

	it("レアバリエーション未定義イベントでは通常セリフにフォールバックする", () => {
		// rest_area_usedはRARE_SPEECH_VARIANTSに未定義
		randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "rest_area_used");
		const defaultVariants = SPEECH_VARIANTS[DEFAULT_PERSONALITY].rest_area_used;
		expect(defaultVariants).toContain(next.speechLog?.message);
	});
});
