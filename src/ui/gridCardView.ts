/**
 * グリッド形式カードビュー生成ヘルパー
 * deckViewer / rewardScreen の共通カード描画ロジック
 */

import { Container, Graphics, Text } from "pixi.js";
import type { CardType } from "../types";
import { CARD_COLORS, CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import { drawRoundedRect } from "./graphicsHelpers";
import { CARD_HEIGHT, CARD_RADIUS, CARD_WIDTH } from "./handRenderer";

/**
 * グリッド表示用のカードビューを生成（インタラクションなし）
 *
 * 背景・シンボル・カード名を描画する。
 * インタラクション（タップ、ツールチップ等）は呼び出し側で追加すること。
 */
export function createGridCardView(cardType: CardType): Container {
	const cardContainer = new Container();

	// 背景
	const bg = new Graphics();
	const colors = CARD_COLORS[cardType];
	drawRoundedRect(bg, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, colors.bg, {
		color: colors.border,
		width: 2,
	});
	cardContainer.addChild(bg);

	// シンボル
	const symbolText = new Text({
		text: CARD_TYPE_SYMBOL[cardType],
		style: {
			fontSize: 18,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		},
	});
	symbolText.anchor.set(0.5, 0);
	symbolText.x = CARD_WIDTH / 2;
	symbolText.y = 12;
	cardContainer.addChild(symbolText);

	// カード名
	const nameText = new Text({
		text: CARD_TYPE_NAME[cardType],
		style: {
			fontSize: 16,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	nameText.anchor.set(0.5, 0);
	nameText.x = CARD_WIDTH / 2;
	nameText.y = 34;
	cardContainer.addChild(nameText);

	return cardContainer;
}
