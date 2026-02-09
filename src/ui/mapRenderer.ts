/**
 * マップ描画
 * PixiJSを使用してマップ・キャラクターを描画
 */

import { Container, Graphics, Text, Ticker } from "pixi.js";
import { CELL_SIZE, COLORS } from "../constants";
import type { SpecialTileType } from "../game/tileEffect";
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

/** ダメージポップアップのフォントサイズ */
const DAMAGE_POPUP_FONT_SIZE = 24;

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
const HP_BAR_HEIGHT = 4;

/** HPバー背景色 */
const HP_BAR_BG_COLOR = 0x333333;

/**
 * ボスタイプ判定（miniboss/boss）
 */
function isBossType(type: EnemyType): boolean {
	return type === "miniboss" || type === "boss";
}

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
 * 罠タイルのアイコン（毒沼の波紋）を描画
 */
function drawTrapIcon(g: Graphics, px: number, py: number): void {
	const cx = px + CELL_SIZE / 2;
	const cy = py + CELL_SIZE / 2;
	// タイル背景（COLORS.trap）と同色だと alpha を変えても視認できないため、
	// 波紋は背景とコントラストのある白で描画する
	const rippleColor = 0xffffff;

	// 外側の波紋
	g.circle(cx, cy, 20);
	g.fill({ color: rippleColor, alpha: 0.3 });

	// 中間の波紋
	g.circle(cx, cy, 13);
	g.fill({ color: rippleColor, alpha: 0.4 });

	// 内側の波紋
	g.circle(cx, cy, 6);
	g.fill({ color: rippleColor, alpha: 0.5 });
}

/**
 * 宝箱タイルのアイコンを描画
 */
function drawTreasureIcon(g: Graphics, px: number, py: number): void {
	const pad = 14;
	const w = CELL_SIZE - pad * 2;
	const h = CELL_SIZE - pad * 2;
	const x = px + pad;
	const y = py + pad;
	const bodyColor = 0xb8860b;
	const lockColor = 0x8b7500;

	// 本体（下60%）
	const bodyY = y + h * 0.4;
	const bodyH = h * 0.6;
	g.roundRect(x, bodyY, w, bodyH, 3);
	g.fill(bodyColor);

	// 蓋（上45%）
	const lidH = h * 0.45;
	g.roundRect(x, y, w, lidH, 3);
	g.fill(bodyColor);

	// 留め具（中央の横線）
	const claspH = 3;
	const claspY = y + lidH - claspH / 2;
	g.rect(x, claspY, w, claspH);
	g.fill(lockColor);

	// 鍵穴
	g.circle(x + w / 2, claspY + claspH / 2 + 5, 3);
	g.fill(0x000000);
}

/**
 * 休憩所タイルのアイコン（骨付き肉）を描画
 */
function drawRestAreaIcon(g: Graphics, px: number, py: number): void {
	const cx = px + CELL_SIZE / 2;
	const cy = py + CELL_SIZE / 2;
	const meatColor = 0xd4704e;
	const boneColor = 0xf5f5dc;

	// 肉（中央の楕円）
	g.ellipse(cx, cy, 12, 9);
	g.fill(meatColor);

	// 左骨: 関節球 + 棒 + 関節球
	g.circle(cx - 18, cy - 4, 4);
	g.fill(boneColor);
	g.rect(cx - 16, cy - 2, 8, 4);
	g.fill(boneColor);
	g.circle(cx - 18, cy + 4, 4);
	g.fill(boneColor);

	// 右骨: 関節球 + 棒 + 関節球
	g.circle(cx + 18, cy - 4, 4);
	g.fill(boneColor);
	g.rect(cx + 8, cy - 2, 8, 4);
	g.fill(boneColor);
	g.circle(cx + 18, cy + 4, 4);
	g.fill(boneColor);
}

/**
 * 階段タイルのアイコンを描画
 */
