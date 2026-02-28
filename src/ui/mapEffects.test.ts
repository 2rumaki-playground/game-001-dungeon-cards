/**
 * 画面シェイク強度計算のテスト
 */

import { describe, expect, it } from "vitest";
import { calcScreenShakeIntensity } from "./mapEffects";

describe("calcScreenShakeIntensity", () => {
	it("amount 1で基本強度4を返す", () => {
		expect(calcScreenShakeIntensity(1)).toBe(4);
	});

	it("amount 3で基本強度より大きい値を返す", () => {
		expect(calcScreenShakeIntensity(3)).toBeGreaterThan(4);
	});

	it("表示数値に応じて強度が増加する", () => {
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

	it("amount 0でも基本強度を返す", () => {
		expect(calcScreenShakeIntensity(0)).toBe(4);
	});
});
