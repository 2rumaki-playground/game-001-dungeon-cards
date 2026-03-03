/**
 * デッキ構築画面（報酬選択・カード除去）で使用する共通定数とヘルパー関数
 */

import { Container, Graphics, Text } from "pixi.js";
import type { CardType } from "../types";
import { CARD_COLORS, CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";
import { UI_COLOR_GOLD } from "./uiColors";

/** カードサイズ */
export const REWARD_CARD_WIDTH = 120;
export const REWARD_CARD_HEIGHT = 160;
export const REWARD_CARD_RADIUS = 8;
export const REWARD_CARD_GAP = 20;

/** ボタンサイズ */
export const BUTTON_WIDTH = 100;
export const BUTTON_HEIGHT = 32;
export const BUTTON_RADIUS = 6;

/**
 * 報酬カードの描画部分を生成（共通ロジック）
 */
export function createRewardCardView(cardType: CardType): Container {
	const cardContainer = new Container();

	const colors = CARD_COLORS[cardType];

	// 背景
	const bg = new Graphics();
	drawRoundedRect(
		bg,
		REWARD_CARD_WIDTH,
		REWARD_CARD_HEIGHT,
		REWARD_CARD_RADIUS,
		colors.bg,
		{ color: colors.border, width: 2 },
	);
	cardContainer.addChild(bg);

	// シンボル
	const symbol = new Text({
		text: CARD_TYPE_SYMBOL[cardType],
		style: {
			fontSize: 22,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		},
	});
	symbol.anchor.set(0.5, 0);
	symbol.x = REWARD_CARD_WIDTH / 2;
	symbol.y = 16;
	cardContainer.addChild(symbol);

	// カード名
	const name = new Text({
		text: CARD_TYPE_NAME[cardType],
		style: {
			fontSize: 16,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	name.anchor.set(0.5, 0);
	name.x = REWARD_CARD_WIDTH / 2;
	name.y = 42;
	cardContainer.addChild(name);

	return cardContainer;
}

/**
 * 汎用ボタン生成
 */
export function createScreenButton(
	label: string,
	x: number,
	y: number,
	bgColor: number,
	borderColor: number,
	onClick: () => void,
): Container {
	const button = new Container();
	button.x = x;
	button.y = y;

	const bg = new Graphics();
	drawRoundedRect(bg, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS, bgColor, {
		color: borderColor,
		width: 1,
	});
	button.addChild(bg);

	const text = new Text({
		text: label,
		style: {
			fontSize: 13,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	text.anchor.set(0.5);
	text.x = BUTTON_WIDTH / 2;
	text.y = BUTTON_HEIGHT / 2;
	button.addChild(text);

	makeInteractive(button, onClick);

	return button;
}

/**
 * カードにゴールドボーダーのハイライトを追加
 */
export function highlightCard(
	container: Container,
	w: number,
	h: number,
	radius: number,
): void {
	const highlight = new Graphics();
	highlight.roundRect(0, 0, w, h, radius);
	highlight.stroke({ color: UI_COLOR_GOLD, width: 3 });
	highlight.label = "highlight";
	container.addChild(highlight);
}

/**
 * カードのハイライトを解除
 */
export function unhighlightCard(container: Container): void {
	const existing = container.children.find((c) => c.label === "highlight");
	if (existing) {
		container.removeChild(existing);
		existing.destroy();
	}
}
