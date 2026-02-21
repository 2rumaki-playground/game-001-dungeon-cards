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
			const row = createCardListRow({ cardType: "attack" });
			const texts = row.children.filter((c) => c instanceof Text) as Text[];
			const nameText = texts.find((t) =>
				t.text.includes(CARD_TYPE_NAME.attack),
			);
			expect(nameText).toBeDefined();
			expect(nameText?.text).toContain(CARD_TYPE_SYMBOL.attack);
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

		it("レアリティバーが描画される", () => {
			const row = createCardListRow({ cardType: "jump" });
			// 背景 + レアリティバー + 名前テキスト = 最低3つの子要素
			expect(row.children.length).toBeGreaterThanOrEqual(3);
		});

		it("幅を指定できる", () => {
			const row = createCardListRow({ cardType: "move", width: 300 });
			expect(row).toBeInstanceOf(Container);
		});
	});
});
