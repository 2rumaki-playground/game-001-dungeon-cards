import { describe, expect, it } from "vitest";
import {
	DEEP_FLOOR_THRESHOLD,
	DEFAULT_PERSONALITY,
	HP_CRITICAL_RATIO,
	PERSONALITIES,
	PLAYER_INITIAL_HP,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Personality } from "../types";
import { CONTEXTUAL_SPEECH_VARIANTS } from "./contextualSpeechData";
import { addSpeechLog, matchesContext } from "./speech";
import { SPEECH_VARIANTS } from "./speechData";

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
		const variants = SPEECH_VARIANTS[DEFAULT_PERSONALITY].enemy_defeated;
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
		const variants = SPEECH_VARIANTS[personality].move_success;
		expect(variants).toContain(next.speechLog?.message);
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
		const defaultVariants = SPEECH_VARIANTS[DEFAULT_PERSONALITY].move_success;
		expect(defaultVariants).toContain(next.speechLog?.message);
	});

	it("game_overイベントは常にデフォルトバリエーション", () => {
		const criticalHp = Math.floor(PLAYER_INITIAL_HP * HP_CRITICAL_RATIO);
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: criticalHp,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const next = addSpeechLog(state, "game_over");
		const defaultVariants = SPEECH_VARIANTS[DEFAULT_PERSONALITY].game_over;
		expect(defaultVariants).toContain(next.speechLog?.message);
	});
});
