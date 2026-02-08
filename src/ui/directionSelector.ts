/**
 * 方向選択UI
 * 移動・攻撃カード使用時に上下左右の方向を選択する
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Direction } from "../types";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";

/** ボタンサイズ */
const BUTTON_SIZE = 56;
const BUTTON_GAP = 8;
const BUTTON_RADIUS = 8;

/** 方向ボタン色 */
const DIRECTION_COLORS = {
	bg: 0x2a5a3a,
	border: 0x4a8a5a,
} as const;

/** キャンセルボタン色 */
const CANCEL_COLORS = {
	bg: 0x5a3a3a,
	border: 0x8a5a5a,
} as const;

/** 方向ボタン定義 */
const DIRECTION_BUTTONS: {
	direction: Direction;
	label: string;
	dx: number;
	dy: number;
}[] = [
	{ direction: "up", label: "\u2191", dx: 0, dy: -(BUTTON_SIZE + BUTTON_GAP) },
	{
		direction: "left",
		label: "\u2190",
		dx: -(BUTTON_SIZE + BUTTON_GAP),
		dy: 0,
	},
	{ direction: "right", label: "\u2192", dx: BUTTON_SIZE + BUTTON_GAP, dy: 0 },
	{ direction: "down", label: "\u2193", dx: 0, dy: BUTTON_SIZE + BUTTON_GAP },
];

/**
 * 方向選択UIコンポーネント
 */
export class DirectionSelector {
	private container: Container;
	private onDirectionSelect: ((direction: Direction) => void) | null = null;
	private onCancel: (() => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 方向選択コールバックを設定
	 */
	setOnDirectionSelect(callback: (direction: Direction) => void): void {
		this.onDirectionSelect = callback;
	}

	/**
	 * キャンセルコールバックを設定
	 */
	setOnCancel(callback: () => void): void {
		this.onCancel = callback;
	}

	/**
	 * 表示
	 */
	show(): void {
		this.container.removeChildren();

		// 方向ボタン
		for (const btn of DIRECTION_BUTTONS) {
			const button = this.createButton(
				btn.label,
				btn.dx,
				btn.dy,
				DIRECTION_COLORS,
				() => this.onDirectionSelect?.(btn.direction),
			);
			this.container.addChild(button);
		}

		// キャンセルボタン
		const cancelY = (BUTTON_SIZE + BUTTON_GAP) * 2;
		const cancelButton = this.createButton(
			"\u53D6\u6D88",
			0,
			cancelY,
			CANCEL_COLORS,
			() => this.onCancel?.(),
		);
		this.container.addChild(cancelButton);

		this.container.visible = true;
	}

	/**
	 * 非表示
	 */
	hide(): void {
		this.container.visible = false;
		this.container.removeChildren();
	}

	/**
	 * 表示中かどうか
	 */
	isVisible(): boolean {
		return this.container.visible;
	}

	/**
	 * ボタンを生成
	 */
	private createButton(
		label: string,
		x: number,
		y: number,
		colors: { bg: number; border: number },
		onClick: () => void,
	): Container {
		const button = new Container();
		button.x = x - BUTTON_SIZE / 2;
		button.y = y - BUTTON_SIZE / 2;

		const bg = new Graphics();
		drawRoundedRect(bg, BUTTON_SIZE, BUTTON_SIZE, BUTTON_RADIUS, colors.bg, {
			color: colors.border,
			width: 2,
		});
		button.addChild(bg);

		const text = new Text({
			text: label,
			style: {
				fontSize: 20,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = BUTTON_SIZE / 2;
		text.y = BUTTON_SIZE / 2;
		button.addChild(text);

		makeInteractive(button, onClick);

		return button;
	}
}
