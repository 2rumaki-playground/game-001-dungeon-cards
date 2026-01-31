/**
 * 手札UI描画
 * @see docs/spec/mvp/cards.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST } from "../constants";
import type { Card, CardType, Direction } from "../types";

/** カード描画定数 */
const CARD_WIDTH = 90;
const CARD_HEIGHT = 120;
const CARD_GAP = 8;
const CARD_RADIUS = 8;

/** カード色定義 */
const CARD_COLORS = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	attack: { bg: 0x8c2a2a, border: 0xca4a4a },
	wait: { bg: 0x5a5a2a, border: 0x8c8c4a },
	disabled: { bg: 0x2a2a2a, border: 0x4a4a4a },
	selectedBorder: 0xffd700,
} as const;

/** カード種別の日本語名 */
const CARD_TYPE_NAME: Record<CardType, string> = {
	move: "移動",
	attack: "攻撃",
	wait: "待機",
};

/**
 * 手札レンダラー
 */
export class HandRenderer {
	private container: Container;
	private selectedCardId: string | null = null;
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
		this.container.removeChildren();

		const totalWidth = hand.length * CARD_WIDTH + (hand.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < hand.length; i++) {
			const card = hand[i];
			const x = startX + i * (CARD_WIDTH + CARD_GAP);
			const cost = CARD_COST[card.type];
			const enabled = currentAp >= cost;
			const selected = card.id === this.selectedCardId;

			const cardContainer = this.createCardView(card, x, 0, enabled, selected);
			this.container.addChild(cardContainer);
		}
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
	): Container {
		const cardContainer = new Container();
		cardContainer.x = x;
		cardContainer.y = y;

		// 背景
		const bg = new Graphics();
		const colors = enabled ? CARD_COLORS[card.type] : CARD_COLORS.disabled;
		const borderColor = selected ? CARD_COLORS.selectedBorder : colors.border;
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
		if (card.type === "move" || card.type === "attack") {
			const arrowColor = enabled ? 0x888888 : 0x444444;
			this.addDirectionHints(cardContainer, arrowColor);
		}

		// インタラクション
		if (enabled) {
			cardContainer.eventMode = "static";
			cardContainer.cursor = "pointer";
			cardContainer.on("pointerdown", (event) => {
				// 方向パラメータを持つカードの場合、クリック位置から方向を判定
				if (card.type === "move" || card.type === "attack") {
					const direction = this.getDirectionFromClickPosition(
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
	 * カード内のクリック位置から方向を判定
	 * カードを対角線で4分割し、クリック位置がどの領域にあるかで方向を決定
	 */
	private getDirectionFromClickPosition(
		localX: number,
		localY: number,
	): Direction {
		const centerX = CARD_WIDTH / 2;
		const centerY = CARD_HEIGHT / 2;

		// 中心からの相対位置
		const relX = localX - centerX;
		const relY = localY - centerY;

		// 対角線で分割: |relX| > |relY| なら左右、そうでなければ上下
		// アスペクト比を考慮して正規化
		const normalizedX = relX / CARD_WIDTH;
		const normalizedY = relY / CARD_HEIGHT;

		if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
			// 左右
			return normalizedX > 0 ? "right" : "left";
		}
		// 上下
		return normalizedY > 0 ? "down" : "up";
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
	}
}
