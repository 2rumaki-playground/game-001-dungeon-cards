/**
 * 座標変換ユーティリティ
 * グリッド座標とピクセル座標の相互変換
 */

import { CELL_GAP, CELL_SIZE } from "../constants";
import type { Position } from "../types";

const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;

/**
 * グリッド座標からピクセル座標（左上）を計算
 * @param gridPos グリッド座標（0-indexed）
 * @returns ピクセル座標
 */
export function gridToPixel(gridPos: Position): Position {
	return {
		x: gridPos.x * CELL_WITH_GAP + CELL_GAP,
		y: gridPos.y * CELL_WITH_GAP + CELL_GAP,
	};
}

/**
 * グリッド座標からセル中心のピクセル座標を計算
 * @param gridPos グリッド座標（0-indexed）
 * @returns セル中心のピクセル座標
 */
export function gridToCenterPixel(gridPos: Position): Position {
	const topLeft = gridToPixel(gridPos);
	return {
		x: topLeft.x + CELL_SIZE / 2,
		y: topLeft.y + CELL_SIZE / 2,
	};
}

/**
 * ピクセル座標からグリッド座標を計算
 * @param pixelPos ピクセル座標
 * @param mapWidth マップの幅（グリッド数）
 * @param mapHeight マップの高さ（グリッド数）
 * @returns グリッド座標（セル内の場合）、ギャップ領域や範囲外の場合はnull
 */
export function pixelToGrid(
	pixelPos: Position,
	mapWidth: number,
	mapHeight: number,
): Position | null {
	const adjustedX = pixelPos.x - CELL_GAP;
	const adjustedY = pixelPos.y - CELL_GAP;

	// グリッド座標を計算
	const x = Math.floor(adjustedX / CELL_WITH_GAP);
	const y = Math.floor(adjustedY / CELL_WITH_GAP);

	// 範囲外チェック
	if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
		return null;
	}

	// セル内の相対位置を計算してギャップ領域でないか確認
	const xRemainder = adjustedX % CELL_WITH_GAP;
	const yRemainder = adjustedY % CELL_WITH_GAP;

	// 余りがCELL_SIZE以上の場合はギャップ領域
	if (xRemainder >= CELL_SIZE || yRemainder >= CELL_SIZE) {
		return null;
	}

	return { x, y };
}

/**
 * マップ全体のピクセルサイズを計算
 * @param mapWidth マップの幅（グリッド数）
 * @param mapHeight マップの高さ（グリッド数）
 * @returns マップの幅と高さ（ピクセル）
 */
export function getMapPixelSize(
	mapWidth: number,
	mapHeight: number,
): { width: number; height: number } {
	return {
		width: mapWidth * CELL_WITH_GAP + CELL_GAP,
		height: mapHeight * CELL_WITH_GAP + CELL_GAP,
	};
}
