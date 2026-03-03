import { Container, Text } from "pixi.js";
import { describe, expect, it } from "vitest";
import { CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import {
	CARD_ROW_HEIGHT,
	CARD_ROW_LIST_WIDTH,
	CARD_ROW_TEXT_X,
	createCardListRow,
} from "./cardRowRenderer";

describe("cardRowRenderer", () => {
	describe("createCardListRow", () => {
		it("コンテナが生成される", () => {
			const row = createCardListRow({ cardType: "move" });
			expect(row).toBeInstanceOf(Container);
		});

		it("行の高さ定数が52px", () => {
			expect(CARD_ROW_HEIGHT).toBe(52);
		});

		it("リスト幅定数が260px", () => {
			expect(CARD_ROW_LIST_WIDTH).toBe(260);
		});

		it("テキスト開始X位置定数が16px", () => {
			expect(CARD_ROW_TEXT_X).toBe(16);
		});

		it("カード名テキストが含まれる", () => {
			const row = createCardListRow({ cardType: "fire" });
			const texts = row.children.filter((c) => c instanceof Text) as Text[];
			const nameText = texts.find((t) => t.text.includes(CARD_TYPE_NAME.fire));
			expect(nameText).toBeDefined();
			expect(nameText?.text).toContain(CARD_TYPE_SYMBOL.fire);
		});

		it("カード名のフォントサイズが15pxでbold", () => {
			const row = createCardListRow({ cardType: "move" });
			const texts = row.children.filter((c) => c instanceof Text) as Text[];
			const nameText = texts.find((t) => t.text.includes(CARD_TYPE_NAME.move));
			expect(nameText).toBeDefined();
			expect(nameText?.style.fontSize).toBe(15);
			expect(nameText?.style.fontWeight).toBe("bold");
		});

		it("枚数を指定すると名前行に枚数が表示される", () => {
			const row = createCardListRow({ cardType: "move", count: 3 });
			const texts = row.children.filter((c) => c instanceof Text) as Text[];
			const nameText = texts.find((t) => t.text.includes(CARD_TYPE_NAME.move));
			expect(nameText?.text).toContain("x3");
		});

		it("枚数を指定しないと枚数表示がない", () => {
			const row = createCardListRow({ cardType: "move" });
			const texts = row.children.filter((c) => c instanceof Text) as Text[];
			const nameText = texts.find((t) => t.text.includes(CARD_TYPE_NAME.move));
			expect(nameText?.text).not.toContain("x");
		});

		it("背景と名前テキストが描画される", () => {
			const row = createCardListRow({ cardType: "jump" });
			// 背景 + 名前テキスト = 最低2つの子要素
			expect(row.children.length).toBeGreaterThanOrEqual(2);
		});

		it("幅を指定できる", () => {
			const row = createCardListRow({ cardType: "move", width: 300 });
			expect(row).toBeInstanceOf(Container);
		});
	});
});
