/**
 * キャラクター（プレイヤー・敵）の描画・アニメーション・状態管理
 */

import { Container, Graphics, Sprite } from "pixi.js";
import { CELL_SIZE, COLORS } from "../constants";
import type { Direction, Enemy, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import type { EnemyType } from "../types/character";
import { Easing, tween } from "../utils/tween";
import { getEnemyTexture, getPlayerTexture } from "./assetLoader";
import { gridToPixel } from "./coordinates";
import type { EnemyMove } from "./enemyMoveDetector";
import {
	BUMP_BACK_DURATION,
	BUMP_DISTANCE,
	BUMP_FORWARD_DURATION,
	DEFEAT_DURATION,
	DEFEAT_ROTATION,
	ENEMY_MOVE_DURATION,
	ENEMY_MOVE_STAGGER_DELAY,
	ENEMY_PADDING,
	HP_BAR_BG_COLOR,
	HP_BAR_HEIGHT,
	PLAYER_MOVE_DURATION,
} from "./mapAnimationConstants";

/**
 * CharacterRenderer が外部に通知するコールバック
 */
export interface CharacterRendererCallbacks {
	onEnemyPointerOver: (enemyId: string) => void;
	onEnemyPointerOut: () => void;
	onBeforeEnemyDestroy: (enemyId: string) => void;
}

/**
 * キャラクターレンダラー
 * プレイヤー・敵の描画とアニメーションを管理
 */
export class CharacterRenderer {
	private playerSprite: Sprite;
	private enemiesContainer: Container;
	private isPlayerInitialized = false;
	private enemyContainerMap: Map<string, Container> = new Map();
	private enemyHpBarMap: Map<string, Graphics> = new Map();
	private enemyTypeMap: Map<string, EnemyType> = new Map();
	private playerGridPos: Position = { x: 0, y: 0 };
	private enemyGridPosMap: Map<string, Position> = new Map();
	private enemyDataMap: Map<string, Enemy> = new Map();
	private callbacks: CharacterRendererCallbacks;

	constructor(
		playerSprite: Sprite,
		enemiesContainer: Container,
		callbacks: CharacterRendererCallbacks,
	) {
		this.playerSprite = playerSprite;
		this.enemiesContainer = enemiesContainer;
		this.callbacks = callbacks;
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
	renderPlayer(player: { position: Position }): void {
		this.initPlayerSprite();

		this.playerGridPos = player.position;
		const pixelPos = gridToPixel(player.position);
		this.playerSprite.x = pixelPos.x;
		this.playerSprite.y = pixelPos.y;
	}

	/**
	 * プレイヤー移動アニメーション
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
	 */
	async animatePlayerBump(direction: Direction): Promise<void> {
		this.initPlayerSprite();

		const delta = DIRECTION_DELTA[direction];
		const originX = this.playerSprite.x;
		const originY = this.playerSprite.y;

		await tween(
			this.playerSprite,
			{
				x: originX + delta.x * BUMP_DISTANCE,
				y: originY + delta.y * BUMP_DISTANCE,
			},
			{ duration: BUMP_FORWARD_DURATION, easing: Easing.easeOut },
		);
		await tween(
			this.playerSprite,
			{ x: originX, y: originY },
			{ duration: BUMP_BACK_DURATION, easing: Easing.easeOutCubic },
		);
	}

	/**
	 * プレイヤーのスプライトを取得
	 */
	getPlayerSprite(): Sprite {
		return this.playerSprite;
	}

	/**
	 * プレイヤーのグリッド座標を取得
	 */
	getPlayerGridPos(): Position {
		return this.playerGridPos;
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
	 * 敵1体分のコンテナを作成
	 */
	private createEnemyContainer(type: EnemyType, enemyId: string): Container {
		const enemyContainer = new Container();
		const sprite = new Sprite(getEnemyTexture(type));
		const padding = ENEMY_PADDING[type];
		const size = CELL_SIZE - padding * 2;

		sprite.x = padding;
		sprite.y = padding;
		sprite.width = size;
		sprite.height = size;
		enemyContainer.addChild(sprite);

		enemyContainer.eventMode = "static";
		enemyContainer.on("pointerover", () => {
			this.callbacks.onEnemyPointerOver(enemyId);
		});
		enemyContainer.on("pointerout", () => {
			this.callbacks.onEnemyPointerOut();
		});

		return enemyContainer;
	}

	/**
	 * 敵のHPバーを描画・更新
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
		hpBar.rect(padding, barY, barWidth, HP_BAR_HEIGHT);
		hpBar.fill(HP_BAR_BG_COLOR);
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
		this.callbacks.onBeforeEnemyDestroy(id);
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
	renderEnemies(enemies: Enemy[], visitedTiles?: Set<string>): Enemy[] {
		const visibleEnemies = visitedTiles
			? enemies.filter((e) =>
					visitedTiles.has(`${e.position.x},${e.position.y}`),
				)
			: enemies;
		const currentIds = new Set(visibleEnemies.map((e) => e.id));

		for (const id of this.enemyContainerMap.keys()) {
			if (!currentIds.has(id)) {
				this.destroyEnemyEntry(id);
			}
		}

		for (const enemy of visibleEnemies) {
			const prevType = this.enemyTypeMap.get(enemy.id);

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

			this.renderHpBar(enemy);
		}

		return visibleEnemies;
	}

	/**
	 * 敵移動アニメーション
	 */
	async animateEnemyMoves(moves: EnemyMove[]): Promise<void> {
		const tweens: Promise<void>[] = [];

		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			const enemyContainer = this.enemyContainerMap.get(move.id);
			if (!enemyContainer) continue;

			const fromPixel = gridToPixel(move.from);
			enemyContainer.x = fromPixel.x;
			enemyContainer.y = fromPixel.y;

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
	 * 敵撃破アニメーション
	 */
	async animateEnemyDefeat(enemyId: string): Promise<void> {
		const enemyContainer = this.enemyContainerMap.get(enemyId);
		if (!enemyContainer) return;

		enemyContainer.pivot.set(CELL_SIZE / 2, CELL_SIZE / 2);
		enemyContainer.x += CELL_SIZE / 2;
		enemyContainer.y += CELL_SIZE / 2;

		await tween(
			enemyContainer,
			{ scaleX: 0, scaleY: 0, alpha: 0, rotation: DEFEAT_ROTATION },
			{ duration: DEFEAT_DURATION, easing: Easing.easeInOut },
		);

		this.destroyEnemyEntry(enemyId);
	}

	/**
	 * 敵コンテナを取得
	 */
	getEnemyContainer(id: string): Container | undefined {
		return this.enemyContainerMap.get(id);
	}

	/**
	 * 敵のグリッド座標を取得
	 */
	getEnemyGridPos(id: string): Position | undefined {
		return this.enemyGridPosMap.get(id);
	}

	/**
	 * 敵データを取得
	 */
	getEnemyData(id: string): Enemy | undefined {
		return this.enemyDataMap.get(id);
	}

	/**
	 * 全キャラクター状態をクリア
	 */
	clear(): void {
		this.playerSprite.alpha = 1;
		this.isPlayerInitialized = false;
		this.playerGridPos = { x: 0, y: 0 };
		this.enemiesContainer.removeChildren();
		for (const container of this.enemyContainerMap.values()) {
			container.destroy({ children: true });
		}
		this.enemyContainerMap.clear();
		this.enemyHpBarMap.clear();
		this.enemyTypeMap.clear();
		this.enemyGridPosMap.clear();
		this.enemyDataMap.clear();
	}
}
