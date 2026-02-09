/**
 * カード行の共通描画ヘルパー
 * deckViewerとrewardScreenのカード一覧表示を統一するために使用
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST, CARD_RARITY } from "../constants";
import type { CardType } from "../types";
import {
	CARD_COLORS,
	CARD_EFFECT_TEXT,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	RARITY_COLORS,
} from "./cardConstants";
import { drawRoundedRect } from "./graphicsHelpers";

/** カード行の高さ */
export const CARD_ROW_HEIGHT = 52;

/** カード行の間隔 */
export const CARD_ROW_GAP = 6;

/** カード行のリスト幅 */
export const CARD_ROW_LIST_WIDTH = 260;

/** テキスト開始X位置 */
export const CARD_ROW_TEXT_X = 16;

/** カード行の角丸半径 */
const ROW_RADIUS = 6;

/** レアリティバー設定 */
const RARITY_BAR_X = 6;
const RARITY_BAR_WIDTH = 3;
const RARITY_BAR_PADDING = 4;
const RARITY_BAR_RADIUS = 1;

/** フォント設定 */
const NAME_FONT_SIZE = 15;
const EFFECT_FONT_SIZE = 11;
const NAME_Y = 8;
const EFFECT_Y = 30;

type CardListRowOptions = {
	/** カード種別 */
	cardType: CardType;
	/** 枚数（省略時は枚数表示なし） */
	count?: number;
	/** 行の幅（デフォルト: CARD_ROW_LIST_WIDTH） */
	width?: number;
};

/**
 * カード一覧の1行を生成する共通ヘルパー
 *
 * 背景 + レアリティバー + カード名（シンボル付き） + 効果テキスト を描画する。
 * 追加のUI要素（除去ボタン等）は呼び出し側でコンテナに追加する。
 */
export function createCardListRow(options: CardListRowOptions): Container {
	const { cardType, count, width = CARD_ROW_LIST_WIDTH } = options;
	const row = new Container();

	const colors = CARD_COLORS[cardType];
	const rarity = CARD_RARITY[cardType];
	const rarityColor = RARITY_COLORS[rarity];

	// 背景
	const bg = new Graphics();
	drawRoundedRect(bg, width, CARD_ROW_HEIGHT, ROW_RADIUS, colors.bg, {
		color: colors.border,
		width: 1,
	});
	row.addChild(bg);

	// レアリティバー
	const rarityBar = new Graphics();
	rarityBar.roundRect(
		RARITY_BAR_X,
		RARITY_BAR_PADDING,
		RARITY_BAR_WIDTH,
		CARD_ROW_HEIGHT - RARITY_BAR_PADDING * 2,
		RARITY_BAR_RADIUS,
	);
	rarityBar.fill(rarityColor);
	row.addChild(rarityBar);

	// シンボル + 種別名（+ 枚数）
	const nameStr =
		count != null
			? `${CARD_TYPE_SYMBOL[cardType]} ${CARD_TYPE_NAME[cardType]} x${count}`
			: `${CARD_TYPE_SYMBOL[cardType]} ${CARD_TYPE_NAME[cardType]}`;
	const nameText = new Text({
		text: nameStr,
		style: {
			fontSize: NAME_FONT_SIZE,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	nameText.x = CARD_ROW_TEXT_X;
	nameText.y = NAME_Y;
	row.addChild(nameText);

	// AP + 効果テキスト
	const cost = CARD_COST[cardType];
	const effectStr =
		cost > 0
			? `${CARD_EFFECT_TEXT[cardType]} / AP: ${cost}`
			: CARD_EFFECT_TEXT[cardType];
	const effectText = new Text({
		text: effectStr,
		style: {
			fontSize: EFFECT_FONT_SIZE,
			fontFamily: "sans-serif",
			fill: 0xaaaaaa,
		},
	});
	effectText.x = CARD_ROW_TEXT_X;
	effectText.y = EFFECT_Y;
	row.addChild(effectText);

	return row;
}
