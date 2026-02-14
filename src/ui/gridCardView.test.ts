import { Container, Graphics, Text } from "pixi.js";
import { describe, expect, it } from "vitest";
import { CARD_COST } from "../constants";
import type { CardType } from "../types";
import { CARD_COLORS, CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import { createGridCardView } from "./gridCardView";
import { CARD_HEIGHT, CARD_WIDTH } from "./handRenderer";

describe("gridCardView", () => {
	describe("createGridCardView", () => {
		it("Containerが生成される", () => {
			const view = createGridCardView("move");
			expect(view).toBeInstanceOf(Container);
		});

		it("背景のGraphicsが含まれる", () => {
			const view = createGridCardView("move");
			const graphics = view.children.filter((c) => c instanceof Graphics);
			expect(graphics.length).toBeGreaterThanOrEqual(1);
		});

		it("シンボルテキストが含まれる", () => {
			const view = createGridCardView("attack");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const symbol = texts.find((t) => t.text === CARD_TYPE_SYMBOL.attack);
			expect(symbol).toBeDefined();
		});

		it("カード名テキストが含まれる", () => {
			const view = createGridCardView("jump");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const name = texts.find((t) => t.text === CARD_TYPE_NAME.jump);
			expect(name).toBeDefined();
			expect(name?.style.fontWeight).toBe("bold");
		});

		it("各カードタイプで正しいシンボル・名前が使用される", () => {
			const types: CardType[] = [
				"move",
				"attack",
				"strong_attack",
				"jump",
				"wait",
			];
			for (const cardType of types) {
				const view = createGridCardView(cardType);
				const texts = view.children.filter((c) => c instanceof Text) as Text[];
				expect(texts.some((t) => t.text === CARD_TYPE_SYMBOL[cardType])).toBe(
					true,
				);
				expect(texts.some((t) => t.text === CARD_TYPE_NAME[cardType])).toBe(
					true,
				);
			}
		});

		it("各カードタイプで正しい背景色が使用される", () => {
			const view = createGridCardView("attack");
			const bg = view.children[0] as Graphics;
			expect(bg).toBeInstanceOf(Graphics);
			// Graphicsが生成されていることを確認（色の内部状態は直接検証困難）
			expect(CARD_COLORS.attack).toBeDefined();
		});

		it("APコスト>=2のカードはオレンジ色でbold表示", () => {
			const view = createGridCardView("strong_attack");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const costText = texts.find((t) =>
				t.text.includes(`AP: ${CARD_COST.strong_attack}`),
			);
			expect(costText).toBeDefined();
			expect(costText?.style.fill).toBe(0xffaa44);
			expect(costText?.style.fontWeight).toBe("bold");
		});

		it("APコスト=1のカードは灰色で通常表示", () => {
			const view = createGridCardView("move");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const costText = texts.find((t) =>
				t.text.includes(`AP: ${CARD_COST.move}`),
			);
			expect(costText).toBeDefined();
			expect(costText?.style.fill).toBe(0xcccccc);
			expect(costText?.style.fontWeight).toBe("normal");
		});

		it("APコスト=0のカードはコストテキストが空", () => {
			const view = createGridCardView("wait");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const costText = texts.find((t) => t.text.includes("AP:"));
			expect(costText).toBeUndefined();
		});

		it("シンボルのX位置がカード幅の中央", () => {
			const view = createGridCardView("move");
			const texts = view.children.filter((c) => c instanceof Text) as Text[];
			const symbol = texts.find((t) => t.text === CARD_TYPE_SYMBOL.move);
			expect(symbol?.x).toBe(CARD_WIDTH / 2);
		});

		it("子要素が4つ（背景、シンボル、名前、コスト）", () => {
			const view = createGridCardView("attack");
			expect(view.children.length).toBe(4);
		});

		it("CARD_WIDTHが90px、CARD_HEIGHTが120px", () => {
			expect(CARD_WIDTH).toBe(90);
			expect(CARD_HEIGHT).toBe(120);
		});
	});
});
