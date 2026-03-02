/**
 * マップ描画（Facade）
 * 各サブモジュールへの委譲を通じてマップ・キャラクター描画を管理
 */

import { Container, Graphics } from "pixi.js";
import type { EnemyAiAnalysis } from "../game/enemyAiAnalysis";
import type {
	Direction,
	Enemy,
	GameMap,
	Player,
	Position,
	SpecialTileType,
	TileType,
} from "../types";
import { CharacterRenderer } from "./characterRenderer";
import type { ContainerTransform } from "./containerTransform";
import { getViewportPixelSize, gridToPixel } from "./coordinates";
import {
	animateDamagePopup as animateDamagePopupImpl,
	animateMissPopup as animateMissPopupImpl,
} from "./damagePopup";
import type { EnemyMove } from "./enemyMoveDetector";
import { EnemyTooltip } from "./enemyTooltip";
import type { PopupType } from "./mapAnimationConstants";
import {
	animateFlash,
	animatePlayerBlink,
	animateScreenShake,
	calcScreenShakeIntensity,
} from "./mapEffects";
import {
	renderFog,
	renderRemnants,
	renderTiles,
	type TileHoverCallbacks,
} from "./mapTileRenderer";
import { PlayerTooltip } from "./playerTooltip";
import { SpecialTileEffectManager } from "./specialTileEffect";
import { TileTooltip } from "./tileTooltip";

export type { PopupType } from "./mapAnimationConstants";

/**
 * マップレンダラー（Facade）
 * サブモジュールへの委譲を通じてマップ・プレイヤー・敵の描画を管理
 */
export class MapRenderer {
	private container: Container;
	private tilesContainer: Container;
	private remnantsGraphics: Graphics;
	private playerContainer: Container;
	private fogGraphics: Graphics;
	private lastRenderedMap: GameMap | null = null;
	private enemyTooltip: EnemyTooltip;
	private playerTooltip: PlayerTooltip;
	private tileTooltip: TileTooltip;
	private tooltipEnemyId: string | null = null;
	private tooltipTileKey: string | null = null;
	private lastPlayer: Player | null = null;
	private lastVisitedTiles: Set<string> | undefined;
	private specialTileEffectManager: SpecialTileEffectManager;
	private characterRenderer: CharacterRenderer;
	private enemyAiOverlayManager: {
		getContainer(): Container;
		update(analyses: EnemyAiAnalysis[], visitedTiles?: Set<string>): void;
		clear(): void;
	} | null = null;
	private enemyAiAnalyses: Map<string, EnemyAiAnalysis> = new Map();
	private enemiesContainer: Container;

	constructor() {
		this.container = new Container();
		this.tilesContainer = new Container();
		this.remnantsGraphics = new Graphics();
		this.playerContainer = new Container();
		this.enemiesContainer = new Container();
		const enemiesContainer = this.enemiesContainer;
		this.fogGraphics = new Graphics();
		this.enemyTooltip = new EnemyTooltip();
		this.playerTooltip = new PlayerTooltip();
		this.tileTooltip = new TileTooltip();
		this.specialTileEffectManager = new SpecialTileEffectManager();

		this.characterRenderer = new CharacterRenderer(
			this.playerContainer,
			enemiesContainer,
			{
				onEnemyPointerOver: (enemyId) => this.showEnemyTooltip(enemyId),
				onEnemyPointerOut: () => this.hideEnemyTooltip(),
				onBeforeEnemyDestroy: (enemyId) => {
					if (this.tooltipEnemyId === enemyId) {
						this.hideEnemyTooltip();
					}
				},
				onPlayerPointerOver: () => this.showPlayerTooltip(),
				onPlayerPointerOut: () => this.hidePlayerTooltip(),
			},
		);

		this.container.addChild(this.tilesContainer);
		this.container.addChild(this.specialTileEffectManager.getContainer());
		this.container.addChild(this.remnantsGraphics);
		this.container.addChild(enemiesContainer);
		this.container.addChild(this.fogGraphics);
		this.container.addChild(this.playerContainer);
		this.container.addChild(this.enemyTooltip.getContainer());
		this.container.addChild(this.playerTooltip.getContainer());
		this.container.addChild(this.tileTooltip.getContainer());
	}

	/** タイルホバーコールバック */
	private tileHoverCallbacks: TileHoverCallbacks = {
		onPointerOver: (gridX: number, gridY: number, tileType: TileType) =>
			this.showTileTooltip(gridX, gridY, tileType),
		onPointerOut: () => this.hideTileTooltip(),
	};

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * プレイヤーコンテナを取得
	 */
	getPlayerContainer(): Container {
		return this.playerContainer;
	}

	/**
	 * 敵AI可視化オーバーレイマネージャを設定（DEV環境でのみ呼び出す）
	 */
	setEnemyAiOverlayManager(manager: {
		getContainer(): Container;
		update(analyses: EnemyAiAnalysis[], visitedTiles?: Set<string>): void;
		clear(): void;
	}): void {
		this.enemyAiOverlayManager = manager;
		const enemiesIndex = this.container.getChildIndex(this.enemiesContainer);
		this.container.addChildAt(manager.getContainer(), enemiesIndex);
	}

