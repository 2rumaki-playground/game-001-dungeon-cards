/**
 * 手札UI描画
 * @see docs/spec/mvp/cards.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { getEffectiveCardCost } from "../game/debugCheats";
import type { Card, CardType, ComboHistory, Direction } from "../types";
import { Easing, tween } from "../utils/tween";
import {
	CARD_COLORS as BASE_CARD_COLORS,
	CARD_GLOW_COLORS,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
} from "./cardConstants";
import {
	createCardTooltip,
	TOOLTIP_MARGIN,
	TOOLTIP_WIDTH,
} from "./cardTooltip";
import {
	drawEdgeLine,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
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
	private currentAp = 0;
	private currentUsedCardIds: ReadonlySet<string> = new Set();
	private currentQueuedCardIndexMap: ReadonlyMap<string, number> = new Map();
	private currentComboHistory: ComboHistory | null = null;
	private onCardSelect:
		| ((
				card: Card,
				direction?: Direction,
		  ) => undefined | false | Promise<undefined | false>)
		| null = null;
	private isInputLocked = false;

	constructor(particleSystem?: ParticleSystem) {
		this.container = new Container();
		this.cardsContainer = new Container();
		this.cardsContainer.label = "cards";
		this.tooltipContainer = new Container();
		this.tooltipContainer.label = "tooltip";
		this.container.addChild(this.cardsContainer);
		this.container.addChild(this.tooltipContainer);
		this.particleSystem = particleSystem ?? null;
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
	render(hand: Card[], currentAp: number): void {
		this.currentHand = hand;
		this.currentAp = currentAp;
		this.cardsContainer.removeChildren();

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < hand.length; i++) {
			const card = hand[i];
			const x = startX + i * (CARD_WIDTH + CARD_GAP);
			const cost = getEffectiveCardCost(card.type);
			const used = this.currentUsedCardIds.has(card.id);
			const enabled = !used && currentAp >= cost;
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
	 * @param currentAp 現在のAP
	 * @param newCardCount 新しく引いたカードの枚数（アニメーション対象）
	 * @returns アニメーション完了時にresolveするPromise
	 */
	async renderWithAnimation(
		hand: Card[],
		currentAp: number,
		newCardCount: number,
	): Promise<void> {
		this.currentHand = hand;
		this.currentAp = currentAp;
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

			// アニメーション完了後に this.render(hand, currentAp) で enabled を再計算して有効化するため、
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
		this.render(hand, currentAp);
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

		// APコスト
		const cost = getEffectiveCardCost(card.type);
		const costFill = !enabled
			? 0x666666
			: cost >= 2
				? 0xffaa44
				: cost === 0
					? 0x666666
					: 0xcccccc;
		const costText = new Text({
			text: cost > 0 ? `AP: ${cost}` : "",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: costFill,
				fontWeight: cost >= 2 ? "bold" : "normal",
			},
		});
		costText.anchor.set(0.5, 0);
		costText.x = CARD_WIDTH / 2;
		costText.y = 56;
		cardContainer.addChild(costText);

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

		// インタラクション
		if (enabled) {
			makeInteractive(cardContainer, (event) => {
				// 二重クリック防止：アニメーション中は追加クリックを無視
				if (this.isInputLocked) return;
				this.isInputLocked = true;
				this.hoveredCardId = null;

				// 方向判定はアニメーション前に計算して保持
				let direction: Direction | undefined;
				if (
					card.type === "move" ||
					card.type === "attack" ||
					card.type === "strong_attack" ||
					card.type === "jump"
				) {
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

				Promise.resolve()
					.then(invokeCallback)
					.then((result) => {
						// onCardSelectがfalseを返した場合は無効クリック（アニメーションスキップ）
						if (result === false) return;
						return this.animateCardConsume(cardContainer, card.type);
					})
					.catch((error) => {
						console.error("onCardSelect callback failed:", error);
					})
					.finally(() => {
						this.isInputLocked = false;
						this.render(this.currentHand, this.currentAp);
					});
			});

			cardContainer.on("pointerover", () => {
				if (this.hoveredCardId === card.id) return;
				this.hoveredCardId = card.id;
				this.render(this.currentHand, this.currentAp);
			});

			cardContainer.on("pointerout", () => {
				if (this.hoveredCardId !== card.id) return;
				this.hoveredCardId = null;
				this.render(this.currentHand, this.currentAp);
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

		const cost = getEffectiveCardCost(hoveredCard.type);
		if (this.currentAp < cost) return;

		const cardIndex = hand.findIndex((c) => c.id === this.hoveredCardId);
		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;
		const cardCenterX =
			startX + cardIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;

		const { container: tooltip, height: tooltipHeight } = createCardTooltip(
			hoveredCard.type,
			cost,
		);
		tooltip.x = cardCenterX - TOOLTIP_WIDTH / 2;
		tooltip.y = -HOVER_LIFT - tooltipHeight - TOOLTIP_MARGIN;

		this.tooltipContainer.addChild(tooltip);
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
