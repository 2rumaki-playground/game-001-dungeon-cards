import { describe, expect, it } from "vitest";
import { PERSONALITIES } from "../constants";
import {
	CONTEXTUAL_SPEECH_VARIANTS,
	type SpeechContext,
} from "./contextualSpeechData";

describe("CONTEXTUAL_SPEECH_VARIANTS", () => {
	it("全5性格にエントリが存在する", () => {
		for (const personality of PERSONALITIES) {
			expect(CONTEXTUAL_SPEECH_VARIANTS[personality]).toBeDefined();
		}
	});

	it("全エントリのvariantsが非空である", () => {
		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];
			for (const [eventType, entries] of Object.entries(events)) {
				for (const entry of entries) {
					expect(
						entry.variants.length,
						`${personality}.${eventType}.${entry.context} のバリエーションが空`,
					).toBeGreaterThan(0);
				}
			}
		}
	});

	it("全エントリのvariantsが3つ以上ある", () => {
		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];
			for (const [eventType, entries] of Object.entries(events)) {
				for (const entry of entries) {
					expect(
						entry.variants.length,
						`${personality}.${eventType}.${entry.context} のバリエーションが3未満`,
					).toBeGreaterThanOrEqual(3);
				}
			}
		}
	});

	it("全性格でhp_critical, hp_tension, deep_floorの3条件をカバーする", () => {
		const requiredContexts: SpeechContext[] = [
			"hp_critical",
			"hp_tension",
			"deep_floor",
		];

		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];
			const foundContexts = new Set<SpeechContext>();
			for (const entries of Object.values(events)) {
				for (const entry of entries) {
					foundContexts.add(entry.context);
				}
			}
			for (const ctx of requiredContexts) {
				expect(
					foundContexts.has(ctx),
					`${personality} に ${ctx} コンテキストがない`,
				).toBe(true);
			}
		}
	});

	it("consecutive_comboはcombo_activatedイベントにのみ存在する", () => {
		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];
			for (const [eventType, entries] of Object.entries(events)) {
				for (const entry of entries) {
					if (entry.context === "consecutive_combo") {
						expect(
							eventType,
							`${personality} の consecutive_combo が combo_activated 以外に存在`,
						).toBe("combo_activated");
					}
				}
			}
		}
	});

	it("game_overイベントにはコンテキスト発話が存在しない", () => {
		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];
			expect(
				events.game_over,
				`${personality} に game_over のコンテキスト発話が存在`,
			).toBeUndefined();
		}
	});
});