	/**
	 * マップを描画
	 * 同一マップ参照の場合はスキップし、不要なSprite再生成を回避する
	 */
	renderMap(map: GameMap): void {
		if (this.lastRenderedMap === map) return;
		this.lastRenderedMap = map;
		// マップ再描画時にホバー中タイルのSpriteがdestroyされるため、
		// pointeroutが発火せずツールチップが残るのを防ぐ
		this.hideTileTooltip();
		this.tooltipTileKey = null;
		renderTiles(this.tilesContainer, map, this.tileHoverCallbacks);
	}

	/**
	 * プレイヤーを描画
	 */
	renderPlayer(player: Player): void {
		this.lastPlayer = player;
		this.characterRenderer.renderPlayer(player);
	}

	/**
	 * プレイヤー移動アニメーション
	 * @param targetGridPos 移動先のグリッド座標
	 */
	async animatePlayerMove(targetGridPos: Position): Promise<void> {
		this.hidePlayerTooltip();
		await this.characterRenderer.animatePlayerMove(targetGridPos);
	}

	/**
	 * 壁にぶつかった時のバンプアニメーション
	 * @param direction ぶつかった方向
	 */
	async animatePlayerBump(direction: Direction): Promise<void> {
		await this.characterRenderer.animatePlayerBump(direction);
	}

	/**
	 * 敵移動アニメーション
	 * @param moves 移動情報の配列
	 */
	async animateEnemyMoves(moves: EnemyMove[]): Promise<void> {
		await this.characterRenderer.animateEnemyMoves(moves);
	}

	/**
	 * 敵を描画（永続管理）
	 */
	renderEnemies(enemies: Enemy[], visitedTiles?: Set<string>): void {
		this.characterRenderer.renderEnemies(enemies, visitedTiles);
	}

	/**
	 * ダメージ/回復数値ポップアップアニメーション
	 */
	async animateDamagePopup(
		gridPos: Position,
		amount: number,
		popupType: PopupType = "damage",
	): Promise<void> {
		await animateDamagePopupImpl(this.container, gridPos, amount, popupType);
	}

	/**
	 * プレイヤー攻撃のヒットアニメーション
	 * 敵タイルの白フラッシュ + 画面シェイク + ダメージポップアップ
	 * @param enemyId ヒットした敵のID
	 * @param damage ダメージ量
	 */
	async animateAttackHit(enemyId: string, damage: number): Promise<void> {
		const enemyContainer = this.characterRenderer.getEnemyContainer(enemyId);
		if (!enemyContainer) return;

		const enemyGridPos = this.characterRenderer.getEnemyGridPos(enemyId);
		const shakeIntensity = calcScreenShakeIntensity(damage);

		await Promise.all([
			animateFlash(enemyContainer),
			animateScreenShake(this.container, shakeIntensity),
			...(enemyGridPos
				? [animateDamagePopupImpl(this.container, enemyGridPos, damage)]
				: []),
		]);
	}

	/**
	 * 敵撃破アニメーション
	 * 縮小 + 透明化 + 回転の複合アニメーションで消滅演出
	 * @param enemyId 撃破された敵のID
	 */
	async animateEnemyDefeat(enemyId: string): Promise<void> {
		await this.characterRenderer.animateEnemyDefeat(enemyId);
	}

	/**
	 * 敵攻撃のヒットアニメーション
	 * フラッシュ + シェイク + ダメージポップアップ完了後にプレイヤー点滅
	 * @param damage ダメージ量
	 */
	async animateEnemyAttackHit(damage: number): Promise<void> {
		const shakeIntensity = calcScreenShakeIntensity(damage);
		const playerGridPos = this.characterRenderer.getPlayerGridPos();
		await Promise.all([
			animateFlash(this.playerContainer),
			animateScreenShake(this.container, shakeIntensity),
			animateDamagePopupImpl(this.container, playerGridPos, damage),
		]);
		await animatePlayerBlink(this.playerContainer);
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
		const popupPos = gridPos ?? this.characterRenderer.getPlayerGridPos();
		await animateDamagePopupImpl(this.container, popupPos, amount, popupType);
	}

	/**
	 * ミスポップアップアニメーション
	 * @param gridPos 対象のグリッド座標
	 */
	async animateMissPopup(gridPos: Position): Promise<void> {
		await animateMissPopupImpl(this.container, gridPos);
	}

	/**
	 * 残骸オーバーレイを描画
	 */
	renderRemnants(remnants: Record<string, number>): void {
		renderRemnants(this.remnantsGraphics, remnants);
	}

