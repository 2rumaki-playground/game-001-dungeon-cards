/**
 * カードツールチップ共有モジュール
 * handRenderer, rewardScreen, deckViewer で共有されるツールチップ生成関数
 */

import { Container, Graphics, Text } from "pixi.js";
import type { CardType } from "../types";
import {
	CARD_DESCRIPTION,
	CARD_RARITY,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	RARITY_COLORS,
	RARITY_NAME,
} from "./cardConstants";
import { drawRoundedRect } from "./graphicsHelpers";

/** ツールチップの幅 */
export const TOOLTIP_WIDTH = 180;

/** ツールチップとカードの間隔 */
export const TOOLTIP_MARGIN = 4;

/** ツールチップ背景色 */
const TOOLTIP_BG = 0x1a1a2e;

/** ツールチップボーダー色 */
const TOOLTIP_BORDER = 0x555577;

/** ツールチップ角丸半径 */
const TOOLTIP_RADIUS = 6;

/** ツールチップ内パディング */
const TOOLTIP_PADDING = 10;

/**
 * カードツールチップのビューを生成
 * @param cardType カード種別
 * @param cost APコスト
 * @returns コンテナと高さ
 */
export function createCardTooltip(
	cardType: CardType,
	cost: number,
): {
	container: Container;
	height: number;
} {
	const tooltip = new Container();

	const rarity = CARD_RARITY[cardType];

	let yOffset = TOOLTIP_PADDING;

	// カード名 + シンボル
	const nameText = new Text({
		text: `${CARD_TYPE_SYMBOL[cardType]} ${CARD_TYPE_NAME[cardType]}`,
		style: {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	nameText.x = TOOLTIP_PADDING;
	nameText.y = yOffset;
	yOffset += 20;

	// APコスト（cost > 0 の場合のみ）
	let costText: Text | null = null;
	if (cost > 0) {
		costText = new Text({
			text: `AP: ${cost}`,
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: cost >= 2 ? 0xffaa44 : 0xcccccc,
				fontWeight: cost >= 2 ? "bold" : "normal",
			},
		});
		costText.x = TOOLTIP_PADDING;
		costText.y = yOffset;
		yOffset += 18;
	}

	// 詳細説明
	const descText = new Text({
		text: CARD_DESCRIPTION[cardType],
		style: {
			fontSize: 11,
			fontFamily: "sans-serif",
			fill: 0xaaaaaa,
			wordWrap: true,
			wordWrapWidth: TOOLTIP_WIDTH - TOOLTIP_PADDING * 2,
		},
	});
	descText.x = TOOLTIP_PADDING;
	descText.y = yOffset;
	// wordWrap による実際の折り返しを反映したテキスト高さからオフセットを算出
	let descHeight: number;
	try {
		descHeight = descText.height;
	} catch {
		// Canvas API が利用不可の場合のフォールバック
		const descLineCount = CARD_DESCRIPTION[cardType].split("\n").length;
		descHeight = descLineCount * 14;
	}
	yOffset += descHeight + 8;

	// レアリティ
	const rarityText = new Text({
		text: RARITY_NAME[rarity],
		style: {
			fontSize: 11,
			fontFamily: "sans-serif",
			fill: RARITY_COLORS[rarity],
		},
	});
	rarityText.x = TOOLTIP_PADDING;
	rarityText.y = yOffset;
	yOffset += 16;

	const tooltipHeight = yOffset + TOOLTIP_PADDING;

	// 背景
	const bg = new Graphics();
	drawRoundedRect(
		bg,
		TOOLTIP_WIDTH,
		tooltipHeight,
		TOOLTIP_RADIUS,
		TOOLTIP_BG,
		{
			color: TOOLTIP_BORDER,
			width: 1,
		},
	);
	tooltip.addChild(bg);

	// テキスト要素を追加
	tooltip.addChild(nameText);
	if (costText) tooltip.addChild(costText);
	tooltip.addChild(descText);
	tooltip.addChild(rarityText);

	return { container: tooltip, height: tooltipHeight };
}
