import { describe, expect, it } from "vitest";
import { PERSONALITIES } from "../constants";
import type { MilestoneType, Personality } from "../types";
import { MILESTONE_SPEECH_VARIANTS } from "./milestoneSpeechData";

const ALL_MILESTONES: MilestoneType[] = [
	"first_defeat",
	"ten_defeats",
	"first_trap",
	"last_word",
	"first_floor_clear",
];

describe("MILESTONE_SPEECH_VARIANTS データ完全性", () => {
	it("全5性格が定義されている", () => {
		for (const personality of PERSONALITIES) {
			expect(MILESTONE_SPEECH_VARIANTS[personality]).toBeDefined();
		}
	});

	it.each(
		PERSONALITIES,
	)("性格 %s で全5マイルストーンが定義されている", (personality: Personality) => {
		const variants = MILESTONE_SPEECH_VARIANTS[personality];
		for (const milestone of ALL_MILESTONES) {
			expect(variants[milestone]).toBeDefined();
			expect(variants[milestone].length).toBeGreaterThan(0);
		}
	});

	it("全バリエーションが空文字列でない", () => {
		for (const personality of PERSONALITIES) {
			const variants = MILESTONE_SPEECH_VARIANTS[personality];
			for (const milestone of ALL_MILESTONES) {
				for (const text of variants[milestone]) {
					expect(text.trim().length).toBeGreaterThan(0);
				}
			}
		}
	});
});