	/**
	 * Fog of Warオーバーレイを描画
	 */
	renderFog(map: GameMap, visitedTiles: Set<string>): void {
		renderFog(this.fogGraphics, map, visitedTiles);
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
		this.lastVisitedTiles = visitedTiles;
		this.specialTileEffectManager.setFloorCleared(enemies.length === 0);
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
	 * プレイヤーHPゲージを更新
	 */
	updatePlayerHpGauge(ratio: number): void {
		this.characterRenderer.updatePlayerHpGauge(ratio);
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
		this.lastPlayer = null;
		this.remnantsGraphics.clear();
		this.fogGraphics.clear();
		this.characterRenderer.clear();
		this.hideEnemyTooltip();
		this.hidePlayerTooltip();
		this.hideTileTooltip();
		this.lastVisitedTiles = undefined;
		this.specialTileEffectManager.clear();
		this.enemyAiOverlayManager?.clear();
		this.enemyAiAnalyses.clear();
	}

	/**
	 * 現在のコンテナ変換情報を取得
	 */
	private getContainerTransform(): ContainerTransform {
		return {
			x: this.container.x,
			y: this.container.y,
			scale: this.container.scale.x,
		};
	}

	/**
	 * 敵ツールチップを表示
	 */
	private showEnemyTooltip(enemyId: string): void {
		const enemy = this.characterRenderer.getEnemyData(enemyId);
		const enemyContainer = this.characterRenderer.getEnemyContainer(enemyId);
		if (!enemy || !enemyContainer) return;

		this.tooltipEnemyId = enemyId;
		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();
		const debugInfo = this.enemyAiAnalyses.get(enemyId);
		this.enemyTooltip.show(
			enemy,
			enemyContainer.x,
			enemyContainer.y,
			viewport,
			containerTransform,
			debugInfo,
		);
	}

	/**
	 * 表示中の敵ツールチップを現在のコンテナ変換で再配置
	 * カメラオフセット/ズーム変更後に呼び出す
	 */
	repositionEnemyTooltip(): void {
		if (!this.tooltipEnemyId) return;

		const enemyContainer = this.characterRenderer.getEnemyContainer(
			this.tooltipEnemyId,
		);
		if (!enemyContainer) return;

		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();

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

	/**
	 * プレイヤーツールチップを表示
	 */
	private showPlayerTooltip(): void {
		if (!this.lastPlayer) return;

		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();
		this.playerTooltip.show(
			this.lastPlayer,
			this.playerContainer.x,
			this.playerContainer.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * 表示中のプレイヤーツールチップを現在のコンテナ変換で再配置
	 * カメラオフセット/ズーム変更後に呼び出す
	 */
	repositionPlayerTooltip(): void {
		if (!this.playerTooltip.isVisible()) return;

		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();

		this.playerTooltip.updatePosition(
			this.playerContainer.x,
			this.playerContainer.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * プレイヤーツールチップを非表示
	 */
	private hidePlayerTooltip(): void {
		this.playerTooltip.hide();
	}

	/**
	 * 特殊タイルツールチップを表示
	 */
	private showTileTooltip(
		gridX: number,
		gridY: number,
		tileType: TileType,
	): void {
		const key = `${gridX},${gridY}`;
		// Fog of War: 未訪問タイルにはツールチップを表示しない
		if (this.lastVisitedTiles && !this.lastVisitedTiles.has(key)) return;

		this.tooltipTileKey = key;
		const pixelPos = gridToPixel({ x: gridX, y: gridY });
		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();
		this.tileTooltip.show(
			tileType,
			pixelPos.x,
			pixelPos.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * 表示中の特殊タイルツールチップを現在のコンテナ変換で再配置
	 * カメラオフセット/ズーム変更後に呼び出す
	 */
	repositionTileTooltip(): void {
		if (!this.tooltipTileKey) return;

		const [xStr, yStr] = this.tooltipTileKey.split(",");
		const gridX = Number(xStr);
		const gridY = Number(yStr);
		const pixelPos = gridToPixel({ x: gridX, y: gridY });
		const viewport = getViewportPixelSize();
		const containerTransform = this.getContainerTransform();

		this.tileTooltip.updatePosition(
			pixelPos.x,
			pixelPos.y,
			viewport,
			containerTransform,
		);
	}

	/**
	 * 特殊タイルツールチップを非表示
	 */
	private hideTileTooltip(): void {
		this.tooltipTileKey = null;
		this.tileTooltip.hide();
	}

	/**
	 * 敵AI可視化オーバーレイを更新
	 */
	updateEnemyAiOverlay(
		analyses: EnemyAiAnalysis[],
		visitedTiles?: Set<string>,
	): void {
		this.enemyAiOverlayManager?.update(analyses, visitedTiles);
		this.enemyAiAnalyses.clear();
		for (const a of analyses) {
			this.enemyAiAnalyses.set(a.enemyId, a);
		}
	}

	/**
	 * 敵AI可視化オーバーレイをクリア
	 */
	clearEnemyAiOverlay(): void {
		this.enemyAiOverlayManager?.clear();
		this.enemyAiAnalyses.clear();
	}
}
