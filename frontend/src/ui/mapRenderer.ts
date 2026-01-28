/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics } from "pixi.js";
import { CELL_SIZE, COLORS } from "../constants";
import type { Enemy, GameMap, Player, TileType } from "../types";
import { gridToPixel } from "./coordinates";

/**
 * タイル種別に対応する色を取得
 */
function getTileColor(type: TileType): number {
	switch (type) {
		case "floor":
			return COLORS.floor;
		case "wall":
			return COLORS.wall;
		case "stairs":
			return COLORS.stairs;
		default:
			return COLORS.floor;
	}
}

/**
 * マップレンダラー
 * マップ・プレイヤー・敵の描画を管理
 */
export class MapRenderer {
	private container: Container;
	private tilesGraphics: Graphics;
	private playerGraphics: Graphics;
	private enemiesContainer: Container;

	constructor() {
		this.container = new Container();
		this.tilesGraphics = new Graphics();
		this.playerGraphics = new Graphics();
		this.enemiesContainer = new Container();

		this.container.addChild(this.tilesGraphics);
		this.container.addChild(this.enemiesContainer);
		this.container.addChild(this.playerGraphics);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * マップを描画
	 */
	renderMap(map: GameMap): void {
		this.tilesGraphics.clear();

		for (let y = 0; y < map.length; y++) {
			const row = map[y];
			for (let x = 0; x < row.length; x++) {
				const tile = row[x];
				const pixelPos = gridToPixel({ x, y });
				const color = getTileColor(tile.type);

				this.tilesGraphics.rect(pixelPos.x, pixelPos.y, CELL_SIZE, CELL_SIZE);
				this.tilesGraphics.fill(color);
			}
		}
	}

	/**
	 * プレイヤーを描画
	 */
	renderPlayer(player: Player): void {
		this.playerGraphics.clear();

		const pixelPos = gridToPixel(player.position);
		const padding = 8;
		const size = CELL_SIZE - padding * 2;

		// プレイヤーを円で描画
		this.playerGraphics.circle(
			pixelPos.x + CELL_SIZE / 2,
			pixelPos.y + CELL_SIZE / 2,
			size / 2,
		);
		this.playerGraphics.fill(COLORS.player);
	}

	/**
	 * 敵を描画
	 */
	renderEnemies(enemies: Enemy[]): void {
		this.enemiesContainer.removeChildren();

		for (const enemy of enemies) {
			const graphics = new Graphics();
			const pixelPos = gridToPixel(enemy.position);
			const padding = 12;
			const size = CELL_SIZE - padding * 2;

			// 敵を四角で描画
			graphics.rect(pixelPos.x + padding, pixelPos.y + padding, size, size);
			graphics.fill(COLORS.enemy);

			this.enemiesContainer.addChild(graphics);
		}
	}

	/**
	 * 全体を描画（マップ・プレイヤー・敵）
	 */
	render(map: GameMap, player: Player, enemies: Enemy[]): void {
		this.renderMap(map);
		this.renderPlayer(player);
		this.renderEnemies(enemies);
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.tilesGraphics.clear();
		this.playerGraphics.clear();
		this.enemiesContainer.removeChildren();
	}
}
