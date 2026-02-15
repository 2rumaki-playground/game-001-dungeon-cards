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
 * 矩形の指定された1辺をストロークで描画する
 * コンボ予告表示（charge）の1辺ハイライトに使用
 */
export function drawEdgeLine(
	graphics: Graphics,
	width: number,
	height: number,
	radius: number,
	edge: "up" | "down" | "left" | "right",
	stroke: { color: number; width: number },
): void {
	switch (edge) {
		case "up":
			graphics.moveTo(radius, 0);
			graphics.lineTo(width - radius, 0);
			break;
		case "down":
			graphics.moveTo(radius, height);
			graphics.lineTo(width - radius, height);
			break;
		case "left":
			graphics.moveTo(0, radius);
			graphics.lineTo(0, height - radius);
			break;
		case "right":
			graphics.moveTo(width, radius);
			graphics.lineTo(width, height - radius);
			break;
	}
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
	let hoverAlpha: number | null = null;
	let isHovering = false;
	target.on("pointerover", () => {
		if (isHovering) return;
		isHovering = true;
		alphaBeforeHover = target.alpha;
		const nextAlpha = Math.min(HOVER_ALPHA, alphaBeforeHover);
		target.alpha = nextAlpha;
		hoverAlpha = nextAlpha;
	});
	target.on("pointerout", () => {
		if (!isHovering) return;
		// ホバーで設定した alpha がまだ維持されている場合のみ復元する
		if (hoverAlpha !== null && target.alpha === hoverAlpha) {
			target.alpha = alphaBeforeHover;
		}
		isHovering = false;
		hoverAlpha = null;
	});
}
