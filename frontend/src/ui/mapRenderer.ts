/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics, Ticker } from "pixi.js";
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
import type { EnemyMove } from "./enemyMoveDetector";

/** プレイヤー移動アニメーションの時間（ms） */
const PLAYER_MOVE_DURATION = 150;

/** 壁バンプアニメーションの移動距離（px） */
const BUMP_DISTANCE = 12;

/** 壁バンプアニメーションの往路時間（ms） */
const BUMP_FORWARD_DURATION = 60;

/** 壁バンプアニメーションの復路時間（ms） */
const BUMP_BACK_DURATION = 80;

/** 敵移動アニメーションの時間（ms） */
const ENEMY_MOVE_DURATION = 150;

/** 敵移動アニメーションのスタッガー遅延（ms） */
const ENEMY_MOVE_STAGGER_DELAY = 50;

/** 白フラッシュのフェードアウト時間（ms） */
const FLASH_DURATION = 200;

/** 白フラッシュの色 */
const FLASH_COLOR = 0xffffff;

/** 画面シェイクの時間（ms） */
const SCREEN_SHAKE_DURATION = 200;

/** 画面シェイクの振幅（px） */
const SCREEN_SHAKE_INTENSITY = 4;

/** プレイヤー被ダメージ時の点滅回数 */
const PLAYER_BLINK_COUNT = 3;

