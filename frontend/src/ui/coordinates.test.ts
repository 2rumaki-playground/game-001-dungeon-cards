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

	it("セル間のギャップ（横方向）ではnullを返す", () => {
		// セル(0,0)とセル(1,0)の間のギャップ領域
		const gapX = CELL_GAP + CELL_SIZE + 1; // ギャップの中
		const cellY = CELL_GAP + 10; // セル(0,0)のY座標内
		const result = pixelToGrid({ x: gapX, y: cellY });
		expect(result).toBeNull();
	});

	it("セル間のギャップ（縦方向）ではnullを返す", () => {
		// セル(0,0)とセル(0,1)の間のギャップ領域
		const cellX = CELL_GAP + 10; // セル(0,0)のX座標内
		const gapY = CELL_GAP + CELL_SIZE + 1; // ギャップの中
		const result = pixelToGrid({ x: cellX, y: gapY });
		expect(result).toBeNull();
	});

	it("セルの右端（CELL_SIZE-1）では有効なグリッド座標を返す", () => {
		const x = CELL_GAP + CELL_SIZE - 1; // セル(0,0)の右端
		const y = CELL_GAP + 10;
		const result = pixelToGrid({ x, y });
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("セルの下端（CELL_SIZE-1）では有効なグリッド座標を返す", () => {
		const x = CELL_GAP + 10;
		const y = CELL_GAP + CELL_SIZE - 1; // セル(0,0)の下端
		const result = pixelToGrid({ x, y });
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("右端の外周余白ではnullを返す", () => {
		// マップの右端（最後のセルの右側）のギャップ領域
		const x = MAP_WIDTH * (CELL_SIZE + CELL_GAP) + CELL_GAP + 1;
		const y = CELL_GAP + 10;
		const result = pixelToGrid({ x, y });
		expect(result).toBeNull();
	});

	it("下端の外周余白ではnullを返す", () => {
		// マップの下端（最後のセルの下側）のギャップ領域
		const x = CELL_GAP + 10;
		const y = MAP_HEIGHT * (CELL_SIZE + CELL_GAP) + CELL_GAP + 1;
		const result = pixelToGrid({ x, y });
		expect(result).toBeNull();
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
