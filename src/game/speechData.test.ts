import { describe, expect, it } from "vitest";
import { SPEECH_VARIANTS } from "./speechData";

describe("SPEECH_VARIANTS", () => {
	const eventTypes = [
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
	] as const;

	it.each(
		eventTypes,
	)("イベント種別 %s にバリエーションが存在する", (eventType) => {
		const variants = SPEECH_VARIANTS[eventType];
		expect(variants).toBeDefined();
		expect(variants.length).toBeGreaterThanOrEqual(3);
	});

	it("全バリエーションが空文字列でない", () => {
		for (const [, variants] of Object.entries(SPEECH_VARIANTS)) {
			for (const variant of variants) {
				expect(variant.length).toBeGreaterThan(0);
			}
		}
	});
});
