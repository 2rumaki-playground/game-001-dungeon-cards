import { describe, expect, it } from "vitest";
import { CELL_GAP, CELL_SIZE, MAP_HEIGHT, MAP_WIDTH } from "../constants";
import {
	getMapPixelSize,
	gridToCenterPixel,
	gridToPixel,
	pixelToGrid,
} from "./coordinates";

describe("gridToPixel", () => {
	it("(0, 0)の場合、左上のセルの位置を返す", () => {
		const result = gridToPixel({ x: 0, y: 0 });
		expect(result).toEqual({ x: CELL_GAP, y: CELL_GAP });
	});

	it("(1, 0)の場合、2列目の位置を返す", () => {
		const result = gridToPixel({ x: 1, y: 0 });
		expect(result).toEqual({ x: CELL_SIZE + CELL_GAP * 2, y: CELL_GAP });
	});

	it("(0, 1)の場合、2行目の位置を返す", () => {
		const result = gridToPixel({ x: 0, y: 1 });
		expect(result).toEqual({ x: CELL_GAP, y: CELL_SIZE + CELL_GAP * 2 });
	});
});

describe("gridToCenterPixel", () => {
	it("(0, 0)の場合、左上のセルの中心位置を返す", () => {
		const result = gridToCenterPixel({ x: 0, y: 0 });
		expect(result).toEqual({
			x: CELL_GAP + CELL_SIZE / 2,
			y: CELL_GAP + CELL_SIZE / 2,
		});
	});
});

describe("pixelToGrid", () => {
	it("セル内のピクセル座標からグリッド座標を取得できる", () => {
		const pixel = { x: CELL_GAP + 10, y: CELL_GAP + 10 };
		const result = pixelToGrid(pixel);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("範囲外の座標の場合はnullを返す", () => {
		const pixel = { x: -10, y: -10 };
		const result = pixelToGrid(pixel);
		expect(result).toBeNull();
	});

	it("マップ右下端のセルを正しく取得できる", () => {
		const x = (MAP_WIDTH - 1) * (CELL_SIZE + CELL_GAP) + CELL_GAP + 10;
		const y = (MAP_HEIGHT - 1) * (CELL_SIZE + CELL_GAP) + CELL_GAP + 10;
		const result = pixelToGrid({ x, y });
		expect(result).toEqual({ x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 });
	});
});

describe("getMapPixelSize", () => {
	it("マップ全体のピクセルサイズを計算する", () => {
		const result = getMapPixelSize();
		expect(result).toEqual({
			width: MAP_WIDTH * (CELL_SIZE + CELL_GAP) + CELL_GAP,
			height: MAP_HEIGHT * (CELL_SIZE + CELL_GAP) + CELL_GAP,
		});
	});
});
