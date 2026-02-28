/**
 * ポップアップテキスト表示の共通ユーティリティ
 * Text生成 → コンテナ追加 → アニメーション → クリーンアップの共通パターンを提供
 */

import { type Container, Text, type TextOptions } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { Position } from "../types";
import { gridToPixel } from "./coordinates";

/**
 * ポップアップテキストの生成・配置・アニメーション・破棄を共通化
 * @param container ポップアップを追加する親コンテナ
 * @param gridPos 対象のグリッド座標
 * @param textOptions Text コンストラクタに渡すオプション
 * @param yOffset セル上端からのY方向オフセット（0でセル上端）
 * @param animate テキストに対するアニメーション処理
 */
export async function withPopupText(
	container: Container,
	gridPos: Position,
	textOptions: TextOptions,
	yOffset: number,
	animate: (text: Text) => Promise<void>,
): Promise<void> {
	const pixelPos = gridToPixel(gridPos);
	const text = new Text(textOptions);
	text.anchor.set(0.5, 1);
	text.x = pixelPos.x + CELL_SIZE / 2;
	text.y = pixelPos.y + yOffset;
	container.addChild(text);
	try {
		await animate(text);
	} finally {
		container.removeChild(text);
		text.destroy();
	}
}