function drawStairsIcon(g: Graphics, px: number, py: number): void {
	const pad = 16;
	const x = px + pad;
	const y = py + pad;
	const w = CELL_SIZE - pad * 2;
	const h = CELL_SIZE - pad * 2;
	const color = 0x6a8a6a;
	const lineWidth = 3;

	const stepW = w / 3;
	const stepH = h / 3;

	g.setStrokeStyle({ width: lineWidth, color });

	// 3段の階段（左下→右上）
	// 1段目（左下）
	g.moveTo(x, y + h);
	g.lineTo(x, y + h - stepH);
	g.lineTo(x + stepW, y + h - stepH);

	// 2段目（中央）
	g.lineTo(x + stepW, y + h - stepH * 2);
	g.lineTo(x + stepW * 2, y + h - stepH * 2);

	// 3段目（右上）
	g.lineTo(x + stepW * 2, y);
	g.lineTo(x + w, y);

	g.stroke();
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
	private enemyContainerMap: Map<string, Container> = new Map();
	private enemyGraphicsMap: Map<string, Graphics> = new Map();
	private enemyHpBarMap: Map<string, Graphics> = new Map();
	private enemyTypeMap: Map<string, EnemyType> = new Map();
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

				// 特殊タイルのアイコンを重ねて描画
				switch (tile.type) {
					case "trap":
						drawTrapIcon(this.tilesGraphics, pixelPos.x, pixelPos.y);
						break;
					case "treasure":
						drawTreasureIcon(this.tilesGraphics, pixelPos.x, pixelPos.y);
						break;
					case "rest_area":
						drawRestAreaIcon(this.tilesGraphics, pixelPos.x, pixelPos.y);
						break;
					case "stairs":
						drawStairsIcon(this.tilesGraphics, pixelPos.x, pixelPos.y);
						break;
				}
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
			case "miniboss":
				return COLORS.enemyMiniboss;
			case "boss":
				return COLORS.enemyBoss;
			default:
				return COLORS.enemyNormal;
		}
	}

	/**
	 * 敵1体分のコンテナを作成（Graphics + HPバーを子要素として含む）
	 * コンテナ単位で座標移動するため、アニメーション時にHPバーも追従する
	 */
	private createEnemyContainer(type: EnemyType): {
		container: Container;
		graphics: Graphics;
	} {
		const enemyContainer = new Container();
		const graphics = new Graphics();
		const padding = ENEMY_PADDING[type];
		const size = CELL_SIZE - padding * 2;
		const color = this.getEnemyColor(type);

		// ローカル座標でセル内に四角を描画
		graphics.rect(padding, padding, size, size);
		graphics.fill(color);
		enemyContainer.addChild(graphics);

		return { container: enemyContainer, graphics };
	}

	/**
	 * ボスタイプ敵のHPバーを描画・更新
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
		const enemyContainer = this.enemyContainerMap.get(id);
		if (enemyContainer) {
			this.enemiesContainer.removeChild(enemyContainer);
			enemyContainer.destroy({ children: true });
		}
		this.enemyContainerMap.delete(id);
		this.enemyGraphicsMap.delete(id);
		this.enemyHpBarMap.delete(id);
		this.enemyTypeMap.delete(id);
		this.enemyGridPosMap.delete(id);
	}

	/**
	 * 敵を描画（永続管理）
	 */
	renderEnemies(enemies: Enemy[]): void {
		const currentIds = new Set(enemies.map((e) => e.id));

		// 不要になった敵を削除
		for (const id of this.enemyContainerMap.keys()) {
			if (!currentIds.has(id)) {
				this.destroyEnemyEntry(id);
			}
		}

		// 各敵のコンテナを更新または作成
		for (const enemy of enemies) {
			const prevType = this.enemyTypeMap.get(enemy.id);

			// タイプが変わった場合は再作成
			if (prevType !== undefined && prevType !== enemy.type) {
				this.destroyEnemyEntry(enemy.id);
			}

			let enemyContainer = this.enemyContainerMap.get(enemy.id);
			if (!enemyContainer) {
				const { container, graphics } = this.createEnemyContainer(enemy.type);
				enemyContainer = container;
				this.enemyContainerMap.set(enemy.id, enemyContainer);
				this.enemyGraphicsMap.set(enemy.id, graphics);
				this.enemyTypeMap.set(enemy.id, enemy.type);
				this.enemiesContainer.addChild(enemyContainer);
			}

			this.enemyGridPosMap.set(enemy.id, enemy.position);
			const pixelPos = gridToPixel(enemy.position);
			enemyContainer.x = pixelPos.x;
			enemyContainer.y = pixelPos.y;

			// ボスタイプのHPバー描画
			if (isBossType(enemy.type)) {
				this.renderHpBar(enemy);
			} else {
				// 非ボスタイプの場合、既存HPバーを削除
				const hpBar = this.enemyHpBarMap.get(enemy.id);
				if (hpBar) {
					if (hpBar.parent) {
						hpBar.parent.removeChild(hpBar);
					}
					hpBar.destroy();
					this.enemyHpBarMap.delete(enemy.id);
				}
			}
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

		const text = new Text({
			text: `${prefix}${amount}`,
			style: {
				fontSize: DAMAGE_POPUP_FONT_SIZE,
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

		// コンテナごと削除（Graphics + HPバーも含む）
		this.destroyEnemyEntry(enemyId);
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
		for (const container of this.enemyContainerMap.values()) {
			container.destroy({ children: true });
		}
		this.enemyContainerMap.clear();
		this.enemyGraphicsMap.clear();
		this.enemyHpBarMap.clear();
		this.enemyTypeMap.clear();
		this.enemyGridPosMap.clear();
	}
}
