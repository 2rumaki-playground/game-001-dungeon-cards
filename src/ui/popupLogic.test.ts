/**
 * ポップアップ表示ロジックのテスト
 */

import { describe, expect, it } from "vitest";
import { calcPopupFontSize } from "./popupLogic";

describe("calcPopupFontSize", () => {
	it("amount 1で基本サイズ24を返す", () => {
		expect(calcPopupFontSize(1)).toBe(24);
	});

	it("amount 3で基本サイズより大きい値を返す", () => {
		expect(calcPopupFontSize(3)).toBeGreaterThan(24);
	});

	it("表示数値に応じてフォントサイズが増加する", () => {
		expect(calcPopupFontSize(3)).toBeGreaterThan(calcPopupFontSize(1));
		expect(calcPopupFontSize(5)).toBeGreaterThan(calcPopupFontSize(3));
	});

	it("上限値36を超えない", () => {
		expect(calcPopupFontSize(100)).toBe(36);
	});

	it("amount 0でも基本サイズを返す", () => {
		expect(calcPopupFontSize(0)).toBe(24);
	});
});
