/**
 * デバッグ用ターゲット選択UI（DEV環境限定）
 * マップ上にクリッカブルなハイライトオーバーレイを配置
 */

import { Container, Graphics, Text } from "pixi.js";
import { CELL_SIZE } from "../constants";
import { positionToKey } from "../game/positionUtils";
import type { Enemy, GameMap, Position } from "../types";
import { gridToPixel } from "./coordinates";
import { makeInteractive } from "./graphicsHelpers";

/** ハイライト色 */
const ENEMY_HIGHLIGHT_COLOR = 0xff4444;
const TILE_HIGHLIGHT_COLOR = 0x44ff44;
const HIGHLIGHT_ALPHA = 0.4;

/** キャンセルボタン定数 */
const CANCEL_BUTTON_WIDTH = 80;
const CANCEL_BUTTON_HEIGHT = 28;

/**
 * デバッグ用ターゲット選択UI
 */
export class DebugTargetSelector {
	private container: Container;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	getContainer(): Container {
		return this.container;
	}

	/**
	 * 敵選択モードを表示
	 */
	showEnemySelector(
		enemies: Enemy[],
		onSelect: (enemyId: string) => void,
		onCancel: () => void,
	): void {
		this.container.removeChildren();
		this.container.visible = true;

		for (const enemy of enemies) {
			const highlight = this.createHighlight(
				enemy.position,
				ENEMY_HIGHLIGHT_COLOR,
			);
			makeInteractive(highlight, () => {
				this.hide();
				Promise.resolve(onSelect(enemy.id)).catch(console.error);
			});
			this.container.addChild(highlight);
		}

		this.addCancelButton(onCancel);
	}

	/**
	 * タイル選択モードを表示
	 * 壁・敵位置・プレイヤー位置を除外した床タイルをハイライト
	 */
	showTileSelector(
		map: GameMap,
		enemies: Enemy[],
		playerPos: Position,
		onSelect: (pos: Position) => void,
		onCancel: () => void,
	): void {
		this.container.removeChildren();
		this.container.visible = true;

		const enemyPositions = new Set(
			enemies.map((e) => positionToKey(e.position)),
		);
		const playerKey = positionToKey(playerPos);

		for (let y = 0; y < map.length; y++) {
			for (let x = 0; x < map[y].length; x++) {
				const tile = map[y][x];
				if (tile.type === "wall") continue;
				const key = positionToKey({ x, y });
				if (key === playerKey) continue;
				if (enemyPositions.has(key)) continue;

				const highlight = this.createHighlight({ x, y }, TILE_HIGHLIGHT_COLOR);
				makeInteractive(highlight, () => {
					this.hide();
					Promise.resolve(onSelect({ x, y })).catch(console.error);
				});
				this.container.addChild(highlight);
			}
		}

		this.addCancelButton(onCancel);
	}

	hide(): void {
		this.container.visible = false;
		this.container.removeChildren();
	}

	private createHighlight(pos: Position, color: number): Graphics {
		const pixel = gridToPixel(pos);
		const g = new Graphics();
		g.rect(pixel.x, pixel.y, CELL_SIZE, CELL_SIZE);
		g.fill({ color, alpha: HIGHLIGHT_ALPHA });
		g.rect(pixel.x, pixel.y, CELL_SIZE, CELL_SIZE);
		g.stroke({ color, width: 2 });
		return g;
	}

	private addCancelButton(onCancel: () => void): void {
		const btn = new Container();
		btn.x = 8;
		btn.y = 8;

		const bg = new Graphics();
		bg.roundRect(0, 0, CANCEL_BUTTON_WIDTH, CANCEL_BUTTON_HEIGHT, 4);
		bg.fill(0x8c2a2a);
		bg.roundRect(0, 0, CANCEL_BUTTON_WIDTH, CANCEL_BUTTON_HEIGHT, 4);
		bg.stroke({ color: 0xca4a4a, width: 1 });
		btn.addChild(bg);

		const text = new Text({
			text: "キャンセル",
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = CANCEL_BUTTON_WIDTH / 2;
		text.y = CANCEL_BUTTON_HEIGHT / 2;
		btn.addChild(text);

		makeInteractive(btn, () => {
			this.hide();
			onCancel();
		});

		this.container.addChild(btn);
	}
}
