/**
 * Graphics描画およびインタラクションの共通ヘルパー関数
 */

import type {
	Container,
	FederatedPointerEvent,
	FillInput,
	Graphics,
} from "pixi.js";

/**
 * 角丸矩形を塗りつぶし＋ストロークで描画する
 * 位置は親Containerで制御する前提で、原点(0,0)固定
 */
export function drawRoundedRect(
	graphics: Graphics,
	width: number,
	height: number,
	radius: number,
	fillColor: FillInput,
	stroke: { color: number; width: number },
): void {
	graphics.roundRect(0, 0, width, height, radius);
	graphics.fill(fillColor);
	graphics.roundRect(0, 0, width, height, radius);
	graphics.stroke(stroke);
}

/**
 * ボタンのインタラクション設定（eventMode / cursor / pointerdownリスナー）を一括で行う
 */
export function makeInteractive(
	target: Container,
	onClick: (event: FederatedPointerEvent) => void,
): void {
	target.eventMode = "static";
	target.cursor = "pointer";
	target.on("pointerdown", onClick);
}
