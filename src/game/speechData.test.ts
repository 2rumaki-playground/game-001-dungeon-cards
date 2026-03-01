import { describe, expect, it } from "vitest";
import { PERSONALITIES } from "../constants";
import type { Personality, SpeechEventType } from "../types";
import {
	RARE_SPEECH_VARIANTS,
	SPEECH_SEQUENCE_VARIANTS,
	SPEECH_VARIANTS,
} from "./speechData";

const eventTypes: SpeechEventType[] = [
	"move_success",
	"move_fail",
	"attack_miss",
	"combo_activated",
	"enemy_defeated",
	"damage_taken",
	"game_over",
	"trap_triggered",
	"treasure_found",
	"rest_area_used",
	"floor_reached",
	"jump_success",
];

describe("SPEECH_VARIANTS", () => {
	it.each(
		PERSONALITIES,
	)("性格 %s に全イベント種別のバリエーションが存在する", (personality: Personality) => {
		for (const eventType of eventTypes) {
			const variants = SPEECH_VARIANTS[personality][eventType];
			expect(variants).toBeDefined();
			expect(variants.length).toBeGreaterThanOrEqual(5);
		}
	});

	it("全バリエーションが空文字列でない", () => {
		for (const personality of PERSONALITIES) {
			for (const eventType of eventTypes) {
				for (const variant of SPEECH_VARIANTS[personality][eventType]) {
					expect(variant.length).toBeGreaterThan(0);
				}
			}
		}
	});

	it("性格間で発話内容が異なる（通常発話）", () => {
		for (const eventType of eventTypes) {
			const allVariantSets = PERSONALITIES.map(
				(p) => new Set(SPEECH_VARIANTS[p][eventType]),
			);
			// 少なくとも2つの性格間で異なるバリエーションが存在する
			const firstSet = allVariantSets[0];
			const hasDifference = allVariantSets
				.slice(1)
				.some(
					(set) =>
						set.size !== firstSet.size ||
						[...set].some((v) => !firstSet.has(v)),
				);
			expect(hasDifference).toBe(true);
		}
	});
});

const sequenceKeys = [
	"damage_taken_enemy_defeated",
	"move_fail_move_fail",
	"trap_triggered_move_success",
	"enemy_defeated_enemy_defeated",
	"attack_miss_enemy_defeated",
	"damage_taken_move_success",
] as const;

describe("SPEECH_SEQUENCE_VARIANTS", () => {
	it.each(
		PERSONALITIES,
	)("性格 %s に全連続パターンのバリエーションが存在する（最低1つ）", (personality: Personality) => {
		for (const key of sequenceKeys) {
			const variants = SPEECH_SEQUENCE_VARIANTS[personality][key];
			expect(variants).toBeDefined();
			expect(variants?.length).toBeGreaterThanOrEqual(1);
		}
	});

	it("全性格で同じキーセットを持つ", () => {
		const firstKeys = Object.keys(
			SPEECH_SEQUENCE_VARIANTS[PERSONALITIES[0]],
		).sort();
		for (const personality of PERSONALITIES.slice(1)) {
			const keys = Object.keys(SPEECH_SEQUENCE_VARIANTS[personality]).sort();
			expect(keys).toEqual(firstKeys);
		}
	});

	it("全バリエーションが空文字列でない", () => {
		for (const personality of PERSONALITIES) {
			for (const key of sequenceKeys) {
				const variants = SPEECH_SEQUENCE_VARIANTS[personality][key];
				if (variants) {
					for (const variant of variants) {
						expect(variant.length).toBeGreaterThan(0);
					}
				}
			}
		}
	});
});

describe("RARE_SPEECH_VARIANTS", () => {
	const EXPECTED_RARE_EVENTS: SpeechEventType[] = [
		"move_success",
		"enemy_defeated",
		"damage_taken",
		"game_over",
		"combo_activated",
		"treasure_found",
		"trap_triggered",
		"floor_reached",
	];

	it.each(
		PERSONALITIES,
	)("性格 %s にレアバリエーションが全8イベント存在する", (personality: Personality) => {
		const rareEvents = Object.keys(RARE_SPEECH_VARIANTS[personality]).sort();
		expect(rareEvents).toEqual([...EXPECTED_RARE_EVENTS].sort());
	});

	it("全バリエーションが1つ以上かつ空文字列でない", () => {
		for (const personality of PERSONALITIES) {
			for (const [eventType, variants] of Object.entries(
				RARE_SPEECH_VARIANTS[personality],
			)) {
				expect(variants, `${personality}.${eventType}`).toBeDefined();
				const v = variants as readonly string[];
				expect(
					v.length,
					`${personality}.${eventType} の配列が空`,
				).toBeGreaterThanOrEqual(1);
				for (const variant of v) {
					expect(variant.length).toBeGreaterThan(0);
				}
			}
		}
	});

	it("レアセリフが通常セリフと重複しない", () => {
		for (const personality of PERSONALITIES) {
			for (const [eventType, rareVariants] of Object.entries(
				RARE_SPEECH_VARIANTS[personality],
			)) {
				if (!rareVariants) continue;
				const normalVariants = new Set(
					SPEECH_VARIANTS[personality][eventType as SpeechEventType],
				);
				for (const rare of rareVariants) {
					expect(normalVariants.has(rare)).toBe(false);
				}
			}
		}
	});
});
