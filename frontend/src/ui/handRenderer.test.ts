/**
 * 手札レンダラーのテスト
 */

import { describe, expect, it } from "vitest";
import {
	CARD_HEIGHT,
	CARD_WIDTH,
	getDirectionFromClickPosition,
} from "./handRenderer";

describe("getDirectionFromClickPosition", () => {
	// カードサイズ: 90x120 (幅x高さ)
	// 中心: (45, 60)
	// 対角線の傾き: 120/90 = 4/3

	describe("明確な方向判定", () => {
		it("カードの上部中央をクリックした場合、upが返される", () => {
			// 中央上部 (45, 10) → 相対位置 (0, -50)
			const result = getDirectionFromClickPosition(45, 10);
			expect(result).toBe("up");
		});

		it("カードの下部中央をクリックした場合、downが返される", () => {
			// 中央下部 (45, 110) → 相対位置 (0, 50)
			const result = getDirectionFromClickPosition(45, 110);
			expect(result).toBe("down");
		});

		it("カードの左側中央をクリックした場合、leftが返される", () => {
			// 左中央 (10, 60) → 相対位置 (-35, 0)
			const result = getDirectionFromClickPosition(10, 60);
			expect(result).toBe("left");
		});

		it("カードの右側中央をクリックした場合、rightが返される", () => {
			// 右中央 (80, 60) → 相対位置 (35, 0)
			const result = getDirectionFromClickPosition(80, 60);
			expect(result).toBe("right");
		});
	});

	describe("四隅付近の判定（対角線付近）", () => {
		it("左上コーナー付近はupになる（高さ方向に偏っているため）", () => {
			// 左上 (10, 10) → 相対位置 (-35, -50)
			// slope = -50/-35 ≈ 1.43, diagSlope = 120/90 ≈ 1.33
			// |slope| > diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(10, 10);
			expect(result).toBe("up");
		});

		it("右上コーナー付近はupになる", () => {
			// 右上 (80, 10) → 相対位置 (35, -50)
			const result = getDirectionFromClickPosition(80, 10);
			expect(result).toBe("up");
		});

		it("左下コーナー付近はdownになる", () => {
			// 左下 (10, 110) → 相対位置 (-35, 50)
			const result = getDirectionFromClickPosition(10, 110);
			expect(result).toBe("down");
		});

		it("右下コーナー付近はdownになる", () => {
			// 右下 (80, 110) → 相対位置 (35, 50)
			const result = getDirectionFromClickPosition(80, 110);
			expect(result).toBe("down");
		});
	});

	describe("対角線上の点", () => {
		it("対角線上の点は上下方向として判定される（傾きが等しい場合は上下）", () => {
			// 対角線の傾きと同じ傾きの点
			// 右上方向: (45 + 30, 60 - 40) = (75, 20) → relX=30, relY=-40, slope=-4/3
			// |slope| = diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(75, 20);
			expect(result).toBe("up");
		});
	});

	describe("中心付近", () => {
		it("中心をクリックした場合（relX=0）、上下で判定される", () => {
			// 中心 (45, 60) → 相対位置 (0, 0)
			// relX = 0 かつ relY = 0 の場合、up になる（relY > 0 ではないため）
			const result = getDirectionFromClickPosition(45, 60);
			expect(result).toBe("up");
		});

		it("中心のわずかに上をクリックした場合、upが返される", () => {
			const result = getDirectionFromClickPosition(45, 59);
			expect(result).toBe("up");
		});

		it("中心のわずかに下をクリックした場合、downが返される", () => {
			const result = getDirectionFromClickPosition(45, 61);
			expect(result).toBe("down");
		});
	});

	describe("カスタムサイズ", () => {
		it("正方形のカードでも正しく判定される", () => {
			// 100x100 のカード、中心 (50, 50)
			// 右上 (90, 10) → 相対位置 (40, -40)
			// slope = -1, diagSlope = 1
			// |slope| = diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(90, 10, 100, 100);
			expect(result).toBe("up");

			// 右 (90, 50) → 相対位置 (40, 0)
			const result2 = getDirectionFromClickPosition(90, 50, 100, 100);
			expect(result2).toBe("right");
		});
	});

	describe("カードサイズ定数", () => {
		it("CARD_WIDTHは90", () => {
			expect(CARD_WIDTH).toBe(90);
		});

		it("CARD_HEIGHTは120", () => {
			expect(CARD_HEIGHT).toBe(120);
		});
	});
});
