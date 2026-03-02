/**
 * カードツールチップ共有モジュール
 * handRenderer, rewardScreen, deckViewer で共有されるツールチップ生成関数
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_MAX_LEVEL, CARD_XP_TABLE } from "../constants";
import { normalizeCardLevel } from "../game/cardLevel";
import type { Card, CardType } from "../types";
import {
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	getCardDescription,
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

/** カードのレベルラベルを生成 */
function formatLevelLabel(card: Card): string {
	const level = normalizeCardLevel(card);
	if (level >= CARD_MAX_LEVEL) {
		return `Lv.${level} (MAX)`;
	}
	const currentLevelXp = CARD_XP_TABLE[level - 1];
	const nextLevelXp = CARD_XP_TABLE[level];
	const current = card.exp - currentLevelXp;
	const required = nextLevelXp - currentLevelXp;
	return `Lv.${level} (XP: ${current}/${required})`;
}

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
		const levelLabel = formatLevelLabel(card);
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
	const description = getCardDescription(cardOrType);
	const descText = new Text({
		text: description,
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
		const descLineCount = description.split("\n").length;
		descHeight = descLineCount * 14;
	}
	yOffset += descHeight + 8;

	// 統計情報（Cardオブジェクトかつ1回以上使用された場合のみ表示）
	if (card && card.stats.useCount > 0) {
		// セパレータ
		const sepText = new Text({
			text: "─────────────",
			style: {
				fontSize: 10,
				fontFamily: "sans-serif",
				fill: 0x555577,
			},
		});
		sepText.x = TOOLTIP_PADDING;
		sepText.y = yOffset;
		yOffset += 14;
		tooltip.addChild(sepText);

		// 使用回数（全カード共通）
		const useText = new Text({
			text: `使用: ${card.stats.useCount}回`,
			style: {
				fontSize: 10,
				fontFamily: "sans-serif",
				fill: 0x999999,
			},
		});
		useText.x = TOOLTIP_PADDING;
		useText.y = yOffset;
		yOffset += 13;
		tooltip.addChild(useText);

		// 撃破数・最大ダメージ（attack/strong_attack のみ）
		if (card.type === "attack" || card.type === "strong_attack") {
			const defeatText = new Text({
				text: `撃破: ${card.stats.defeatCount}体`,
				style: {
					fontSize: 10,
					fontFamily: "sans-serif",
					fill: 0x999999,
				},
			});
			defeatText.x = TOOLTIP_PADDING;
			defeatText.y = yOffset;
			yOffset += 13;
			tooltip.addChild(defeatText);

			const maxDmgText = new Text({
				text: `最大: ${card.stats.maxSingleDamage}ダメージ`,
				style: {
					fontSize: 10,
					fontFamily: "sans-serif",
					fill: 0x999999,
				},
			});
			maxDmgText.x = TOOLTIP_PADDING;
			maxDmgText.y = yOffset;
			yOffset += 13;
			tooltip.addChild(maxDmgText);
		}

		yOffset += 2;
	}

	const tooltipHeight = yOffset + TOOLTIP_PADDING;

	// 背景（最背面に配置）
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
	tooltip.addChildAt(bg, 0);

	// テキスト要素を追加
	tooltip.addChild(nameText);
	tooltip.addChild(descText);

	return { container: tooltip, height: tooltipHeight };
}
