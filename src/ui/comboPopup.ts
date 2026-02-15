/**
 * コンボ発動ポップアップのアニメーション関数
 */

import { type Container, Text } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { ComboType, Position } from "../types";
import { Easing, tween } from "../utils/tween";
import { gridToPixel } from "./coordinates";
import {
	COMBO_POPUP_COLORS,
	COMBO_POPUP_DURATION,
	COMBO_POPUP_FONT_SIZE,
	COMBO_POPUP_RISE,
	COMBO_POPUP_STROKE_COLOR,
	COMBO_POPUP_STROKE_WIDTH,
	COMBO_POPUP_TEXT,
} from "./mapAnimationConstants";

/**
 * コンボ発動ポップアップアニメーション
 * 対象セルの中央上部にコンボ名を表示し、スケールイン → 上昇フェードアウト
 * @param container ポップアップを追加する親コンテナ
 * @param gridPos 対象のグリッド座標
 * @param comboType コンボ種別
 */
export async function animateComboPopup(
	container: Container,
	gridPos: Position,
	comboType: ComboType,
): Promise<void> {
	const pixelPos = gridToPixel(gridPos);
	const color = COMBO_POPUP_COLORS[comboType];
	const label = COMBO_POPUP_TEXT[comboType];

	const text = new Text({
		text: label,
		style: {
			fontSize: COMBO_POPUP_FONT_SIZE,
			fontWeight: "bold",
			fill: color,
			stroke: {
				color: COMBO_POPUP_STROKE_COLOR,
				width: COMBO_POPUP_STROKE_WIDTH,
			},
		},
	});

	// セル上端よりやや上にアンカー（ダメージポップアップと重ならないよう少しオフセット）
	text.anchor.set(0.5, 1);
	text.x = pixelPos.x + CELL_SIZE / 2;
	text.y = pixelPos.y - 4;

	// 初期状態: スケール0
	text.scale.set(0, 0);
	text.alpha = 1;

	container.addChild(text);

	// スケールイン
	await tween(
		text,
		{ scaleX: 1, scaleY: 1 },
		{ duration: 120, easing: Easing.easeOutBack },
	);

	// 上昇フェードアウト
	await tween(
		text,
		{ y: text.y - COMBO_POPUP_RISE, alpha: 0 },
		{ duration: COMBO_POPUP_DURATION, easing: Easing.easeOut },
	);

	container.removeChild(text);
	text.destroy();
}
