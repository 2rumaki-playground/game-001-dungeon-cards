/**
 * 手札UI描画
 * @see docs/spec/mvp/cards.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST } from "../constants";
import type { Card, CardType, Direction } from "../types";
import { Easing, tween } from "../utils/tween";

/** カード描画定数 */
export const CARD_WIDTH = 90;
export const CARD_HEIGHT = 120;
const CARD_GAP = 8;
const CARD_RADIUS = 8;

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

/** 選択パルスの拡大率 */
const PULSE_SCALE = 1.1;

/** 選択パルスの拡大時間（ms） */
const PULSE_UP_DURATION = 80;

/** 選択パルスの縮小時間（ms） */
const PULSE_DOWN_DURATION = 100;

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

/** カード色定義 */
const CARD_COLORS = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	attack: { bg: 0x8c2a2a, border: 0xca4a4a },
	strong_attack: { bg: 0x8c5a2a, border: 0xca8a4a },
	rush: { bg: 0x2a6a3a, border: 0x4aaa5a },
	wait: { bg: 0x5a5a2a, border: 0x8c8c4a },
	disabled: { bg: 0x2a2a2a, border: 0x4a4a4a },
	selectedBorder: 0xffd700,
	hoveredBorder: 0x88ccff,
} as const;

/** カード種別の日本語名 */
const CARD_TYPE_NAME: Record<CardType, string> = {
	move: "移動",
	attack: "攻撃",
	strong_attack: "強攻撃",
	rush: "突進",
	wait: "待機",
};

/**
 * 手札レンダラー
 */
export class HandRenderer {
	private container: Container;
	private selectedCardId: string | null = null;
	private hoveredCardId: string | null = null;
	private currentHand: Card[] = [];
	private currentAp = 0;
	private onCardSelect: ((card: Card, direction?: Direction) => void) | null =
		null;

	constructor() {
		this.container = new Container();
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
	setOnCardSelect(callback: (card: Card, direction?: Direction) => void): void {
		this.onCardSelect = callback;
	}

	/**
	 * 選択中カードIDを設定
	 */
	setSelectedCard(cardId: string | null): void {
		this.selectedCardId = cardId;
	}

	/**
	 * 手札を描画
	 */
	render(hand: Card[], currentAp: number): void {
		this.currentHand = hand;
		this.currentAp = currentAp;
		this.container.removeChildren();

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < hand.length; i++) {
			const card = hand[i];
			const x = startX + i * (CARD_WIDTH + CARD_GAP);
			const cost = CARD_COST[card.type];
			const enabled = currentAp >= cost;
			const selected = card.id === this.selectedCardId;
			const hovered = enabled && card.id === this.hoveredCardId;
			const y = hovered ? -HOVER_LIFT : 0;

			const cardContainer = this.createCardView(
				card,
				x,
				y,
				enabled,
				selected,
				hovered,
			);
			this.container.addChild(cardContainer);
		}
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
		this.container.removeChildren();

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

			this.container.addChild(cardContainer);
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
	): Container {
		const cardContainer = new Container();
		cardContainer.x = x;
		cardContainer.y = y;

		// 背景
		const bg = new Graphics();
		const colors = enabled ? CARD_COLORS[card.type] : CARD_COLORS.disabled;
		const borderColor = selected
			? CARD_COLORS.selectedBorder
			: hovered
				? CARD_COLORS.hoveredBorder
				: colors.border;
		const borderWidth = selected ? 3 : 2;

		bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
		bg.fill(colors.bg);
		bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
		bg.stroke({ color: borderColor, width: borderWidth });

		cardContainer.addChild(bg);

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
		nameText.y = 30;
		cardContainer.addChild(nameText);

		// APコスト
		const cost = CARD_COST[card.type];
		const costText = new Text({
			text: `AP: ${cost}`,
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: enabled ? 0xcccccc : 0x666666,
			},
		});
		costText.anchor.set(0.5, 0);
		costText.x = CARD_WIDTH / 2;
		costText.y = 70;
		cardContainer.addChild(costText);

		// 方向カードには方向ヒントを表示
		if (
			card.type === "move" ||
			card.type === "attack" ||
			card.type === "strong_attack"
		) {
			const arrowColor = enabled ? 0x888888 : 0x444444;
			this.addDirectionHints(cardContainer, arrowColor);
		}

		// インタラクション
		if (enabled) {
			cardContainer.eventMode = "static";
			cardContainer.cursor = "pointer";

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

			cardContainer.on("pointerdown", (event) => {
				this.animateCardPulse(cardContainer);
				// 方向パラメータを持つカードの場合、クリック位置から方向を判定
				if (
					card.type === "move" ||
					card.type === "attack" ||
					card.type === "strong_attack"
				) {
					const direction = getDirectionFromClickPosition(
						event.global.x - cardContainer.getGlobalPosition().x,
						event.global.y - cardContainer.getGlobalPosition().y,
					);
					this.onCardSelect?.(card, direction);
				} else {
					this.onCardSelect?.(card);
				}
			});
		}

		return cardContainer;
	}

	/**
	 * カード選択時のパルスアニメーション（fire-and-forget）
	 */
	private async animateCardPulse(container: Container): Promise<void> {
		try {
			await tween(
				container,
				{ scaleX: PULSE_SCALE, scaleY: PULSE_SCALE },
				{ duration: PULSE_UP_DURATION, easing: Easing.easeOut },
			);
			await tween(
				container,
				{ scaleX: 1, scaleY: 1 },
				{ duration: PULSE_DOWN_DURATION, easing: Easing.easeOut },
			);
		} catch {
			// render() でカードが破棄された場合のエラーは無視
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
	 * クリア
	 */
	clear(): void {
		this.container.removeChildren();
		this.selectedCardId = null;
		this.hoveredCardId = null;
	}
}
