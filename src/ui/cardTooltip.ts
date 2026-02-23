/**
 * カードツールチップ共有モジュール
 * handRenderer, rewardScreen, deckViewer で共有されるツールチップ生成関数
 */

import { Container, Graphics, Text } from "pixi.js";
import { getExpProgress, isMaxLevel } from "../game/cardLevel";
import type { Card, CardType } from "../types";
import {
	CARD_DESCRIPTION,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
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
 * @param cardOrType カードオブジェクトまたはカード種別
 * @returns コンテナと高さ
 */
export function createCardTooltip(cardOrType: Card | CardType): {
	container: Container;
	height: number;
} {
	const card = typeof cardOrType === "string" ? null : (cardOrType as Card);
	const cardType: CardType = card ? card.type : (cardOrType as CardType);

	const tooltip = new Container();
	tooltip.eventMode = "none";
	tooltip.interactiveChildren = false;

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

	// レベル表示（Cardオブジェクトが渡された場合のみ）
	if (card) {
		const levelLabel = isMaxLevel(card)
			? `Lv.${card.level} (MAX)`
			: (() => {
					const { current, required } = getExpProgress(card);
					return `Lv.${card.level} (XP: ${current}/${required})`;
				})();
		const levelText = new Text({
			text: levelLabel,
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: 0xcccc88,
			},
		});
		levelText.x = TOOLTIP_PADDING;
		levelText.y = yOffset;
		yOffset += 16;
		tooltip.addChild(levelText);
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
	tooltip.addChild(descText);

	return { container: tooltip, height: tooltipHeight };
}
