/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics } from "pixi.js";
import { CELL_SIZE, COLORS } from "../constants";
import type {
	Direction,
	Enemy,
	GameMap,
	Player,
	Position,
	TileType,
} from "../types";
import { DIRECTION_DELTA } from "../types";
import { Easing, tween } from "../utils/tween";
import { gridToPixel } from "./coordinates";

/** プレイヤー移動アニメーションの時間（ms） */
const PLAYER_MOVE_DURATION = 150;

/** 壁バンプアニメーションの移動距離（px） */
const BUMP_DISTANCE = 12;

/** 壁バンプアニメーションの往路時間（ms） */
const BUMP_FORWARD_DURATION = 60;

/** 壁バンプアニメーションの復路時間（ms） */
const BUMP_BACK_DURATION = 80;

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
	private isPlayerInitialized = false;

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
	 * プレイヤーのグラフィックスを初期化（1回だけ）
	 */
	private initPlayerGraphics(): void {
		if (this.isPlayerInitialized) return;

		this.playerGraphics.clear();
		const padding = 8;
		const size = CELL_SIZE - padding * 2;

		// ローカル座標でセル中心に円を描画
		this.playerGraphics.circle(CELL_SIZE / 2, CELL_SIZE / 2, size / 2);
		this.playerGraphics.fill(COLORS.player);
		this.isPlayerInitialized = true;
	}

	/**
	 * プレイヤーを描画
	 */
	renderPlayer(player: Player): void {
		this.initPlayerGraphics();

		const pixelPos = gridToPixel(player.position);
		this.playerGraphics.x = pixelPos.x;
		this.playerGraphics.y = pixelPos.y;
	}

	/**
	 * プレイヤー移動アニメーション
	 * @param targetGridPos 移動先のグリッド座標
	 */
	async animatePlayerMove(targetGridPos: Position): Promise<void> {
		this.initPlayerGraphics();

		const targetPixel = gridToPixel(targetGridPos);
		await tween(
			this.playerGraphics,
			{ x: targetPixel.x, y: targetPixel.y },
			{ duration: PLAYER_MOVE_DURATION, easing: Easing.easeOutCubic },
		);
	}

	/**
	 * 壁にぶつかった時のバンプアニメーション
	 * @param direction ぶつかった方向
	 */
	async animatePlayerBump(direction: Direction): Promise<void> {
		this.initPlayerGraphics();

		const delta = DIRECTION_DELTA[direction];
		const originX = this.playerGraphics.x;
		const originY = this.playerGraphics.y;

		// 壁方向に少しだけ移動
		await tween(
			this.playerGraphics,
			{
				x: originX + delta.x * BUMP_DISTANCE,
				y: originY + delta.y * BUMP_DISTANCE,
			},
			{ duration: BUMP_FORWARD_DURATION, easing: Easing.easeOut },
		);
		// 元の位置に跳ね返る
		await tween(
			this.playerGraphics,
			{ x: originX, y: originY },
			{ duration: BUMP_BACK_DURATION, easing: Easing.easeOutCubic },
		);
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
	 * @param skipPlayer trueの場合、プレイヤー描画をスキップ（アニメーション中に使用）
	 */
	render(
		map: GameMap,
		player: Player,
		enemies: Enemy[],
		skipPlayer = false,
	): void {
		this.renderMap(map);
		if (!skipPlayer) {
			this.renderPlayer(player);
		}
		this.renderEnemies(enemies);
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.tilesGraphics.clear();
		this.playerGraphics.clear();
		this.isPlayerInitialized = false;
		this.enemiesContainer.removeChildren();
	}
}
