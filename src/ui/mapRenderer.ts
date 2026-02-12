/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics, Sprite, Text, Texture, Ticker } from "pixi.js";
import { CELL_SIZE, COLORS } from "../constants";
import type {
	Direction,
	Enemy,
	GameMap,
	Player,
	Position,
	SpecialTileType,
} from "../types";
import { DIRECTION_DELTA } from "../types";
import type { EnemyType } from "../types/character";
import { Easing, tween } from "../utils/tween";
import {
	getEnemyTexture,
	getPlayerTexture,
	getTileTexture,
} from "./assetLoader";
import { getViewportPixelSize, gridToPixel } from "./coordinates";
import type { EnemyMove } from "./enemyMoveDetector";
import { EnemyTooltip } from "./enemyTooltip";
import {
	BASE_SHAKE_INTENSITY,
	calcPopupFontSize,
	calcScreenShakeIntensity,
} from "./popupLogic";
import { SkillForecastEffectManager } from "./skillForecastEffect";
import { SpecialTileEffectManager } from "./specialTileEffect";

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

/** プレイヤー被ダメージ時の点滅回数 */
const PLAYER_BLINK_COUNT = 3;

/** プレイヤー被ダメージ時の1回の点滅時間（ms） */
const PLAYER_BLINK_INTERVAL = 80;

/** ダメージポップアップの上昇距離（px） */
const DAMAGE_POPUP_RISE = 28;

/** ダメージポップアップのアニメーション時間（ms） */
const DAMAGE_POPUP_DURATION = 600;

/** ダメージポップアップのアウトライン幅 */
const DAMAGE_POPUP_STROKE_WIDTH = 3;

/** ダメージポップアップのアウトライン色 */
const DAMAGE_POPUP_STROKE_COLOR = 0x000000;

/** ポップアップ種別 */
export type PopupType = "damage" | "heal" | "trap_damage";

/** ポップアップ種別ごとの色 */
const POPUP_COLORS: Record<PopupType, number> = {
	damage: 0xff4444,
	heal: 0x44cc66,
	trap_damage: 0xff8844,
};

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
const ENEMY_PADDING: Record<EnemyType, number> = {
	normal: 12, // 標準サイズ
	heavy: 8, // 大きめ（パディング小）
	scout: 16, // 小さめ（パディング大）
	miniboss: 6, // heavyより大きい
	boss: 4, // 最大サイズ
};

/** HPバーの高さ（px） */
const HP_BAR_HEIGHT = 6;

/** HPバー背景色 */
const HP_BAR_BG_COLOR = 0x333333;

/** 残骸パーティクルの色 */
const REMNANT_COLOR = 0x999999;

/** 残骸パーティクルの透明度 */
const REMNANT_ALPHA = 0.4;

/** 残骸パーティクルの最小半径 */
const REMNANT_MIN_RADIUS = 2;

/** 残骸パーティクルの最大半径 */
const REMNANT_MAX_RADIUS = 4;

/**
 * 決定的な疑似乱数を生成（座標ベース）
 */
function seededRandom(seed: number): number {
	const x = Math.sin(seed * 9301 + 49297) * 233280;
	return x - Math.floor(x);
}

/**
 * 残骸オーバーレイを描画
 * 撃破数に応じてパーティクル風のドットを散らして描画
 */
function drawRemnantOverlay(
	g: Graphics,
	px: number,
	py: number,
	count: number,
): void {
	// 撃破数に応じたパーティクル数: 1→2, 2→4, 3+→6（上限）
	const particleCount = Math.min(count * 2, 6);
	const margin = 8;
	const areaSize = CELL_SIZE - margin * 2;

	for (let i = 0; i < particleCount; i++) {
		const seed = px * 1000 + py * 100 + i;
		const rx = seededRandom(seed);
		const ry = seededRandom(seed + 1);
		const rr = seededRandom(seed + 2);

		const cx = px + margin + rx * areaSize;
		const cy = py + margin + ry * areaSize;
		const radius =
			REMNANT_MIN_RADIUS + rr * (REMNANT_MAX_RADIUS - REMNANT_MIN_RADIUS);

		g.circle(cx, cy, radius);
		g.fill({ color: REMNANT_COLOR, alpha: REMNANT_ALPHA });
	}
}

