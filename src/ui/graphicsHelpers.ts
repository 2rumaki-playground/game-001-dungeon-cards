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
 * 半透明オーバーレイを設定する（背面UIへのポインタ入力を吸収）
 * 呼び出し側で new Graphics() を渡す
 */
export function createOverlay(
	graphics: Graphics,
	screenWidth: number,
	screenHeight: number,
): void {
	graphics.rect(0, 0, screenWidth, screenHeight);
	graphics.fill({ color: 0x000000, alpha: 0.7 });
	graphics.eventMode = "static";
}

/** ホバー時の透明度 */
const HOVER_ALPHA = 0.8;

/**
 * ボタンのインタラクション設定（eventMode / cursor / pointerdownリスナー / ホバーエフェクト）を一括で行う
 */
export function makeInteractive(
	target: Container,
	onClick: (event: FederatedPointerEvent) => void,
): void {
	target.eventMode = "static";
	target.cursor = "pointer";
	target.on("pointerdown", (event: FederatedPointerEvent) => {
		if (event.button !== 0) return;
		onClick(event);
	});
	let alphaBeforeHover = target.alpha;
	target.on("pointerover", () => {
		alphaBeforeHover = target.alpha;
		target.alpha = HOVER_ALPHA;
	});
	target.on("pointerout", () => {
		if (target.alpha === HOVER_ALPHA) {
			target.alpha = alphaBeforeHover;
		}
	});
}
