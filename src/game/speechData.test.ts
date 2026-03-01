import { describe, expect, it } from "vitest";
import { PERSONALITIES } from "../constants";
import type { Personality, SpeechEventType } from "../types";
import { SPEECH_SEQUENCE_VARIANTS, SPEECH_VARIANTS } from "./speechData";

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
