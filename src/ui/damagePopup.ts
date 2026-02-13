/**
 * ダメージ/回復/MISSポップアップのアニメーション関数
 */

import { type Container, Text } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { Position } from "../types";
import { tween } from "../utils/tween";
import { gridToPixel } from "./coordinates";
import {
	DAMAGE_POPUP_DURATION,
	DAMAGE_POPUP_RISE,
	DAMAGE_POPUP_STROKE_COLOR,
	DAMAGE_POPUP_STROKE_WIDTH,
	MISS_POPUP_COLOR,
	MISS_POPUP_DURATION,
	MISS_POPUP_FONT_SIZE,
	MISS_POPUP_RISE,
	POPUP_COLORS,
	type PopupType,
} from "./mapAnimationConstants";
import { calcPopupFontSize } from "./popupLogic";

/**
 * ダメージ/回復数値ポップアップアニメーション
 * 対象セルの中央上部に数値を表示し、上昇しながらフェードアウト
 * @param container ポップアップを追加する親コンテナ
 * @param gridPos 対象のグリッド座標
 * @param amount 数値
 * @param popupType ポップアップ種別（デフォルト: "damage"）
 */
export async function animateDamagePopup(
	container: Container,
	gridPos: Position,
	amount: number,
	popupType: PopupType = "damage",
): Promise<void> {
	const pixelPos = gridToPixel(gridPos);
	const prefix = popupType === "heal" ? "+" : "-";
	const color = POPUP_COLORS[popupType];

	const fontSize = calcPopupFontSize(amount);
	const text = new Text({
		text: `${prefix}${amount}`,
		style: {
			fontSize,
			fontWeight: "bold",
			fill: color,
			stroke: {
				color: DAMAGE_POPUP_STROKE_COLOR,
				width: DAMAGE_POPUP_STROKE_WIDTH,
			},
		},
	});

	// セル上端にテキスト下端が来るように中央下アンカーで配置
	text.anchor.set(0.5, 1);
	text.x = pixelPos.x + CELL_SIZE / 2;
	text.y = pixelPos.y;

	container.addChild(text);

	await tween(
		text,
		{ y: text.y - DAMAGE_POPUP_RISE, alpha: 0 },
		{ duration: DAMAGE_POPUP_DURATION },
	);

	container.removeChild(text);
	text.destroy();
}

/**
 * ミスポップアップアニメーション
 * 対象セルの中央上部にグレー文字で「MISS」を表示し、上昇しながらフェードアウト
 * @param container ポップアップを追加する親コンテナ
 * @param gridPos 対象のグリッド座標
 */
export async function animateMissPopup(
	container: Container,
	gridPos: Position,
): Promise<void> {
	const pixelPos = gridToPixel(gridPos);
	const text = new Text({
		text: "MISS",
		style: {
			fontSize: MISS_POPUP_FONT_SIZE,
			fontWeight: "bold",
			fontStyle: "italic",
			fill: MISS_POPUP_COLOR,
		},
	});

	text.anchor.set(0.5, 1);
	text.x = pixelPos.x + CELL_SIZE / 2;
	text.y = pixelPos.y;

	container.addChild(text);

	await tween(
		text,
		{ y: text.y - MISS_POPUP_RISE, alpha: 0 },
		{ duration: MISS_POPUP_DURATION },
	);

	container.removeChild(text);
	text.destroy();
}
