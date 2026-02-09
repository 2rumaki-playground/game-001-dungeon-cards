/**
 * デバッグカード表示UI（DEV環境限定）
 * 通常手札の下に小型カード2枚を常時表示
 */

import { Container, Graphics, Text } from "pixi.js";
import type { DebugCardType } from "../types/debugCard";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";

/** デバッグカード描画定数 */
const DEBUG_CARD_WIDTH = 70;
const DEBUG_CARD_HEIGHT = 50;
const DEBUG_CARD_GAP = 8;
const DEBUG_CARD_RADIUS = 6;

/** デバッグカード色（警告色） */
const DEBUG_CARD_COLORS = {
	bg: 0x5a4a00,
	border: 0xccaa00,
} as const;

/** デバッグカード定義 */
const DEBUG_CARDS: { type: DebugCardType; label: string }[] = [
	{ type: "debug_oneshot_kill", label: "一撃" },
	{ type: "debug_teleport", label: "テレポート" },
];

/**
 * デバッグカードレンダラー
 */
export class DebugCardRenderer {
	private container: Container;
	private onCardSelect: ((cardType: DebugCardType) => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	getContainer(): Container {
		return this.container;
	}

	getTotalWidth(): number {
		return (
			DEBUG_CARDS.length * DEBUG_CARD_WIDTH +
			(DEBUG_CARDS.length - 1) * DEBUG_CARD_GAP
		);
	}

	setOnCardSelect(callback: (cardType: DebugCardType) => void): void {
		this.onCardSelect = callback;
	}

	render(): void {
		this.container.removeChildren();

		const totalWidth =
			DEBUG_CARDS.length * DEBUG_CARD_WIDTH +
			(DEBUG_CARDS.length - 1) * DEBUG_CARD_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < DEBUG_CARDS.length; i++) {
			const card = DEBUG_CARDS[i];
			const cardContainer = this.createDebugCard(card.type, card.label);
			cardContainer.x = startX + i * (DEBUG_CARD_WIDTH + DEBUG_CARD_GAP);
			this.container.addChild(cardContainer);
		}
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}

	private createDebugCard(type: DebugCardType, label: string): Container {
		const card = new Container();

		const bg = new Graphics();
		drawRoundedRect(
			bg,
			DEBUG_CARD_WIDTH,
			DEBUG_CARD_HEIGHT,
			DEBUG_CARD_RADIUS,
			DEBUG_CARD_COLORS.bg,
			{ color: DEBUG_CARD_COLORS.border, width: 2 },
		);
		card.addChild(bg);

		// DEVバッジ
		const badge = new Text({
			text: "DEV",
			style: {
				fontSize: 8,
				fontFamily: "sans-serif",
				fill: 0xffcc00,
				fontWeight: "bold",
			},
		});
		badge.x = 4;
		badge.y = 2;
		card.addChild(badge);

		// カード名
		const nameText = new Text({
			text: label,
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		nameText.anchor.set(0.5);
		nameText.x = DEBUG_CARD_WIDTH / 2;
		nameText.y = DEBUG_CARD_HEIGHT / 2 + 4;
		card.addChild(nameText);

		makeInteractive(card, () => {
			this.onCardSelect?.(type);
		});

		return card;
	}
}
