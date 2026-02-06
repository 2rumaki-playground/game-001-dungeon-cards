import { describe, expect, it } from "vitest";
import { CARD_RARITY, RARITY_WEIGHTS } from "../constants";
import type { CardType, Rarity } from "../types";
import { RNG } from "../utils/rng";
import {
	drawRewardCard,
	generateRewardChoices,
	getCardTypesByRarity,
	rollRarity,
} from "./cardPool";

describe("cardPool", () => {
	describe("getCardTypesByRarity", () => {
		it("コモンにはmove, attack, waitが含まれる", () => {
			const commons = getCardTypesByRarity("common");
			expect(commons).toContain("move");
			expect(commons).toContain("attack");
			expect(commons).toContain("wait");
		});

		it("アンコモンにはstrong_attackが含まれる", () => {
			const uncommons = getCardTypesByRarity("uncommon");
			expect(uncommons).toContain("strong_attack");
		});

		it("レアにはrushが含まれる", () => {
			const rares = getCardTypesByRarity("rare");
			expect(rares).toContain("rush");
		});

		it("全カード種別がいずれかのレアリティに属する", () => {
			const allFromPool = [
				...getCardTypesByRarity("common"),
				...getCardTypesByRarity("uncommon"),
				...getCardTypesByRarity("rare"),
			];
			const allCardTypes = Object.keys(CARD_RARITY) as CardType[];
			for (const cardType of allCardTypes) {
				expect(allFromPool).toContain(cardType);
			}
		});
	});

	describe("rollRarity", () => {
		it("Rarity型の値を返す", () => {
			const rng = new RNG(42);
			const result = rollRarity(rng);
			expect(["common", "uncommon", "rare"]).toContain(result);
		});

		it("シード固定で再現性がある", () => {
			const rng1 = new RNG(123);
			const results1 = Array.from({ length: 10 }, () => rollRarity(rng1));

			const rng2 = new RNG(123);
			const results2 = Array.from({ length: 10 }, () => rollRarity(rng2));

			expect(results1).toEqual(results2);
		});

		it("1000回試行でRARITY_WEIGHTSに基づく期待分布に従う（許容±5%）", () => {
			const rng = new RNG(42);
			const counts: Record<Rarity, number> = {
				common: 0,
				uncommon: 0,
				rare: 0,
			};
			const trials = 1000;
			const totalWeight = Object.values(RARITY_WEIGHTS).reduce(
				(sum, w) => sum + w,
				0,
			);
			const tolerance = 0.05;

			for (let i = 0; i < trials; i++) {
				counts[rollRarity(rng)]++;
			}

			for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [
				Rarity,
				number,
			][]) {
				const expected = weight / totalWeight;
				const actual = counts[rarity] / trials;
				expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
				expect(actual).toBeLessThanOrEqual(expected + tolerance);
			}
		});
	});

	describe("drawRewardCard", () => {
		it("CardTypeのいずれかを返す", () => {
			const rng = new RNG(42);
			const result = drawRewardCard(rng);
			const allCardTypes = Object.keys(CARD_RARITY) as CardType[];
			expect(allCardTypes).toContain(result);
		});

		it("シード固定で再現性がある", () => {
			const result1 = drawRewardCard(new RNG(99));
			const result2 = drawRewardCard(new RNG(99));
			expect(result1).toBe(result2);
		});
	});

	describe("generateRewardChoices", () => {
		it("指定数の選択肢を返す", () => {
			const rng = new RNG(42);
			const choices = generateRewardChoices(rng, 3);
			expect(choices).toHaveLength(3);
		});

		it("0件で空配列を返す", () => {
			const rng = new RNG(42);
			const choices = generateRewardChoices(rng, 0);
			expect(choices).toEqual([]);
		});

		it("負のcountでエラーを投げる", () => {
			const rng = new RNG(42);
			expect(() => generateRewardChoices(rng, -1)).toThrow(
				"Cannot generate negative count: -1",
			);
		});

		it("シード固定で再現性がある", () => {
			const choices1 = generateRewardChoices(new RNG(42), 5);
			const choices2 = generateRewardChoices(new RNG(42), 5);
			expect(choices1).toEqual(choices2);
		});
	});
});
