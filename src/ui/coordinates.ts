/**
 * 座標変換ユーティリティ
 * グリッド座標とピクセル座標の相互変換
 */

import { CELL_GAP, CELL_SIZE, VIEWPORT_TILES } from "../constants";
import type { Position } from "../types";

const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;

/** toGlobal/toLocalを持つコンテナのインタフェース */
interface SpatialContainer {
	toGlobal(pos: { x: number; y: number }): { x: number; y: number };
	toLocal(pos: { x: number; y: number }): { x: number; y: number };
}

/**
 * グリッド座標をパーティクルコンテナ空間の座標に変換
 * マップ空間 → グローバル空間 → パーティクル空間 の変換パイプライン
 * @param gridPos グリッド座標
 * @param mapContainer マップのPixiJSコンテナ
 * @param particleContainer パーティクルのPixiJSコンテナ
 * @returns パーティクルコンテナ空間の座標
 */
export function gridToParticlePosition(
	gridPos: Position,
	mapContainer: SpatialContainer,
	particleContainer: SpatialContainer,
): Position {
	const mapCenter = gridToCenterPixel(gridPos);
	const globalCenter = mapContainer.toGlobal(mapCenter);
	const local = particleContainer.toLocal(globalCenter);
	return { x: local.x, y: local.y };
}

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

/**
 * ビューポート（VIEWPORT_TILES × VIEWPORT_TILES タイル）のピクセルサイズを計算
 * @returns ビューポートの幅と高さ（ピクセル）
 */
export function getViewportPixelSize(): { width: number; height: number } {
	return getMapPixelSize(VIEWPORT_TILES, VIEWPORT_TILES);
}

/**
 * プレイヤー位置に基づくカメラオフセットを計算
 * - マップ ≤ ビューポート: マップを中央配置
 * - マップ > ビューポート: プレイヤーを中央に配置しつつ端でクランプ
 * @param playerPos プレイヤーのグリッド座標
 * @param mapWidth マップの幅（グリッド数）
 * @param mapHeight マップの高さ（グリッド数）
 * @param zoomLevel ズーム倍率（スケール後のマップサイズで計算する）
 * @returns mapContainerに設定するピクセルオフセット
 */
export function calculateCameraOffset(
	playerPos: Position,
	mapWidth: number,
	mapHeight: number,
	zoomLevel = 1.0,
): Position {
	const viewport = getViewportPixelSize();
	const map = getMapPixelSize(mapWidth, mapHeight);
	const playerCenter = gridToCenterPixel(playerPos);

	return {
		x: calcAxis(
			viewport.width,
			map.width * zoomLevel,
			playerCenter.x * zoomLevel,
		),
		y: calcAxis(
			viewport.height,
			map.height * zoomLevel,
			playerCenter.y * zoomLevel,
		),
	};
}

/**
 * カメラオフセット（player中心 + dragOffset）をマップ範囲内にクランプ
 * @param baseOffset calculateCameraOffsetの返値
 * @param dragOffset ドラッグによる追加オフセット
 * @param mapWidth マップの幅（グリッド数）
 * @param mapHeight マップの高さ（グリッド数）
 * @param zoomLevel ズーム倍率（クランプ範囲がmapPx×zoomLevelに変わる）
 * @returns クランプ済みの最終オフセット
 */
export function clampCameraOffset(
	baseOffset: Position,
	dragOffset: Position,
	mapWidth: number,
	mapHeight: number,
	zoomLevel = 1.0,
): Position {
	const viewport = getViewportPixelSize();
	const map = getMapPixelSize(mapWidth, mapHeight);
	return {
		x: clampAxis(
			baseOffset.x + dragOffset.x,
			viewport.width,
			map.width * zoomLevel,
		),
		y: clampAxis(
			baseOffset.y + dragOffset.y,
			viewport.height,
			map.height * zoomLevel,
		),
	};
}

function clampAxis(raw: number, viewportPx: number, mapPx: number): number {
	if (mapPx <= viewportPx) {
		return (viewportPx - mapPx) / 2;
	}
	const min = viewportPx - mapPx;
	return Math.max(min, Math.min(0, raw));
}

function calcAxis(
	viewportPx: number,
	mapPx: number,
	playerCenterPx: number,
): number {
	if (mapPx <= viewportPx) {
		return (viewportPx - mapPx) / 2;
	}
	const raw = viewportPx / 2 - playerCenterPx;
	const min = viewportPx - mapPx;
	return Math.max(min, Math.min(0, raw));
}
