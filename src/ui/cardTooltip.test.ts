import type { Container, Text } from "pixi.js";
import { describe, expect, it } from "vitest";
import { CARD_MAX_LEVEL, PLAYER_FIRE_DAMAGE } from "../constants";
import type { Card } from "../types";
import {
	CARD_DESCRIPTION,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
} from "./cardConstants";
import { createCardTooltip } from "./cardTooltip";

function getAllTextsRecursive(container: Container): Text[] {
	const texts: Text[] = [];
	for (const child of container.children) {
		if (
			"text" in child &&
			typeof (child as { text: unknown }).text === "string"
		) {
			texts.push(child as unknown as Text);
		}
		if ("children" in child) {
			texts.push(...getAllTextsRecursive(child as Container));
		}
	}
	return texts;
}

describe("createCardTooltip", () => {
	it("Containerとheightを返す", () => {
		const result = createCardTooltip("move");
		expect(result.container).toBeDefined();
		expect(result.height).toBeGreaterThan(0);
	});

	it("カード名+シンボルが含まれる", () => {
		const result = createCardTooltip("move");
		const texts = getAllTextsRecursive(result.container);
		const hasName = texts.some(
			(t) =>
				t.text.includes(CARD_TYPE_NAME.move) &&
				t.text.includes(CARD_TYPE_SYMBOL.move),
		);
		expect(hasName).toBe(true);
	});

	it("CARD_DESCRIPTIONが含まれる", () => {
		const result = createCardTooltip("fire");
		const texts = getAllTextsRecursive(result.container);
		const hasDesc = texts.some((t) => t.text.includes(CARD_DESCRIPTION.fire));
		expect(hasDesc).toBe(true);
	});

	it("Lv.2のファイアボルトではボーナス込みダメージが表示される", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: 2,
			exp: 2,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasBonus = texts.some((t) =>
			t.text.includes(`${PLAYER_FIRE_DAMAGE + 1}ダメージ(+1)`),
		);
		expect(hasBonus).toBe(true);
	});

	it("Lv.2のファイアボルトではレベル表示が含まれる", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: 2,
			exp: 2,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasLevel = texts.some((t) => t.text.includes("Lv.2"));
		expect(hasLevel).toBe(true);
	});

	it("最大レベルのカードでは(MAX)ラベルが表示される", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: CARD_MAX_LEVEL,
			exp: 0,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasMaxLabel = texts.some((t) =>
			t.text.includes(`Lv.${CARD_MAX_LEVEL} (MAX)`),
		);
		expect(hasMaxLabel).toBe(true);
	});

	it("useCount>0の場合、使用回数が表示される", () => {
		const card: Card = {
			id: "card-1",
			type: "move",
			level: 1,
			exp: 0,
			stats: { useCount: 5, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasUseCount = texts.some((t) => t.text.includes("使用: 5回"));
		expect(hasUseCount).toBe(true);
	});

	it("useCount=0の場合、統計セクションが表示されない", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: 1,
			exp: 0,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasUseCount = texts.some((t) => t.text.includes("使用:"));
		expect(hasUseCount).toBe(false);
	});

	it("attack系カードでは撃破数・最大ダメージが表示される", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: 1,
			exp: 0,
			stats: { useCount: 3, defeatCount: 2, maxSingleDamage: 7 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasDefeat = texts.some((t) => t.text.includes("撃破: 2体"));
		const hasMaxDmg = texts.some((t) => t.text.includes("最大: 7ダメージ"));
		expect(hasDefeat).toBe(true);
		expect(hasMaxDmg).toBe(true);
	});

	it("非attack系カードでは撃破数・最大ダメージが表示されない", () => {
		const card: Card = {
			id: "card-1",
			type: "move",
			level: 1,
			exp: 0,
			stats: { useCount: 3, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasDefeat = texts.some((t) => t.text.includes("撃破:"));
		const hasMaxDmg = texts.some((t) => t.text.includes("最大:"));
		expect(hasDefeat).toBe(false);
		expect(hasMaxDmg).toBe(false);
	});

	it("card.levelが範囲外でも正規化されたレベルが表示される", () => {
		const card: Card = {
			id: "card-1",
			type: "fire",
			level: CARD_MAX_LEVEL + 1,
			exp: 99,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const result = createCardTooltip(card);
		const texts = getAllTextsRecursive(result.container);
		const hasNormalizedLevel = texts.some((t) =>
			t.text.includes(`Lv.${CARD_MAX_LEVEL}`),
		);
		expect(hasNormalizedLevel).toBe(true);
		const hasRawLevel = texts.some((t) =>
			t.text.includes(`Lv.${CARD_MAX_LEVEL + 1}`),
		);
		expect(hasRawLevel).toBe(false);
	});
});
