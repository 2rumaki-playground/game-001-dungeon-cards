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

	it("hp系およびフロア系コンテキストの優先度順を保証する", () => {
		// 優先度: hp_critical > hp_tension > deep_floor > consecutive_combo
		const priorityOrder: SpeechContext[] = [
			"hp_critical",
			"hp_tension",
			"deep_floor",
			"consecutive_combo",
		];

		type PriorityCtx = (typeof priorityOrder)[number];

		for (const personality of PERSONALITIES) {
			const events = CONTEXTUAL_SPEECH_VARIANTS[personality];

			for (const [eventType, entries] of Object.entries(events)) {
				// entries 内での各優先度コンテキストの出現位置を記録
				const indexByContext = new Map<PriorityCtx, number>();

				for (let i = 0; i < entries.length; i++) {
					const ctx = entries[i].context;
					if (priorityOrder.includes(ctx as PriorityCtx)) {
						// 同じコンテキストが複数回出ても、最初の位置だけ見ればよい
						if (!indexByContext.has(ctx as PriorityCtx)) {
							indexByContext.set(ctx as PriorityCtx, i);
						}
					}
				}

				// 優先度の高いものが、低いものよりも前に並んでいることを検証
				const pairs: [PriorityCtx, PriorityCtx][] = [
					["hp_critical", "hp_tension"],
					["hp_tension", "deep_floor"],
					["deep_floor", "consecutive_combo"],
				];

				for (const [higher, lower] of pairs) {
					const higherIndex = indexByContext.get(higher);
					const lowerIndex = indexByContext.get(lower);
					if (higherIndex !== undefined && lowerIndex !== undefined) {
						expect(
							higherIndex < lowerIndex,
							[
								`${personality}.${eventType} において`,
								`${higher} が ${lower} より後ろに定義されている`,
							].join(" "),
						).toBe(true);
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
