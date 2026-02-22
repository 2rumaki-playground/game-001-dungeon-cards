import type { Container, Text } from "pixi.js";
import { describe, expect, it } from "vitest";
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
		const result = createCardTooltip("attack");
		const texts = getAllTextsRecursive(result.container);
		const hasDesc = texts.some((t) => t.text.includes(CARD_DESCRIPTION.attack));
		expect(hasDesc).toBe(true);
	});
});
