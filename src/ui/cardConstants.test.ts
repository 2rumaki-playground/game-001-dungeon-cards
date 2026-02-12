import { describe, expect, it } from "vitest";
import type { CardType, Rarity } from "../types";
import {
	CARD_COLORS,
	CARD_DESCRIPTION,
	CARD_EFFECT_TEXT,
	CARD_GLOW_COLORS,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	RARITY_COLORS,
	RARITY_NAME,
} from "./cardConstants";

const ALL_CARD_TYPES: CardType[] = [
	"move",
	"attack",
	"strong_attack",
	"jump",
	"wait",
];

const ALL_RARITIES: Rarity[] = ["common", "uncommon", "rare"];

describe("cardConstants", () => {
	describe("CARD_COLORS", () => {
		it("全カード種別に背景色とボーダー色が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(CARD_COLORS[type]).toBeDefined();
				expect(typeof CARD_COLORS[type].bg).toBe("number");
				expect(typeof CARD_COLORS[type].border).toBe("number");
			}
		});
	});

	describe("CARD_TYPE_SYMBOL", () => {
		it("全カード種別にシンボルが定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_TYPE_SYMBOL[type]).toBe("string");
				expect(CARD_TYPE_SYMBOL[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("CARD_TYPE_NAME", () => {
		it("全カード種別に日本語名が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_TYPE_NAME[type]).toBe("string");
				expect(CARD_TYPE_NAME[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("CARD_EFFECT_TEXT", () => {
		it("全カード種別に効果テキストが定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_EFFECT_TEXT[type]).toBe("string");
				expect(CARD_EFFECT_TEXT[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("CARD_GLOW_COLORS", () => {
		it("全カード種別に発光色が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(CARD_GLOW_COLORS[type]).toBeDefined();
				expect(Array.isArray(CARD_GLOW_COLORS[type])).toBe(true);
				expect(CARD_GLOW_COLORS[type].length).toBeGreaterThan(0);
			}
		});

		it("各発光色はnumber型の配列である", () => {
			for (const type of ALL_CARD_TYPES) {
				for (const color of CARD_GLOW_COLORS[type]) {
					expect(typeof color).toBe("number");
				}
			}
		});
	});

	describe("RARITY_COLORS", () => {
		it("全レアリティに色が定義されている", () => {
			for (const rarity of ALL_RARITIES) {
				expect(typeof RARITY_COLORS[rarity]).toBe("number");
			}
		});
	});

	describe("CARD_DESCRIPTION", () => {
		it("全カード種別に詳細説明が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_DESCRIPTION[type]).toBe("string");
				expect(CARD_DESCRIPTION[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("RARITY_NAME", () => {
		it("全レアリティに日本語名が定義されている", () => {
			for (const rarity of ALL_RARITIES) {
				expect(typeof RARITY_NAME[rarity]).toBe("string");
				expect(RARITY_NAME[rarity].length).toBeGreaterThan(0);
			}
		});
	});
});
