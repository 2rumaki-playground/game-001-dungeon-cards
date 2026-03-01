/**
 * 手札UI描画
 * @see docs/spec/mvp/cards.md
 */

import { Container, type FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { getExpProgress } from "../game/cardLevel";
import type { Card, CardType, ComboHistory, Direction } from "../types";
import { Easing, tween } from "../utils/tween";
import {
	CARD_COLORS as BASE_CARD_COLORS,
	CARD_BRIGHT_COLORS,
	CARD_GLOW_COLORS,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
} from "./cardConstants";
import {
	createCardTooltip,
	TOOLTIP_MARGIN,
	TOOLTIP_WIDTH,
} from "./cardTooltip";
import { drawEdgeLine, drawRoundedRect } from "./graphicsHelpers";
import type { ParticleSystem } from "./particleSystem";
import {
	UI_COLOR_COMBO_PREVIEW,
	UI_COLOR_GOLD,
	UI_COLORS_DISABLED,
} from "./uiColors";

/** カード描画定数 */
export const CARD_WIDTH = 90;
export const CARD_HEIGHT = 120;
export const CARD_GAP = 8;
export const CARD_RADIUS = 8;

/**
 * アニメーション定数
 * UI実装の詳細であり、仕様レベル（constants.md）での管理は不要
 */
const DEAL_ANIMATION_DURATION = 200; // 1枚あたりのアニメーション時間（ms）
const DEAL_ANIMATION_DELAY = 80; // カード間のディレイ（ms）
const DECK_OFFSET_X = -300; // 山札の位置（手札コンテナからの相対X）
const DECK_OFFSET_Y = -50; // 山札の位置（手札コンテナからの相対Y）

/** ホバー時の浮き上がり距離（px） */
const HOVER_LIFT = 8;

/** ドラッグ確定閾値（px） */
const DRAG_THRESHOLD = 5;

/** ドラッグ中のY浮き上がり（px） */
const DRAG_LIFT = 12;

/** キューバッジのサイズ（直径px） */
const QUEUE_BADGE_SIZE = 20;

/** 選択パルスの拡大率 */
const PULSE_SCALE = 1.1;

/** 選択パルスの拡大時間（ms） */
const PULSE_UP_DURATION = 80;

/** 消費アニメーション：飛行時間（ms） */
const CONSUME_FLY_DURATION = 200;

/** 消費アニメーション：飛行先Y座標（相対） */
const CONSUME_FLY_TARGET_Y = -70;

/** 消費アニメーション：パーティクル数 */
const CONSUME_PARTICLE_COUNT = 12;

/**
 * カード内のクリック位置から方向を判定
 * カードを対角線で4分割し、クリック位置がどの領域にあるかで方向を決定
 * @param localX カード内のX座標
 * @param localY カード内のY座標
 * @param cardWidth カードの幅
 * @param cardHeight カードの高さ
 */
export function getDirectionFromClickPosition(
	localX: number,
	localY: number,
	cardWidth: number = CARD_WIDTH,
	cardHeight: number = CARD_HEIGHT,
): Direction {
	const centerX = cardWidth / 2;
	const centerY = cardHeight / 2;

	// 中心からの相対位置
	const relX = localX - centerX;
	const relY = localY - centerY;

	// 対角線の傾き（矩形のアスペクト比）と比較して4方向を判定
	// relX が 0 の場合は垂直線上なので上下判定にフォールバック
	if (relX === 0) {
		return relY > 0 ? "down" : "up";
	}

	const slope = relY / relX;
	const diagSlope = cardHeight / cardWidth;

	if (Math.abs(slope) < diagSlope) {
		// 左右（傾きが対角線より緩やか）
		return relX > 0 ? "right" : "left";
	}
	// 上下（傾きが対角線より急）
	return relY > 0 ? "down" : "up";
}

/** handRenderer固有のカード色拡張 */
const CARD_COLORS = {
	...BASE_CARD_COLORS,
	disabled: UI_COLORS_DISABLED,
	selectedBorder: UI_COLOR_GOLD,
	hoveredBorder: 0x88ccff,
	comboBorder: UI_COLOR_COMBO_PREVIEW,
} as const;

/** コンボ予告枠線の幅（px） */
const COMBO_BORDER_WIDTH = 3;

/**
 * 手札レンダラー
 */
export class HandRenderer {
	private container: Container;
	private cardsContainer: Container;
	private tooltipContainer: Container;
	private particleSystem: ParticleSystem | null;
	private selectedCardId: string | null = null;
	private hoveredCardId: string | null = null;
	private currentHand: Card[] = [];
	private currentUsedCardIds: ReadonlySet<string> = new Set();
	private currentQueuedCardIndexMap: ReadonlyMap<string, number> = new Map();
	private currentComboHistory: ComboHistory | null = null;
	private onCardSelect:
		| ((
				card: Card,
				direction?: Direction,
		  ) => undefined | false | Promise<undefined | false>)
		| null = null;
	private onReorder: ((fromIndex: number, toIndex: number) => void) | null =
		null;
	private isInputLocked = false;
	private isInteractionEnabled = true;

	// ドラッグ状態
	private isDragging = false;
	private dragCardIndex = -1;
	private dragCardContainer: Container | null = null;
	private dragStartX = 0;
	private dragStartY = 0;
	private dragConfirmed = false;
	private dragCurrentX = 0;
	private dragInsertIndex = -1;

	constructor(particleSystem?: ParticleSystem) {
		this.container = new Container();
		this.cardsContainer = new Container();
		this.cardsContainer.label = "cards";
		this.cardsContainer.sortableChildren = true;
		this.tooltipContainer = new Container();
		this.tooltipContainer.label = "tooltip";
		this.container.addChild(this.cardsContainer);
		this.container.addChild(this.tooltipContainer);
		this.particleSystem = particleSystem ?? null;

		// グローバルポインタイベント（ドラッグ中の追従）
		// PixiJS v8はglobalpointermoveのみサポート（globalpointerupは存在しない）
		// ドロップ検知はカードコンテナのpointerup/pointerupoutsideで行う
		this.container.eventMode = "static";
		this.container.on("globalpointermove", (e) => {
			this.handleDragMove(e.global.x, e.global.y);
		});
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * カード選択コールバックを設定
	 * @param callback カード選択時のコールバック。方向パラメータを持つカードの場合、クリック位置に応じた方向も渡される
	 */
	setOnCardSelect(
		callback: (
			card: Card,
			direction?: Direction,
		) => undefined | false | Promise<undefined | false>,
	): void {
		this.onCardSelect = callback;
	}

	/**
	 * カード並べ替えコールバックを設定
	 */
	setOnReorder(callback: (fromIndex: number, toIndex: number) => void): void {
		this.onReorder = callback;
	}

	/**
	 * 選択中カードIDを設定
	 */
	setSelectedCard(cardId: string | null): void {
		this.selectedCardId = cardId;
	}

	/**
	 * キュー内カードの表示状態を設定
	 * @param map カードID→実行順序番号(1始まり)のMap
	 */
	setQueuedCards(map: ReadonlyMap<string, number>): void {
		this.currentQueuedCardIndexMap = map;
	}

	/**
	 * 使用済みカードIDを設定
	 */
	setUsedCardIds(ids: ReadonlySet<string>): void {
		this.currentUsedCardIds = ids;
	}

	/**
	 * コンボ予告表示用のコンボ履歴を設定
	 */
	setComboHistory(history: ComboHistory | null): void {
		this.currentComboHistory = history;
	}

	/**
	 * 手札を描画
	 */
	render(hand: Card[]): void {
		// ドラッグ確定中は再描画をスキップ（ドラッグ状態が破壊されるため）
		if (this.isDragging && this.dragConfirmed) return;

		this.currentHand = hand;

		this.cardsContainer.removeChildren();

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < hand.length; i++) {
			const card = hand[i];
			const x = startX + i * (CARD_WIDTH + CARD_GAP);
			const used = this.currentUsedCardIds.has(card.id);
			const enabled = !used;
			const selected = card.id === this.selectedCardId;
			const hovered = enabled && card.id === this.hoveredCardId;
			const y = hovered ? -HOVER_LIFT : 0;

			const queueIndex = this.currentQueuedCardIndexMap.get(card.id);
			const cardContainer = this.createCardView(
				card,
				x,
				y,
				enabled,
				selected,
				hovered,
				queueIndex,
			);
			this.cardsContainer.addChild(cardContainer);
		}

		this.updateTooltip(hand);
	}

	/**
	 * アニメーション付きで手札を描画
	 * 山札の位置から手札の位置にカードが飛んでくる演出
	 * @param hand 手札のカード配列
	 * @param newCardCount 新しく引いたカードの枚数（アニメーション対象）
	 * @returns アニメーション完了時にresolveするPromise
	 */
	async renderWithAnimation(hand: Card[], newCardCount: number): Promise<void> {
		this.isInteractionEnabled = false;
		this.currentHand = hand;
		this.cardsContainer.removeChildren();
		this.tooltipContainer.removeChildren();
		this.hoveredCardId = null;

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		// アニメーション対象のカード（末尾のnewCardCount枚）
		// newCardCount が手札枚数を超える・負になる入力に対しても挙動を明確にするためクランプする
		const clampedNewCardCount = Math.min(
			Math.max(newCardCount, 0),
			hand.length,
		);
		const existingCardCount = hand.length - clampedNewCardCount;
		const animationPromises: Promise<void>[] = [];

		for (let i = 0; i < hand.length; i++) {
			const card = hand[i];
			const targetX = startX + i * (CARD_WIDTH + CARD_GAP);
			const targetY = 0;
			const selected = card.id === this.selectedCardId;

			// アニメーション完了後に this.render(hand) で enabled を再計算して有効化するため、
			// ここでは一時的にインタラクションを無効（false 固定）でカードを生成する
			const cardContainer = this.createCardView(
				card,
				targetX,
				targetY,
				false,
				selected,
				false,
			);

			if (i >= existingCardCount) {
				// 新しく引いたカードはアニメーション
				const animationIndex = i - existingCardCount;
				cardContainer.x = DECK_OFFSET_X;
				cardContainer.y = DECK_OFFSET_Y;
				cardContainer.alpha = 0;
				cardContainer.scale.set(0.5);

				// 各カードに少しずつディレイを入れて順番に配る
				const delay = animationIndex * DEAL_ANIMATION_DELAY;

				const animPromise = tween(
					cardContainer,
					{
						x: targetX,
						y: targetY,
						alpha: 1,
						scaleX: 1,
						scaleY: 1,
					},
					{
						duration: DEAL_ANIMATION_DURATION,
						delay,
						easing: Easing.easeOutCubic,
					},
				);

				animationPromises.push(animPromise);
			}

			this.cardsContainer.addChild(cardContainer);
		}

		// すべてのアニメーションが完了するまで待機
		await Promise.all(animationPromises);

		// アニメーション完了後、インタラクションを有効化して再描画
		this.isInteractionEnabled = true;
		this.render(hand);
	}

	/**
	 * カード1枚分のビューを生成
	 */
	private createCardView(
		card: Card,
		x: number,
		y: number,
		enabled: boolean,
		selected: boolean,
		hovered: boolean,
		queueIndex?: number,
	): Container {
		const cardContainer = new Container();
		cardContainer.label = `card-${this.currentHand.indexOf(card)}`;
		cardContainer.x = x;
		cardContainer.y = y;

		// 背景
		const bg = new Graphics();
		const colors = enabled ? CARD_COLORS[card.type] : CARD_COLORS.disabled;
		const queued = queueIndex !== undefined;
		const borderColor =
			selected || queued
				? CARD_COLORS.selectedBorder
				: hovered
					? CARD_COLORS.hoveredBorder
					: colors.border;
		const borderWidth = selected || queued ? 3 : 2;

		drawRoundedRect(bg, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, colors.bg, {
			color: borderColor,
			width: borderWidth,
		});

		cardContainer.addChild(bg);

		// カードレベルの進捗ゲージ（明色矩形を下から描画）
		if (enabled) {
			const ratio = getExpProgress(card).ratio;
			if (ratio > 0) {
				const xpGaugeMask = new Graphics();
				xpGaugeMask.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
				xpGaugeMask.fill({ color: 0xffffff });
				const xpGauge = new Graphics();
				const gaugeHeight = ratio * CARD_HEIGHT;
				const gaugeY = CARD_HEIGHT - gaugeHeight;
				xpGauge.rect(0, gaugeY, CARD_WIDTH, gaugeHeight);
				xpGauge.fill({ color: CARD_BRIGHT_COLORS[card.type], alpha: 0.4 });
				xpGauge.mask = xpGaugeMask;
				cardContainer.addChild(xpGaugeMask);
				cardContainer.addChild(xpGauge);
			}
		}

		// コンボ予告枠線（選択/キュー状態より低優先度）
		if (enabled && !selected && !queued) {
			const comboPreview = this.getComboPreviewType(card.type);
			if (comboPreview !== null) {
				const comboBorderGraphics = new Graphics();
				if (comboPreview.type === "chain") {
					drawRoundedRect(
						comboBorderGraphics,
						CARD_WIDTH,
						CARD_HEIGHT,
						CARD_RADIUS,
						{ color: 0x000000, alpha: 0 },
						{ color: CARD_COLORS.comboBorder, width: COMBO_BORDER_WIDTH },
					);
				} else if (
					comboPreview.type === "charge" &&
					comboPreview.direction !== undefined
				) {
					drawEdgeLine(
						comboBorderGraphics,
						CARD_WIDTH,
						CARD_HEIGHT,
						CARD_RADIUS,
						comboPreview.direction,
						{ color: CARD_COLORS.comboBorder, width: COMBO_BORDER_WIDTH },
					);
				}
				cardContainer.addChild(comboBorderGraphics);
			}
		}

		// シンボル
		const symbolText = new Text({
			text: CARD_TYPE_SYMBOL[card.type],
			style: {
				fontSize: 18,
				fontFamily: "sans-serif",
				fill: enabled ? 0xffffff : 0x888888,
			},
		});
		symbolText.anchor.set(0.5, 0);
		symbolText.x = CARD_WIDTH / 2;
		symbolText.y = 12;
		cardContainer.addChild(symbolText);

		// カード名
		const nameText = new Text({
			text: CARD_TYPE_NAME[card.type],
			style: {
				fontSize: 16,
				fontFamily: "sans-serif",
				fill: enabled ? 0xffffff : 0x888888,
				fontWeight: "bold",
			},
		});
		nameText.anchor.set(0.5, 0);
		nameText.x = CARD_WIDTH / 2;
		nameText.y = 34;
		cardContainer.addChild(nameText);

		// 方向カードには方向ヒントを表示
		if (
			card.type === "move" ||
			card.type === "attack" ||
			card.type === "strong_attack" ||
			card.type === "jump"
		) {
			const arrowColor = enabled ? 0x888888 : 0x444444;
			this.addDirectionHints(cardContainer, arrowColor);
		}

		// キューバッジ
		if (queued) {
			const badge = new Graphics();
			badge.circle(0, 0, QUEUE_BADGE_SIZE / 2);
			badge.fill(CARD_COLORS.selectedBorder);
			badge.x = CARD_WIDTH - 6;
			badge.y = -4;
			cardContainer.addChild(badge);

			const badgeText = new Text({
				text: `${queueIndex}`,
				style: {
					fontSize: 12,
					fontFamily: "sans-serif",
					fill: 0xffffff,
					fontWeight: "bold",
				},
			});
			badgeText.anchor.set(0.5);
			badgeText.x = CARD_WIDTH - 6;
			badgeText.y = -4;
			cardContainer.addChild(badgeText);
		}

		// インタラクション（ドラッグ＆クリック兼用）
		{
			const cardIndex = this.currentHand.indexOf(card);
			cardContainer.eventMode = "static";
			cardContainer.cursor = "pointer";

			cardContainer.on("pointerdown", (event: FederatedPointerEvent) => {
				if (event.button !== 0) return;
				if (this.isInputLocked) return;
				if (!this.isInteractionEnabled) return;

				// ドラッグ準備開始
				this.isDragging = true;
				this.dragConfirmed = false;
				this.dragCardIndex = cardIndex;
				this.dragCardContainer = cardContainer;
				this.dragStartX = event.global.x;
				this.dragStartY = event.global.y;
				this.dragCurrentX = event.global.x;
				this.dragInsertIndex = cardIndex;
			});

			// ドロップ検知: pointerup（カード上でリリース）+ pointerupoutside（カード外でリリース）
			// PixiJS v8にはglobalpointerupが存在しないため、各カードで検知する
			cardContainer.on("pointerup", (e: FederatedPointerEvent) => {
				this.handleDragEnd(e);
			});
			cardContainer.on("pointerupoutside", (e: FederatedPointerEvent) => {
				this.handleDragEnd(e);
			});

			cardContainer.on("pointerover", () => {
				if (this.isDragging) return;
				if (!this.isInteractionEnabled) return;
				if (this.hoveredCardId === card.id) return;
				this.hoveredCardId = card.id;
				this.render(this.currentHand);
			});

			cardContainer.on("pointerout", () => {
				if (this.isDragging) return;
				if (!this.isInteractionEnabled) return;
				if (this.hoveredCardId !== card.id) return;
				this.hoveredCardId = null;
				this.render(this.currentHand);
			});
		}

		return cardContainer;
	}

	/**
	 * カード消費アニメーション
	 * パルス拡大 → 飛行+縮小+フェード → パーティクル放出
	 */
	private async animateCardConsume(
		container: Container,
		cardType: CardType,
	): Promise<void> {
		try {
			// フェーズ1a: パルス拡大
			await tween(
				container,
				{ scaleX: PULSE_SCALE, scaleY: PULSE_SCALE },
				{ duration: PULSE_UP_DURATION, easing: Easing.easeOut },
			);
			// フェーズ1b: 飛行+縮小+フェード
			const flyTargetY = container.y + CONSUME_FLY_TARGET_Y;
			await tween(
				container,
				{ y: flyTargetY, scaleX: 0.3, scaleY: 0.3, alpha: 0 },
				{ duration: CONSUME_FLY_DURATION, easing: Easing.easeOut },
			);
			// フェーズ2: パーティクル放出（fire-and-forget）
			if (this.particleSystem) {
				const globalPos = container.getGlobalPosition();
				const localPos = this.particleSystem.getContainer().toLocal(globalPos);
				this.particleSystem.emit({
					count: CONSUME_PARTICLE_COUNT,
					origin: { x: localPos.x, y: localPos.y },
					color: CARD_GLOW_COLORS[cardType],
					speed: { min: 50, max: 150 },
					life: { min: 300, max: 600 },
					size: { min: 2, max: 5 },
					pattern: { type: "radial" },
				});
			}
		} catch (e) {
			// render() によるカード破棄等、想定内のタイミングエラーの可能性があるため warn で記録
			console.warn("animateCardConsume failed:", e);
		}
	}

	/**
	 * 方向ヒント（矢印）をカードに追加
	 */
	private addDirectionHints(cardContainer: Container, color: number): void {
		const arrows = [
			{ text: "↑", x: CARD_WIDTH / 2, y: 8 },
			{ text: "↓", x: CARD_WIDTH / 2, y: CARD_HEIGHT - 8 },
			{ text: "←", x: 8, y: CARD_HEIGHT / 2 },
			{ text: "→", x: CARD_WIDTH - 8, y: CARD_HEIGHT / 2 },
		];

		for (const arrow of arrows) {
			const arrowText = new Text({
				text: arrow.text,
				style: {
					fontSize: 12,
					fontFamily: "sans-serif",
					fill: color,
				},
			});
			arrowText.anchor.set(0.5);
			arrowText.x = arrow.x;
			arrowText.y = arrow.y;
			cardContainer.addChild(arrowText);
		}
	}

	/**
	 * ホバー中カードのツールチップを更新
	 */
	private updateTooltip(hand: Card[]): void {
		this.tooltipContainer.removeChildren();

		if (!this.hoveredCardId) return;

		const hoveredCard = hand.find((c) => c.id === this.hoveredCardId);
		if (!hoveredCard) return;

		const cardIndex = hand.findIndex((c) => c.id === this.hoveredCardId);
		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;
		const cardCenterX =
			startX + cardIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;

		const { container: tooltip, height: tooltipHeight } =
			createCardTooltip(hoveredCard);
		tooltip.x = cardCenterX - TOOLTIP_WIDTH / 2;
		tooltip.y = -HOVER_LIFT - tooltipHeight - TOOLTIP_MARGIN;

		this.tooltipContainer.addChild(tooltip);
	}

	/**
	 * ドラッグ中のポインタ移動処理
	 */
	private handleDragMove(globalX: number, globalY: number): void {
		if (!this.isDragging) return;

		this.dragCurrentX = globalX;

		const dx = globalX - this.dragStartX;
		const dy = globalY - this.dragStartY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (!this.dragConfirmed && distance >= DRAG_THRESHOLD) {
			this.dragConfirmed = true;
			this.hoveredCardId = null;
			this.tooltipContainer.removeChildren();
		}

		if (this.dragConfirmed) {
			this.dragInsertIndex = this.calculateInsertIndex(globalX);
			this.renderDragState();
		}
	}

	/**
	 * ドラッグ終了（ポインタアップ）処理
	 */
	private handleDragEnd(event: FederatedPointerEvent): void {
		if (!this.isDragging) return;

		const wasDragConfirmed = this.dragConfirmed;
		const fromIndex = this.dragCardIndex;
		const toIndex = this.dragInsertIndex;

		// ドラッグ状態リセット
		this.isDragging = false;
		this.dragConfirmed = false;
		this.dragCardIndex = -1;
		this.dragCardContainer = null;
		this.dragInsertIndex = -1;

		if (wasDragConfirmed) {
			// ドロップ: 並べ替えコールバック呼び出し
			if (fromIndex !== toIndex) {
				this.onReorder?.(fromIndex, toIndex);
			} else {
				// 同じ位置にドロップした場合は再描画のみ
				this.render(this.currentHand);
			}
		} else {
			// クリック: 既存のクリック処理を実行
			this.handleCardClick(fromIndex, event);
		}
	}

	/**
	 * カードクリック処理（ドラッグでなかった場合に呼ばれる）
	 */
	private handleCardClick(
		cardIndex: number,
		event: FederatedPointerEvent,
	): void {
		if (cardIndex < 0 || cardIndex >= this.currentHand.length) return;

		const card = this.currentHand[cardIndex];
		const used = this.currentUsedCardIds.has(card.id);
		const enabled = !used;

		if (!enabled) return;

		// 二重クリック防止
		if (this.isInputLocked) return;
		this.isInputLocked = true;
		this.hoveredCardId = null;

		// 方向判定
		let direction: Direction | undefined;
		if (
			card.type === "move" ||
			card.type === "attack" ||
			card.type === "strong_attack" ||
			card.type === "jump"
		) {
			const cardContainer = this.cardsContainer.children[
				cardIndex
			] as Container;
			const cardGlobalPos = cardContainer.getGlobalPosition();
			direction = getDirectionFromClickPosition(
				event.global.x - cardGlobalPos.x,
				event.global.y - cardGlobalPos.y,
			);
		}

		const invokeCallback = () => {
			if (direction !== undefined) {
				return this.onCardSelect?.(card, direction);
			}
			return this.onCardSelect?.(card);
		};

		const cardContainer = this.cardsContainer.children[cardIndex] as Container;

		// コールバックを同期的に呼び出し、即座にロックを解放する。
		// これによりカードアクションアニメーション中（async待機中）でも予約クリックが通る。
		// consumeアニメーション中は再ロックして二重クリックを防止する。
		const callbackResult = invokeCallback();
		this.isInputLocked = false;

		Promise.resolve(callbackResult)
			.then((result) => {
				if (result === false) {
					this.render(this.currentHand);
					return;
				}
				this.isInputLocked = true;
				return this.animateCardConsume(cardContainer, card.type).finally(() => {
					this.isInputLocked = false;
					this.render(this.currentHand);
				});
			})
			.catch((error) => {
				console.error("onCardSelect callback failed:", error);
				this.isInputLocked = false;
				this.render(this.currentHand);
			});
	}

	/**
	 * ドラッグ中のビジュアル更新
	 */
	private renderDragState(): void {
		const hand = this.currentHand;
		if (hand.length === 0) return;

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		// children配列はsortChildren()で並び替わるため、
		// 各カードの実インデックスをrender()時の追加順で特定する
		for (let i = 0; i < this.cardsContainer.children.length; i++) {
			const child = this.cardsContainer.children[i] as Container;

			if (child === this.dragCardContainer) {
				// ドラッグ中カード: ポインタ追従
				const containerGlobalPos = this.container.getGlobalPosition();
				child.x = this.dragCurrentX - containerGlobalPos.x - CARD_WIDTH / 2;
				child.y = -DRAG_LIFT;
				child.zIndex = 1;
				child.alpha = 0.8;
			} else {
				// 他のカード: 挿入位置に応じてスライド
				const actualIndex = this.getActualIndex(child);
				const visualIndex = this.getVisualIndex(actualIndex);
				const targetX = startX + visualIndex * (CARD_WIDTH + CARD_GAP);
				child.x = targetX;
				child.y = 0;
				child.zIndex = 0;
				child.alpha = 1;
			}
		}

		this.cardsContainer.sortChildren();
	}

	/**
	 * ドラッグ中のカードの挿入先インデックスを計算
	 * 隣接カード中心の中間点をスロット境界として使用
	 */
	private calculateInsertIndex(globalX: number): number {
		const hand = this.currentHand;
		if (hand.length <= 1) return 0;

		const containerGlobalPos = this.container.getGlobalPosition();
		const localX = globalX - containerGlobalPos.x;

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;
		const step = CARD_WIDTH + CARD_GAP;

		for (let i = 0; i < hand.length - 1; i++) {
			const currentCenter = startX + i * step + CARD_WIDTH / 2;
			const nextCenter = startX + (i + 1) * step + CARD_WIDTH / 2;
			const boundary = (currentCenter + nextCenter) / 2;
			if (localX < boundary) {
				return i;
			}
		}
		return hand.length - 1;
	}

	/**
	 * コンテナのラベルから実インデックスを取得
	 */
	private getActualIndex(child: Container): number {
		const match = child.label?.match(/^card-(\d+)$/);
		return match ? Number(match[1]) : -1;
	}

	/**
	 * ドラッグ中の表示位置インデックスを取得
	 * ドラッグ中カードが抜けた穴を埋めるようにシフト
	 */
	private getVisualIndex(actualIndex: number): number {
		if (actualIndex === this.dragCardIndex) return this.dragInsertIndex;

		// ドラッグ元からカードが抜けた影響を計算
		let visualIndex = actualIndex;

		if (this.dragCardIndex < this.dragInsertIndex) {
			// 前→後への移動: ドラッグ元〜挿入先の間のカードが左にシフト
			if (
				actualIndex > this.dragCardIndex &&
				actualIndex <= this.dragInsertIndex
			) {
				visualIndex = actualIndex - 1;
			}
		} else if (this.dragCardIndex > this.dragInsertIndex) {
			// 後→前への移動: 挿入先〜ドラッグ元の間のカードが右にシフト
			if (
				actualIndex >= this.dragInsertIndex &&
				actualIndex < this.dragCardIndex
			) {
				visualIndex = actualIndex + 1;
			}
		}

		return visualIndex;
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.cardsContainer.removeChildren();
		this.tooltipContainer.removeChildren();
		this.selectedCardId = null;
		this.hoveredCardId = null;
		this.currentUsedCardIds = new Set();
		this.currentQueuedCardIndexMap = new Map();
		this.currentComboHistory = null;
		this.isDragging = false;
		this.dragConfirmed = false;
		this.dragCardIndex = -1;
		this.dragCardContainer = null;
		this.dragInsertIndex = -1;
	}

	/**
	 * カードに対するコンボ予告表示の種別を判定
	 */
	private getComboPreviewType(cardType: CardType): {
		type: "chain" | "charge";
		direction?: Direction;
	} | null {
		if (this.currentComboHistory === null) return null;
		if (cardType !== "attack") return null;

		const { lastCardType, lastDirection } = this.currentComboHistory;

		if (lastCardType === "attack") {
			return { type: "chain" };
		}

		if (lastCardType === "move" && lastDirection !== null) {
			return { type: "charge", direction: lastDirection };
		}

		return null;
	}
}
