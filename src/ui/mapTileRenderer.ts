/**
 * タイル描画・残骸・Fog of War の関数
 */

import { Container, Graphics, Sprite } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { GameMap } from "../types";
import { getTileTexture } from "./assetLoader";
import { gridToPixel } from "./coordinates";
import { drawRemnantOverlay } from "./mapAnimationConstants";

/**
 * マップタイルを描画
 * @param tilesContainer タイルを配置するコンテナ
 * @param map 描画するマップ
 */
export function renderTiles(tilesContainer: Container, map: GameMap): void {
	const removedTiles = tilesContainer.removeChildren();
	for (const child of removedTiles) {
		child.destroy();
	}

	for (let y = 0; y < map.length; y++) {
		const row = map[y];
		for (let x = 0; x < row.length; x++) {
			const tile = row[x];
			const pixelPos = gridToPixel({ x, y });
			const sprite = new Sprite(getTileTexture(tile.type));
			sprite.x = pixelPos.x;
			sprite.y = pixelPos.y;
			sprite.width = CELL_SIZE;
			sprite.height = CELL_SIZE;
			tilesContainer.addChild(sprite);
		}
	}
}

/**
 * 残骸オーバーレイを描画
 * @param remnantsGraphics 残骸描画用Graphicsオブジェクト
 * @param remnants 残骸情報
 */
export function renderRemnants(
	remnantsGraphics: Graphics,
	remnants: Record<string, number>,
): void {
	remnantsGraphics.clear();

	for (const [key, count] of Object.entries(remnants)) {
		const [xStr, yStr] = key.split(",");
		const gx = Number(xStr);
		const gy = Number(yStr);
		if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;

		const pixelPos = gridToPixel({ x: gx, y: gy });
		drawRemnantOverlay(remnantsGraphics, pixelPos.x, pixelPos.y, count);
	}
}

/**
 * Fog of Warオーバーレイを描画
 * 未訪問タイルを黒い矩形で覆い、内容を隠す
 * @param fogGraphics Fog描画用Graphicsオブジェクト
 * @param map 描画するマップ
 * @param visitedTiles 訪問済みタイル
 */
export function renderFog(
	fogGraphics: Graphics,
	map: GameMap,
	visitedTiles: Set<string>,
): void {
	fogGraphics.clear();
	for (let y = 0; y < map.length; y++) {
		const row = map[y];
		for (let x = 0; x < row.length; x++) {
			if (!visitedTiles.has(`${x},${y}`)) {
				const pixelPos = gridToPixel({ x, y });
				fogGraphics.rect(pixelPos.x, pixelPos.y, CELL_SIZE, CELL_SIZE);
				fogGraphics.fill(0x000000);
			}
		}
	}
}