/** プレイヤー被ダメージ時の1回の点滅時間（ms） */
const PLAYER_BLINK_INTERVAL = 80;

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
	private enemyGraphicsMap: Map<string, Graphics> = new Map();

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
	 * 敵移動アニメーション
	 * @param moves 移動情報の配列
	 */
	async animateEnemyMoves(moves: EnemyMove[]): Promise<void> {
		const tweens: Promise<void>[] = [];

		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			const graphics = this.enemyGraphicsMap.get(move.id);
			if (!graphics) continue;

			// from位置にセット
			const fromPixel = gridToPixel(move.from);
			graphics.x = fromPixel.x;
			graphics.y = fromPixel.y;

			// to位置へアニメーション（スタッガー付き）
			const toPixel = gridToPixel(move.to);
			tweens.push(
				tween(
					graphics,
					{ x: toPixel.x, y: toPixel.y },
					{
						duration: ENEMY_MOVE_DURATION,
						easing: Easing.easeOutCubic,
						delay: i * ENEMY_MOVE_STAGGER_DELAY,
					},
				),
			);
		}

		await Promise.all(tweens);
	}

	/**
	 * 敵のGraphicsを作成（ローカル座標ベース）
	 */
	private createEnemyGraphics(): Graphics {
		const graphics = new Graphics();
		const padding = 12;
		const size = CELL_SIZE - padding * 2;

		// ローカル座標でセル内に四角を描画
		graphics.rect(padding, padding, size, size);
		graphics.fill(COLORS.enemy);

		return graphics;
	}

	/**
	 * 敵を描画（永続管理）
	 */
	renderEnemies(enemies: Enemy[]): void {
		const currentIds = new Set(enemies.map((e) => e.id));

		// 不要になった敵のGraphicsを削除
		for (const [id, graphics] of this.enemyGraphicsMap) {
			if (!currentIds.has(id)) {
				this.enemiesContainer.removeChild(graphics);
				graphics.destroy();
				this.enemyGraphicsMap.delete(id);
			}
		}

		// 各敵のGraphicsを更新または作成
		for (const enemy of enemies) {
			let graphics = this.enemyGraphicsMap.get(enemy.id);
			if (!graphics) {
				graphics = this.createEnemyGraphics();
				this.enemyGraphicsMap.set(enemy.id, graphics);
				this.enemiesContainer.addChild(graphics);
			}

			const pixelPos = gridToPixel(enemy.position);
			graphics.x = pixelPos.x;
			graphics.y = pixelPos.y;
		}
	}

	/**
	 * 対象に白フラッシュエフェクトを適用
	 * 白い矩形オーバーレイをフェードアウトさせる
	 */
	private async animateFlash(targetGraphics: Graphics): Promise<void> {
		const parent = targetGraphics.parent;
		if (!parent) return;

		const overlay = new Graphics();
		overlay.rect(0, 0, CELL_SIZE, CELL_SIZE);
		overlay.fill(FLASH_COLOR);
		overlay.x = targetGraphics.x;
		overlay.y = targetGraphics.y;
		parent.addChild(overlay);

		await tween(overlay, { alpha: 0 }, { duration: FLASH_DURATION });

		parent.removeChild(overlay);
		overlay.destroy();
	}

	/**
	 * 画面全体のシェイクエフェクト
	 * コンテナのx,yをランダムにオフセットして振動させる
	 */
	private animateScreenShake(): Promise<void> {
		return new Promise((resolve) => {
			const originX = this.container.x;
			const originY = this.container.y;
			let elapsed = 0;
			const ticker = Ticker.shared;

			const update = (tick: Ticker): void => {
				elapsed += tick.deltaMS;

				if (elapsed >= SCREEN_SHAKE_DURATION) {
					this.container.x = originX;
					this.container.y = originY;
					ticker.remove(update);
					resolve();
					return;
				}

				const decay = 1 - elapsed / SCREEN_SHAKE_DURATION;
				const intensity = SCREEN_SHAKE_INTENSITY * decay;
				this.container.x = originX + (Math.random() * 2 - 1) * intensity;
				this.container.y = originY + (Math.random() * 2 - 1) * intensity;
			};

			ticker.add(update);
		});
	}

	/**
	 * プレイヤー被ダメージ時の点滅エフェクト
	 * playerGraphicsのalphaを複数回点滅させる
	 */
	private async animatePlayerBlink(): Promise<void> {
		for (let i = 0; i < PLAYER_BLINK_COUNT; i++) {
			await tween(
				this.playerGraphics,
				{ alpha: 0.2 },
				{ duration: PLAYER_BLINK_INTERVAL / 2 },
			);
			await tween(
				this.playerGraphics,
				{ alpha: 1 },
				{ duration: PLAYER_BLINK_INTERVAL / 2 },
			);
		}
		this.playerGraphics.alpha = 1;
	}

	/**
	 * プレイヤー攻撃のヒットアニメーション
	 * 敵タイルの白フラッシュ + 画面シェイク
	 * @param enemyId ヒットした敵のID
	 */
	async animateAttackHit(enemyId: string): Promise<void> {
		const enemyGraphics = this.enemyGraphicsMap.get(enemyId);
		if (!enemyGraphics) return;

		await Promise.all([
			this.animateFlash(enemyGraphics),
			this.animateScreenShake(),
		]);
	}

	/**
	 * 敵攻撃のヒットアニメーション
	 * プレイヤーの白フラッシュ + 画面シェイク + プレイヤー点滅
	 */
	async animateEnemyAttackHit(): Promise<void> {
		await Promise.all([
			this.animateFlash(this.playerGraphics),
			this.animateScreenShake(),
			this.animatePlayerBlink(),
		]);
	}

	/**
	 * 全体を描画（マップ・プレイヤー・敵）
	 * @param skipPlayer trueの場合、プレイヤー描画をスキップ（アニメーション中に使用）
	 * @param skipEnemies trueの場合、敵描画をスキップ（敵移動アニメーション中に使用）
	 */
	render(
		map: GameMap,
		player: Player,
		enemies: Enemy[],
		skipPlayer = false,
		skipEnemies = false,
	): void {
		this.renderMap(map);
		if (!skipPlayer) {
			this.renderPlayer(player);
		}
		if (!skipEnemies) {
			this.renderEnemies(enemies);
		}
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.tilesGraphics.clear();
		this.playerGraphics.clear();
		this.isPlayerInitialized = false;
		this.enemiesContainer.removeChildren();
		for (const graphics of this.enemyGraphicsMap.values()) {
			graphics.destroy();
		}
		this.enemyGraphicsMap.clear();
	}
}
