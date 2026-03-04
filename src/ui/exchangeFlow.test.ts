import { describe, expect, it } from "vitest";
import { buildExchangeTitle } from "./exchangeFlow";

describe("buildExchangeTitle", () => {
	it("宝箱由来であることが分かるメッセージを返す", () => {
		const title = buildExchangeTitle("move");
		expect(title).toContain("宝箱");
		expect(title).toContain("移動");
		expect(title).toContain("スクロール");
		expect(title).toContain("獲得");
	});

	it("タイトルに「交換するカードを選択」を含まない（サブタイトルで表示されるため）", () => {
		const title = buildExchangeTitle("fire");
		expect(title).not.toContain("交換するカードを選択");
	});

	it("各カードタイプで正しい名前が使われる", () => {
		expect(buildExchangeTitle("fire")).toContain("ファイアボルト");
		expect(buildExchangeTitle("thunder")).toContain("サンダー");
		expect(buildExchangeTitle("jump")).toContain("ジャンプ");
	});
});
