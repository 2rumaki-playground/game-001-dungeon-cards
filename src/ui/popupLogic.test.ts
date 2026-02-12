/**
 * ダメージポップアップロジックのテスト
 */

import { describe, expect, it } from "vitest";
import { calcPopupFontSize, calcScreenShakeIntensity } from "./popupLogic";

describe("calcPopupFontSize", () => {
	it("ダメージ1で基本サイズ24を返す", () => {
		expect(calcPopupFontSize(1)).toBe(24);
	});

	it("ダメージ3で基本サイズより大きい値を返す", () => {
		expect(calcPopupFontSize(3)).toBeGreaterThan(24);
	});

	it("ダメージ量に応じてフォントサイズが増加する", () => {
		expect(calcPopupFontSize(3)).toBeGreaterThan(calcPopupFontSize(1));
		expect(calcPopupFontSize(5)).toBeGreaterThan(calcPopupFontSize(3));
	});

	it("上限値36を超えない", () => {
		expect(calcPopupFontSize(100)).toBe(36);
	});

	it("ダメージ0でも基本サイズを返す", () => {
		expect(calcPopupFontSize(0)).toBe(24);
	});
});

describe("calcScreenShakeIntensity", () => {
	it("ダメージ1で基本強度4を返す", () => {
		expect(calcScreenShakeIntensity(1)).toBe(4);
	});

	it("ダメージ3で基本強度より大きい値を返す", () => {
		expect(calcScreenShakeIntensity(3)).toBeGreaterThan(4);
	});

	it("ダメージ量に応じて強度が増加する", () => {
		expect(calcScreenShakeIntensity(3)).toBeGreaterThan(
			calcScreenShakeIntensity(1),
		);
		expect(calcScreenShakeIntensity(5)).toBeGreaterThan(
			calcScreenShakeIntensity(3),
		);
	});

	it("上限値10を超えない", () => {
		expect(calcScreenShakeIntensity(100)).toBe(10);
	});

	it("ダメージ0でも基本強度を返す", () => {
		expect(calcScreenShakeIntensity(0)).toBe(4);
	});
});
