/**
 * 手札UI描画
 * @see docs/spec/mvp/cards.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST } from "../constants";
import type { Card, CardType } from "../types";

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
	private onCardSelect: ((card: Card) => void) | null = null;

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
	 */
	setOnCardSelect(callback: (card: Card) => void): void {
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

		// インタラクション
		if (enabled) {
			cardContainer.eventMode = "static";
			cardContainer.cursor = "pointer";
			cardContainer.on("pointerdown", () => {
				this.onCardSelect?.(card);
			});
		}

		return cardContainer;
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.container.removeChildren();
		this.selectedCardId = null;
	}
}
