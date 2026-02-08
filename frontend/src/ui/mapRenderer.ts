/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics, Text, Ticker } from "pixi.js";
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
import type { EnemyType } from "../types/character";
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

/** ダメージポップアップの色（赤） */
const DAMAGE_POPUP_COLOR = 0xff4444;

/** ダメージポップアップのフォントサイズ */
const DAMAGE_POPUP_FONT_SIZE = 20;

/** ダメージポップアップの上昇距離（px） */
const DAMAGE_POPUP_RISE = 24;

/** ダメージポップアップのアニメーション時間（ms） */
const DAMAGE_POPUP_DURATION = 600;

/** ミスポップアップの色（グレー） */
const MISS_POPUP_COLOR = 0xaaaaaa;

/** ミスポップアップのフォントサイズ */
const MISS_POPUP_FONT_SIZE = 18;

/** ミスポップアップの上昇距離（px） */
const MISS_POPUP_RISE = 20;

/** ミスポップアップのアニメーション時間（ms） */
const MISS_POPUP_DURATION = 500;

/** 敵撃破アニメーションの時間（ms） */
const DEFEAT_DURATION = 400;

/** 敵撃破アニメーションの回転量（180度） */
const DEFEAT_ROTATION = Math.PI;

/** 敵タイプ別パディング（セルサイズからの余白） */
const ENEMY_PADDING = {
	normal: 12, // 標準サイズ
	heavy: 8, // 大きめ（パディング小）
	scout: 16, // 小さめ（パディング大）
} as const;

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
		case "trap":
			return COLORS.trap;
		case "treasure":
			return COLORS.treasure;
		case "rest_area":
			return COLORS.restArea;
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
	private playerGridPos: Position = { x: 0, y: 0 };
	private enemyGridPosMap: Map<string, Position> = new Map();

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

		this.playerGridPos = player.position;
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
	 * 敵タイプに応じた色を取得
	 */
	private getEnemyColor(type: EnemyType): number {
		switch (type) {
			case "normal":
				return COLORS.enemyNormal;
			case "heavy":
				return COLORS.enemyHeavy;
			case "scout":
				return COLORS.enemyScout;
			default:
				return COLORS.enemyNormal;
		}
	}

	/**
	 * 敵のGraphicsを作成（ローカル座標ベース）
	 * @param type 敵タイプ
	 */
	private createEnemyGraphics(type: EnemyType): Graphics {
		const graphics = new Graphics();
		const padding = ENEMY_PADDING[type];
		const size = CELL_SIZE - padding * 2;
		const color = this.getEnemyColor(type);

		// ローカル座標でセル内に四角を描画
		graphics.rect(padding, padding, size, size);
		graphics.fill(color);

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
				this.enemyGridPosMap.delete(id);
			}
		}

		// 各敵のGraphicsを更新または作成
		for (const enemy of enemies) {
			let graphics = this.enemyGraphicsMap.get(enemy.id);
			if (!graphics) {
				graphics = this.createEnemyGraphics(enemy.type);
				this.enemyGraphicsMap.set(enemy.id, graphics);
				this.enemiesContainer.addChild(graphics);
			}

			this.enemyGridPosMap.set(enemy.id, enemy.position);
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
	 * ダメージ数値ポップアップアニメーション
	 * 対象セルの中央上部に赤字で「-N」を表示し、上昇しながらフェードアウト
	 * @param gridPos 対象のグリッド座標
	 * @param damage ダメージ量
	 */
	async animateDamagePopup(gridPos: Position, damage: number): Promise<void> {
		const pixelPos = gridToPixel(gridPos);
		const text = new Text({
			text: `-${damage}`,
			style: {
				fontSize: DAMAGE_POPUP_FONT_SIZE,
				fontWeight: "bold",
				fill: DAMAGE_POPUP_COLOR,
			},
		});

		// セル上端にテキスト下端が来るように中央下アンカーで配置
		text.anchor.set(0.5, 1);
		text.x = pixelPos.x + CELL_SIZE / 2;
		text.y = pixelPos.y;

		this.container.addChild(text);

		await tween(
			text,
			{ y: text.y - DAMAGE_POPUP_RISE, alpha: 0 },
			{ duration: DAMAGE_POPUP_DURATION },
		);

		this.container.removeChild(text);
		text.destroy();
	}

	/**
	 * プレイヤー攻撃のヒットアニメーション
	 * 敵タイルの白フラッシュ + 画面シェイク + ダメージポップアップ
	 * @param enemyId ヒットした敵のID
	 * @param damage ダメージ量
	 */
	async animateAttackHit(enemyId: string, damage: number): Promise<void> {
		const enemyGraphics = this.enemyGraphicsMap.get(enemyId);
		if (!enemyGraphics) return;

		const enemyGridPos = this.enemyGridPosMap.get(enemyId);

		await Promise.all([
			this.animateFlash(enemyGraphics),
			this.animateScreenShake(),
			...(enemyGridPos ? [this.animateDamagePopup(enemyGridPos, damage)] : []),
		]);
	}

	/**
	 * 敵撃破アニメーション
	 * 縮小 + 透明化 + 回転の複合アニメーションで消滅演出
	 * @param enemyId 撃破された敵のID
	 */
	async animateEnemyDefeat(enemyId: string): Promise<void> {
		const graphics = this.enemyGraphicsMap.get(enemyId);
		if (!graphics) return;

		// pivotを中心に設定し、座標を補正
		graphics.pivot.set(CELL_SIZE / 2, CELL_SIZE / 2);
		graphics.x += CELL_SIZE / 2;
		graphics.y += CELL_SIZE / 2;

		await tween(
			graphics,
			{ scaleX: 0, scaleY: 0, alpha: 0, rotation: DEFEAT_ROTATION },
			{ duration: DEFEAT_DURATION, easing: Easing.easeInOut },
		);

		// Graphics削除
		this.enemiesContainer.removeChild(graphics);
		graphics.destroy();
		this.enemyGraphicsMap.delete(enemyId);
		this.enemyGridPosMap.delete(enemyId);
	}

	/**
	 * 敵攻撃のヒットアニメーション
	 * フラッシュ + シェイク + ダメージポップアップ完了後にプレイヤー点滅
	 * @param damage ダメージ量
	 */
	async animateEnemyAttackHit(damage: number): Promise<void> {
		await Promise.all([
			this.animateFlash(this.playerGraphics),
			this.animateScreenShake(),
			this.animateDamagePopup(this.playerGridPos, damage),
		]);
		await this.animatePlayerBlink();
	}

	/**
	 * ミスポップアップアニメーション
	 * 対象セルの中央上部にグレー文字で「MISS」を表示し、上昇しながらフェードアウト
	 * @param gridPos 対象のグリッド座標
	 */
	async animateMissPopup(gridPos: Position): Promise<void> {
		const pixelPos = gridToPixel(gridPos);
		const text = new Text({
			text: "MISS",
			style: {
				fontSize: MISS_POPUP_FONT_SIZE,
				fontWeight: "bold",
				fontStyle: "italic",
				fill: MISS_POPUP_COLOR,
			},
		});

		text.anchor.set(0.5, 1);
		text.x = pixelPos.x + CELL_SIZE / 2;
		text.y = pixelPos.y;

		this.container.addChild(text);

		await tween(
			text,
			{ y: text.y - MISS_POPUP_RISE, alpha: 0 },
			{ duration: MISS_POPUP_DURATION },
		);

		this.container.removeChild(text);
		text.destroy();
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
		this.enemyGridPosMap.clear();
	}
}
