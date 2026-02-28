import { describe, expect, it } from "vitest";
import { createTestState } from "../test-utils/createTestFixtures";
import { addSpeechLog } from "./speech";
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
		const variants = SPEECH_VARIANTS.enemy_defeated;
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
});