/**
 * マップレンダラー
 * マップ・プレイヤー・敵の描画を管理
 */
export class MapRenderer {
	private container: Container;
	private tilesContainer: Container;
	private remnantsGraphics: Graphics;
	private playerSprite: Sprite;
	private enemiesContainer: Container;
	private fogGraphics: Graphics;
	private isPlayerInitialized = false;
	private enemyContainerMap: Map<string, Container> = new Map();
	private enemyHpBarMap: Map<string, Graphics> = new Map();
	private enemyTypeMap: Map<string, EnemyType> = new Map();
	private playerGridPos: Position = { x: 0, y: 0 };
	private enemyGridPosMap: Map<string, Position> = new Map();
	private enemyDataMap: Map<string, Enemy> = new Map();
	private lastRenderedMap: GameMap | null = null;
	private enemyTooltip: EnemyTooltip;
	private tooltipEnemyId: string | null = null;
	private specialTileEffectManager: SpecialTileEffectManager;
	private skillForecastEffectManager: SkillForecastEffectManager;

	constructor() {
		this.container = new Container();
		this.tilesContainer = new Container();
		this.remnantsGraphics = new Graphics();
		this.playerSprite = new Sprite();
		this.enemiesContainer = new Container();
		this.fogGraphics = new Graphics();
		this.enemyTooltip = new EnemyTooltip();
		this.specialTileEffectManager = new SpecialTileEffectManager();
		this.skillForecastEffectManager = new SkillForecastEffectManager();

		this.container.addChild(this.tilesContainer);
		this.container.addChild(this.specialTileEffectManager.getContainer());
		this.container.addChild(this.remnantsGraphics);
		this.container.addChild(
			this.skillForecastEffectManager.getRangeContainer(),
		);
		this.container.addChild(this.enemiesContainer);
		this.container.addChild(this.skillForecastEffectManager.getIconContainer());
		this.container.addChild(this.fogGraphics);
		this.container.addChild(this.playerSprite);
		this.container.addChild(this.enemyTooltip.getContainer());
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * マップを描画
	 * 同一マップ参照の場合はスキップし、不要なSprite再生成を回避する
	 */
	renderMap(map: GameMap): void {
		if (this.lastRenderedMap === map) return;
		this.lastRenderedMap = map;

		const removedTiles = this.tilesContainer.removeChildren();
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
				this.tilesContainer.addChild(sprite);
			}
		}
	}

	/**
	 * プレイヤースプライトを初期化（1回だけ）
	 */
	private initPlayerSprite(): void {
		if (this.isPlayerInitialized) return;

		this.playerSprite.texture = getPlayerTexture();
		this.playerSprite.width = CELL_SIZE;
		this.playerSprite.height = CELL_SIZE;
		this.isPlayerInitialized = true;
	}

	/**
	 * プレイヤーを描画
	 */
	renderPlayer(player: Player): void {
		this.initPlayerSprite();

		this.playerGridPos = player.position;
		const pixelPos = gridToPixel(player.position);
		this.playerSprite.x = pixelPos.x;
		this.playerSprite.y = pixelPos.y;
	}

	/**
	 * プレイヤー移動アニメーション
	 * @param targetGridPos 移動先のグリッド座標
	 */
	async animatePlayerMove(targetGridPos: Position): Promise<void> {
		this.initPlayerSprite();

		const targetPixel = gridToPixel(targetGridPos);
		await tween(
			this.playerSprite,
			{ x: targetPixel.x, y: targetPixel.y },
			{ duration: PLAYER_MOVE_DURATION, easing: Easing.easeOutCubic },
		);
	}

	/**
	 * 壁にぶつかった時のバンプアニメーション
	 * @param direction ぶつかった方向
	 */
	async animatePlayerBump(direction: Direction): Promise<void> {
		this.initPlayerSprite();

		const delta = DIRECTION_DELTA[direction];
		const originX = this.playerSprite.x;
		const originY = this.playerSprite.y;

		// 壁方向に少しだけ移動
		await tween(
			this.playerSprite,
			{
				x: originX + delta.x * BUMP_DISTANCE,
				y: originY + delta.y * BUMP_DISTANCE,
			},
			{ duration: BUMP_FORWARD_DURATION, easing: Easing.easeOut },
		);
		// 元の位置に跳ね返る
		await tween(
			this.playerSprite,
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
			const enemyContainer = this.enemyContainerMap.get(move.id);
			if (!enemyContainer) continue;

			// from位置にセット
			const fromPixel = gridToPixel(move.from);
			enemyContainer.x = fromPixel.x;
			enemyContainer.y = fromPixel.y;

			// to位置へアニメーション（スタッガー付き）
			const toPixel = gridToPixel(move.to);
			tweens.push(
				tween(
					enemyContainer,
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
	 * 敵タイプに応じた色を取得（HPバー描画用）
	 */
	private getEnemyColor(type: EnemyType): number {
		switch (type) {
			case "normal":
				return COLORS.enemyNormal;
			case "heavy":
				return COLORS.enemyHeavy;
			case "scout":
				return COLORS.enemyScout;
			case "miniboss":
				return COLORS.enemyMiniboss;
			case "boss":
				return COLORS.enemyBoss;
			default:
				return COLORS.enemyNormal;
		}
	}

	/**
	 * 敵1体分のコンテナを作成（Sprite + HPバーを子要素として含む）
	 * コンテナ単位で座標移動するため、アニメーション時にHPバーも追従する
	 */
	private createEnemyContainer(type: EnemyType, enemyId: string): Container {
		const enemyContainer = new Container();
		const sprite = new Sprite(getEnemyTexture(type));
		const padding = ENEMY_PADDING[type];
		const size = CELL_SIZE - padding * 2;

		// ローカル座標でセル内にスプライトを配置
		sprite.x = padding;
		sprite.y = padding;
		sprite.width = size;
		sprite.height = size;
		enemyContainer.addChild(sprite);

		// ホバーイベント設定
		enemyContainer.eventMode = "static";
		enemyContainer.on("pointerover", () => {
			this.showEnemyTooltip(enemyId);
		});
		enemyContainer.on("pointerout", () => {
			this.hideEnemyTooltip();
		});

		return enemyContainer;
	}

	/**
	 * 敵のHPバーを描画・更新
	 * HPバーは敵コンテナの子要素として配置（移動アニメーションに追従）
	 */
	private renderHpBar(enemy: Enemy): void {
		let hpBar = this.enemyHpBarMap.get(enemy.id);
		const enemyContainer = this.enemyContainerMap.get(enemy.id);
		if (!enemyContainer) return;

		if (!hpBar) {
			hpBar = new Graphics();
			this.enemyHpBarMap.set(enemy.id, hpBar);
			enemyContainer.addChild(hpBar);
		}

		const padding = ENEMY_PADDING[enemy.type];
		const barWidth = CELL_SIZE - padding * 2;
		const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
		const barY = padding - HP_BAR_HEIGHT - 2;

		hpBar.clear();
		// 背景
		hpBar.rect(padding, barY, barWidth, HP_BAR_HEIGHT);
		hpBar.fill(HP_BAR_BG_COLOR);
		// HP部分
		if (hpRatio > 0) {
			const color = this.getEnemyColor(enemy.type);
			hpBar.rect(padding, barY, barWidth * hpRatio, HP_BAR_HEIGHT);
			hpBar.fill(color);
		}
	}

	/**
	 * 敵1体分のコンテナを破棄
	 */
	private destroyEnemyEntry(id: string): void {
		if (this.tooltipEnemyId === id) {
			this.hideEnemyTooltip();
		}
		const enemyContainer = this.enemyContainerMap.get(id);
		if (enemyContainer) {
			this.enemiesContainer.removeChild(enemyContainer);
			enemyContainer.destroy({ children: true });
		}
		this.enemyContainerMap.delete(id);
		this.enemyHpBarMap.delete(id);
		this.enemyTypeMap.delete(id);
		this.enemyGridPosMap.delete(id);
		this.enemyDataMap.delete(id);
	}

	/**
	 * 敵を描画（永続管理）
	 */
	renderEnemies(enemies: Enemy[], visitedTiles?: Set<string>): void {
		const visibleEnemies = visitedTiles
			? enemies.filter((e) =>
					visitedTiles.has(`${e.position.x},${e.position.y}`),
				)
			: enemies;
		const currentIds = new Set(visibleEnemies.map((e) => e.id));

		// 不要になった敵を削除
		for (const id of this.enemyContainerMap.keys()) {
			if (!currentIds.has(id)) {
				this.destroyEnemyEntry(id);
			}
		}

		// 各敵のコンテナを更新または作成
		for (const enemy of visibleEnemies) {
			const prevType = this.enemyTypeMap.get(enemy.id);

			// タイプが変わった場合は再作成
			if (prevType !== undefined && prevType !== enemy.type) {
				this.destroyEnemyEntry(enemy.id);
			}

			let enemyContainer = this.enemyContainerMap.get(enemy.id);
			if (!enemyContainer) {
				enemyContainer = this.createEnemyContainer(enemy.type, enemy.id);
				this.enemyContainerMap.set(enemy.id, enemyContainer);
				this.enemyTypeMap.set(enemy.id, enemy.type);
				this.enemiesContainer.addChild(enemyContainer);
			}

			this.enemyDataMap.set(enemy.id, enemy);
			this.enemyGridPosMap.set(enemy.id, enemy.position);
			const pixelPos = gridToPixel(enemy.position);
			enemyContainer.x = pixelPos.x;
			enemyContainer.y = pixelPos.y;

			// HPバー描画（全敵タイプ）
			this.renderHpBar(enemy);
		}

		// スキル予告エフェクト更新
		const mapWidth = this.lastRenderedMap?.[0]?.length ?? 0;
		const mapHeight = this.lastRenderedMap?.length ?? 0;
		this.skillForecastEffectManager.update(
			visibleEnemies,
			mapWidth,
			mapHeight,
			visitedTiles,
		);
	}

	/**
	 * 対象に白フラッシュエフェクトを適用
	 * 白い矩形オーバーレイをフェードアウトさせる
	 */
	private async animateFlash(target: Container): Promise<void> {
		const parent = target.parent;
		if (!parent) return;

		const overlay = new Graphics();
		overlay.rect(0, 0, CELL_SIZE, CELL_SIZE);
		overlay.fill(FLASH_COLOR);
		overlay.x = target.x;
		overlay.y = target.y;
		parent.addChild(overlay);

		await tween(overlay, { alpha: 0 }, { duration: FLASH_DURATION });

		parent.removeChild(overlay);
		overlay.destroy();
	}

	/**
	 * 画面全体のシェイクエフェクト
	 * コンテナのx,yをランダムにオフセットして振動させる
	 * @param baseIntensity シェイク振幅（省略時はデフォルト値）
	 */
	private animateScreenShake(
		baseIntensity = BASE_SHAKE_INTENSITY,
	): Promise<void> {
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
				const intensity = baseIntensity * decay;
				this.container.x = originX + (Math.random() * 2 - 1) * intensity;
				this.container.y = originY + (Math.random() * 2 - 1) * intensity;
			};

			ticker.add(update);
		});
	}

	/**
	 * プレイヤー被ダメージ時の点滅エフェクト
	 * playerSpriteのalphaを複数回点滅させる
	 */
	private async animatePlayerBlink(): Promise<void> {
		for (let i = 0; i < PLAYER_BLINK_COUNT; i++) {
			await tween(
				this.playerSprite,
				{ alpha: 0.2 },
				{ duration: PLAYER_BLINK_INTERVAL / 2 },
			);
			await tween(
				this.playerSprite,
				{ alpha: 1 },
				{ duration: PLAYER_BLINK_INTERVAL / 2 },
			);
		}
		this.playerSprite.alpha = 1;
	}

	/**
	 * ダメージ/回復数値ポップアップアニメーション
	 * 対象セルの中央上部に数値を表示し、上昇しながらフェードアウト
	 * @param gridPos 対象のグリッド座標
	 * @param amount 数値
	 * @param popupType ポップアップ種別（デフォルト: "damage"）
	 */
	async animateDamagePopup(
		gridPos: Position,
		amount: number,
		popupType: PopupType = "damage",
	): Promise<void> {
		const pixelPos = gridToPixel(gridPos);
		const prefix = popupType === "heal" ? "+" : "-";
		const color = POPUP_COLORS[popupType];

		const fontSize = calcPopupFontSize(amount);
		const text = new Text({
			text: `${prefix}${amount}`,
			style: {
				fontSize,
				fontWeight: "bold",
				fill: color,
				stroke: {
					color: DAMAGE_POPUP_STROKE_COLOR,
					width: DAMAGE_POPUP_STROKE_WIDTH,
				},
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
		const enemyContainer = this.enemyContainerMap.get(enemyId);
		if (!enemyContainer) return;

		const enemyGridPos = this.enemyGridPosMap.get(enemyId);
		const shakeIntensity = calcScreenShakeIntensity(damage);

		await Promise.all([
			this.animateFlash(enemyContainer),
			this.animateScreenShake(shakeIntensity),
			...(enemyGridPos ? [this.animateDamagePopup(enemyGridPos, damage)] : []),
		]);
	}

	/**
	 * 敵撃破アニメーション
	 * 縮小 + 透明化 + 回転の複合アニメーションで消滅演出
	 * @param enemyId 撃破された敵のID
	 */
	async animateEnemyDefeat(enemyId: string): Promise<void> {
		const enemyContainer = this.enemyContainerMap.get(enemyId);
		if (!enemyContainer) return;

		// pivotを中心に設定し、座標を補正
		enemyContainer.pivot.set(CELL_SIZE / 2, CELL_SIZE / 2);
		enemyContainer.x += CELL_SIZE / 2;
		enemyContainer.y += CELL_SIZE / 2;

		await tween(
			enemyContainer,
			{ scaleX: 0, scaleY: 0, alpha: 0, rotation: DEFEAT_ROTATION },
			{ duration: DEFEAT_DURATION, easing: Easing.easeInOut },
		);

		// コンテナごと削除（Sprite + HPバーも含む）
		this.destroyEnemyEntry(enemyId);
	}

	/**
	 * 敵攻撃のヒットアニメーション
	 * フラッシュ + シェイク + ダメージポップアップ完了後にプレイヤー点滅
	 * @param damage ダメージ量
	 */
	async animateEnemyAttackHit(damage: number): Promise<void> {
		const shakeIntensity = calcScreenShakeIntensity(damage);
		await Promise.all([
			this.animateFlash(this.playerSprite),
			this.animateScreenShake(shakeIntensity),
			this.animateDamagePopup(this.playerGridPos, damage),
		]);
		await this.animatePlayerBlink();
	}

	/**
	 * タイル効果のポップアップアニメーション
	 * @param tileType 発動した特殊タイル種別
	 * @param amount 数値（ダメージ量または回復量）
	 * @param gridPos 表示先のグリッド座標（省略時はplayerGridPosを使用）
	 */
	async animateTileEffectPopup(
		tileType: SpecialTileType,
		amount: number,
		gridPos?: Position,
	): Promise<void> {
		const popupType: PopupType = tileType === "trap" ? "trap_damage" : "heal";
		const popupPos = gridPos ?? this.playerGridPos;
		await this.animateDamagePopup(popupPos, amount, popupType);
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
	 * 残骸オーバーレイを描画
	 */
	renderRemnants(remnants: Record<string, number>): void {
		this.remnantsGraphics.clear();

		for (const [key, count] of Object.entries(remnants)) {
			const [xStr, yStr] = key.split(",");
			const gx = Number(xStr);
			const gy = Number(yStr);
			if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;

			const pixelPos = gridToPixel({ x: gx, y: gy });
			drawRemnantOverlay(this.remnantsGraphics, pixelPos.x, pixelPos.y, count);
		}
	}

	/**
	 * Fog of Warオーバーレイを描画
	 * 未訪問タイルを黒い矩形で覆い、内容を隠す
	 */
	renderFog(map: GameMap, visitedTiles: Set<string>): void {
		this.fogGraphics.clear();
		for (let y = 0; y < map.length; y++) {
			const row = map[y];
			for (let x = 0; x < row.length; x++) {
				if (!visitedTiles.has(`${x},${y}`)) {
					const pixelPos = gridToPixel({ x, y });
					this.fogGraphics.rect(pixelPos.x, pixelPos.y, CELL_SIZE, CELL_SIZE);
					this.fogGraphics.fill(0x000000);
				}
			}
		}
	}

	/**
	 * 全体を描画（マップ・プレイヤー・敵）
	 * @param skipPlayer trueの場合、プレイヤー描画をスキップ（アニメーション中に使用）
	 * @param skipEnemies trueの場合、敵描画をスキップ（敵移動アニメーション中に使用）
	 * @param remnants 敵撃破の残骸情報
	 * @param visitedTiles 訪問済みタイル（Fog of War用）
	 */
	render(
		map: GameMap,
		player: Player,
		enemies: Enemy[],
		skipPlayer = false,
		skipEnemies = false,
		remnants: Record<string, number> = {},
		visitedTiles?: Set<string>,
	): void {
		this.renderMap(map);
		this.specialTileEffectManager.update(map, visitedTiles);
		this.renderRemnants(remnants);
		if (!skipPlayer) {
			this.renderPlayer(player);
		}
		if (!skipEnemies) {
			this.renderEnemies(enemies, visitedTiles);
		}
		if (visitedTiles) {
			this.renderFog(map, visitedTiles);
		} else {
			this.fogGraphics.clear();
		}
	}

	/**
	 * クリア
	 */
	clear(): void {
		const removedTiles = this.tilesContainer.removeChildren();
		for (const child of removedTiles) {
			child.destroy();
		}
		this.lastRenderedMap = null;
		this.remnantsGraphics.clear();
		this.fogGraphics.clear();
		this.playerSprite.texture = Texture.EMPTY;
		this.playerSprite.alpha = 1;
		this.isPlayerInitialized = false;
		this.enemiesContainer.removeChildren();
		for (const container of this.enemyContainerMap.values()) {
			container.destroy({ children: true });
		}
		this.enemyContainerMap.clear();
		this.enemyHpBarMap.clear();
		this.enemyTypeMap.clear();
		this.enemyGridPosMap.clear();
		this.enemyDataMap.clear();
		this.hideEnemyTooltip();
		this.specialTileEffectManager.clear();
		this.skillForecastEffectManager.clear();
	}

	/**
	 * 敵ツールチップを表示
	 */
	private showEnemyTooltip(enemyId: string): void {
		const enemy = this.enemyDataMap.get(enemyId);
		const enemyContainer = this.enemyContainerMap.get(enemyId);
		if (!enemy || !enemyContainer) return;

		this.tooltipEnemyId = enemyId;
		const viewport = getViewportPixelSize();
		const containerTransform = {
			x: this.container.x,
			y: this.container.y,
			scale: this.container.scale.x,
		};
		this.enemyTooltip.show(
			enemy,
			enemyContainer.x,
			enemyContainer.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * 表示中の敵ツールチップを現在のコンテナ変換で再配置
	 * カメラオフセット/ズーム変更後に呼び出す
	 */
	repositionEnemyTooltip(): void {
		if (!this.tooltipEnemyId) return;

		const enemyContainer = this.enemyContainerMap.get(this.tooltipEnemyId);
		if (!enemyContainer) return;

		const viewport = getViewportPixelSize();
		const containerTransform = {
			x: this.container.x,
			y: this.container.y,
			scale: this.container.scale.x,
		};

		this.enemyTooltip.updatePosition(
			enemyContainer.x,
			enemyContainer.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * 敵ツールチップを非表示
	 */
	private hideEnemyTooltip(): void {
		this.tooltipEnemyId = null;
		this.enemyTooltip.hide();
	}
}
