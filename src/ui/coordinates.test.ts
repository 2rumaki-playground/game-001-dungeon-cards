import { describe, expect, it } from "vitest";
import {
	CELL_GAP,
	CELL_SIZE,
	MAP_HEIGHT,
	MAP_WIDTH,
	VIEWPORT_TILES,
} from "../constants";
import {
	calculateCameraOffset,
	clampCameraOffset,
	getMapPixelSize,
	getViewportPixelSize,
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
		const result = pixelToGrid(pixel, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("範囲外の座標の場合はnullを返す", () => {
		const pixel = { x: -10, y: -10 };
		const result = pixelToGrid(pixel, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toBeNull();
	});

	it("マップ右下端のセルを正しく取得できる", () => {
		const x = (MAP_WIDTH - 1) * (CELL_SIZE + CELL_GAP) + CELL_GAP + 10;
		const y = (MAP_HEIGHT - 1) * (CELL_SIZE + CELL_GAP) + CELL_GAP + 10;
		const result = pixelToGrid({ x, y }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toEqual({ x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 });
	});

	it("セル間のギャップ（横方向）ではnullを返す", () => {
		// セル(0,0)とセル(1,0)の間のギャップ領域
		const gapX = CELL_GAP + CELL_SIZE + 1; // ギャップの中
		const cellY = CELL_GAP + 10; // セル(0,0)のY座標内
		const result = pixelToGrid({ x: gapX, y: cellY }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toBeNull();
	});

	it("セル間のギャップ（縦方向）ではnullを返す", () => {
		// セル(0,0)とセル(0,1)の間のギャップ領域
		const cellX = CELL_GAP + 10; // セル(0,0)のX座標内
		const gapY = CELL_GAP + CELL_SIZE + 1; // ギャップの中
		const result = pixelToGrid({ x: cellX, y: gapY }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toBeNull();
	});

	it("セルの右端（CELL_SIZE-1）では有効なグリッド座標を返す", () => {
		const x = CELL_GAP + CELL_SIZE - 1; // セル(0,0)の右端
		const y = CELL_GAP + 10;
		const result = pixelToGrid({ x, y }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("セルの下端（CELL_SIZE-1）では有効なグリッド座標を返す", () => {
		const x = CELL_GAP + 10;
		const y = CELL_GAP + CELL_SIZE - 1; // セル(0,0)の下端
		const result = pixelToGrid({ x, y }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("右端の外周余白ではnullを返す", () => {
		// マップの右端（最後のセルの右側）のギャップ領域
		const x = MAP_WIDTH * (CELL_SIZE + CELL_GAP) + CELL_GAP + 1;
		const y = CELL_GAP + 10;
		const result = pixelToGrid({ x, y }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toBeNull();
	});

	it("下端の外周余白ではnullを返す", () => {
		// マップの下端（最後のセルの下側）のギャップ領域
		const x = CELL_GAP + 10;
		const y = MAP_HEIGHT * (CELL_SIZE + CELL_GAP) + CELL_GAP + 1;
		const result = pixelToGrid({ x, y }, MAP_WIDTH, MAP_HEIGHT);
		expect(result).toBeNull();
	});
});

describe("getMapPixelSize", () => {
	it("マップ全体のピクセルサイズを計算する", () => {
		const result = getMapPixelSize(MAP_WIDTH, MAP_HEIGHT);
		expect(result).toEqual({
			width: MAP_WIDTH * (CELL_SIZE + CELL_GAP) + CELL_GAP,
			height: MAP_HEIGHT * (CELL_SIZE + CELL_GAP) + CELL_GAP,
		});
	});
});

describe("getViewportPixelSize", () => {
	it(`${VIEWPORT_TILES}×${VIEWPORT_TILES}タイル分のビューポートサイズを返す`, () => {
		const result = getViewportPixelSize();
		const expected = getMapPixelSize(VIEWPORT_TILES, VIEWPORT_TILES);
		expect(result).toEqual(expected);
	});

	it(`getMapPixelSize(${VIEWPORT_TILES}, ${VIEWPORT_TILES})と同じ値を返す`, () => {
		const result = getViewportPixelSize();
		expect(result).toEqual({
			width: VIEWPORT_TILES * (CELL_SIZE + CELL_GAP) + CELL_GAP,
			height: VIEWPORT_TILES * (CELL_SIZE + CELL_GAP) + CELL_GAP,
		});
	});
});

describe("calculateCameraOffset", () => {
	const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;
	const viewportPx = VIEWPORT_TILES * CELL_WITH_GAP + CELL_GAP;

	it(`${VIEWPORT_TILES}×${VIEWPORT_TILES}マップ（同サイズ）→ オフセット0`, () => {
		const result = calculateCameraOffset(
			{ x: 4, y: 4 },
			VIEWPORT_TILES,
			VIEWPORT_TILES,
		);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it(`${VIEWPORT_TILES}×${VIEWPORT_TILES}マップ、プレイヤーが端でもオフセット0`, () => {
		const result = calculateCameraOffset(
			{ x: 0, y: 0 },
			VIEWPORT_TILES,
			VIEWPORT_TILES,
		);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("11×11マップ、プレイヤー中央(5,5) → クランプ範囲内のオフセット", () => {
		const result = calculateCameraOffset({ x: 5, y: 5 }, 11, 11);
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const playerCenter = 5 * CELL_WITH_GAP + CELL_GAP + CELL_SIZE / 2;
		const expected = viewportPx / 2 - playerCenter;
		const min = viewportPx - mapPx;
		expect(result).toEqual({
			x: Math.max(min, Math.min(0, expected)),
			y: Math.max(min, Math.min(0, expected)),
		});
	});

	it("11×11マップ、プレイヤー左上端(0,0) → 上限0にクランプ", () => {
		const result = calculateCameraOffset({ x: 0, y: 0 }, 11, 11);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("11×11マップ、プレイヤー右下端(10,10) → 下限にクランプ", () => {
		const result = calculateCameraOffset({ x: 10, y: 10 }, 11, 11);
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const min = viewportPx - mapPx;
		expect(result).toEqual({ x: min, y: min });
	});

	it("19×19マップ、プレイヤー中央(9,9) → クランプ範囲内", () => {
		const result = calculateCameraOffset({ x: 9, y: 9 }, 19, 19);
		const mapPx = 19 * CELL_WITH_GAP + CELL_GAP;
		const playerCenter = 9 * CELL_WITH_GAP + CELL_GAP + CELL_SIZE / 2;
		const expected = viewportPx / 2 - playerCenter;
		const min = viewportPx - mapPx;
		expect(expected).toBeGreaterThanOrEqual(min);
		expect(expected).toBeLessThanOrEqual(0);
		expect(result).toEqual({ x: expected, y: expected });
	});

	it("7×7マップ（ビューポートより小さい）→ 中央配置", () => {
		const result = calculateCameraOffset({ x: 3, y: 3 }, 7, 7);
		const mapPx = 7 * CELL_WITH_GAP + CELL_GAP;
		const offset = (viewportPx - mapPx) / 2;
		expect(result).toEqual({ x: offset, y: offset });
	});
});

describe("clampCameraOffset", () => {
	const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;
	const viewportPx = VIEWPORT_TILES * CELL_WITH_GAP + CELL_GAP;

	it("マップ=ビューポート → ドラッグオフセットは無視される", () => {
		const baseOffset = { x: 0, y: 0 };
		const dragOffset = { x: 50, y: 50 };
		const result = clampCameraOffset(
			baseOffset,
			dragOffset,
			VIEWPORT_TILES,
			VIEWPORT_TILES,
		);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("マップ<ビューポート → ドラッグオフセットは無視され中央配置", () => {
		const mapPx = 7 * CELL_WITH_GAP + CELL_GAP;
		const centered = (viewportPx - mapPx) / 2;
		const baseOffset = { x: centered, y: centered };
		const dragOffset = { x: 100, y: 100 };
		const result = clampCameraOffset(baseOffset, dragOffset, 7, 7);
		expect(result).toEqual({ x: centered, y: centered });
	});

	it("dragOffset=(0,0) → baseOffsetそのまま", () => {
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const playerCenter = 5 * CELL_WITH_GAP + CELL_GAP + CELL_SIZE / 2;
		const raw = viewportPx / 2 - playerCenter;
		const min = viewportPx - mapPx;
		const expected = Math.max(min, Math.min(0, raw));
		const baseOffset = { x: expected, y: expected };
		const result = clampCameraOffset(baseOffset, { x: 0, y: 0 }, 11, 11);
		expect(result).toEqual(baseOffset);
	});

	it("11×11マップ、範囲内のドラッグ → 合算値を返す", () => {
		const baseOffset = { x: -68, y: -68 };
		const dragOffset = { x: 30, y: 30 };
		const result = clampCameraOffset(baseOffset, dragOffset, 11, 11);
		// base + drag = -38, -38 → [min, 0]の範囲内
		expect(result).toEqual({ x: -38, y: -38 });
	});

	it("11×11マップ、正方向に範囲外ドラッグ → 上限0にクランプ", () => {
		const baseOffset = { x: -68, y: -68 };
		const dragOffset = { x: 1000, y: 1000 };
		const result = clampCameraOffset(baseOffset, dragOffset, 11, 11);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("11×11マップ、負方向に範囲外ドラッグ → 下限にクランプ", () => {
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const min = viewportPx - mapPx;
		const baseOffset = { x: -68, y: -68 };
		const dragOffset = { x: -1000, y: -1000 };
		const result = clampCameraOffset(baseOffset, dragOffset, 11, 11);
		expect(result).toEqual({ x: min, y: min });
	});
});

describe("calculateCameraOffset（ズーム対応）", () => {
	const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;
	const viewportPx = VIEWPORT_TILES * CELL_WITH_GAP + CELL_GAP;

	it("zoomLevel省略時は従来と同じ動作", () => {
		const result = calculateCameraOffset({ x: 5, y: 5 }, 11, 11);
		const resultWithDefault = calculateCameraOffset(
			{ x: 5, y: 5 },
			11,
			11,
			1.0,
		);
		expect(result).toEqual(resultWithDefault);
	});

	it("zoomLevel=2.0ではスケールされたマップに基づくオフセットを返す", () => {
		const result = calculateCameraOffset({ x: 5, y: 5 }, 11, 11, 2.0);
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const playerCenter = 5 * CELL_WITH_GAP + CELL_GAP + CELL_SIZE / 2;
		const scaledMapPx = mapPx * 2.0;
		const scaledPlayerCenter = playerCenter * 2.0;
		const raw = viewportPx / 2 - scaledPlayerCenter;
		const min = viewportPx - scaledMapPx;
		expect(result).toEqual({
			x: Math.max(min, Math.min(0, raw)),
			y: Math.max(min, Math.min(0, raw)),
		});
	});

	it("zoomLevel=0.5でマップがビューポート以下なら中央配置", () => {
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const scaledMapPx = mapPx * 0.5;
		// scaledMapPx = 752 * 0.5 = 376 < viewportPx = 616 → 中央配置
		const centered = (viewportPx - scaledMapPx) / 2;
		const result = calculateCameraOffset({ x: 5, y: 5 }, 11, 11, 0.5);
		expect(result).toEqual({ x: centered, y: centered });
	});
});

describe("clampCameraOffset（ズーム対応）", () => {
	const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;
	const viewportPx = VIEWPORT_TILES * CELL_WITH_GAP + CELL_GAP;

	it("zoomLevel=1.0は省略時と同じ", () => {
		const baseOffset = { x: -68, y: -68 };
		const dragOffset = { x: 30, y: 30 };
		const result = clampCameraOffset(baseOffset, dragOffset, 11, 11, 1.0);
		const resultDefault = clampCameraOffset(baseOffset, dragOffset, 11, 11);
		expect(result).toEqual(resultDefault);
	});

	it("zoomLevel=0.5でマップがビューポート以下なら中央配置", () => {
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const scaledMapPx = mapPx * 0.5;
		const centered = (viewportPx - scaledMapPx) / 2;
		const result = clampCameraOffset(
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			11,
			11,
			0.5,
		);
		expect(result).toEqual({ x: centered, y: centered });
	});

	it("zoomLevel=2.0ではマップが拡大されドラッグ可能範囲が広がる", () => {
		const mapPx = 11 * CELL_WITH_GAP + CELL_GAP;
		const scaledMapPx = mapPx * 2.0;
		const min = viewportPx - scaledMapPx;
		const result = clampCameraOffset(
			{ x: 0, y: 0 },
			{ x: -5000, y: -5000 },
			11,
			11,
			2.0,
		);
		expect(result).toEqual({ x: min, y: min });
	});
});
