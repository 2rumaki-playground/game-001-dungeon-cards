/**
 * タイトル画面UI
 */

import { Container, Graphics, Text } from "pixi.js";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";
import { UI_COLORS_BUTTON_PRIMARY, UI_COLORS_DISABLED } from "./uiColors";

/** ボタン描画定数 */
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;
const BUTTON_GAP = 16;

/** ボタン色定義 */
const BUTTON_COLORS = {
	active: UI_COLORS_BUTTON_PRIMARY,
	disabled: UI_COLORS_DISABLED,
} as const;

/**
 * タイトル画面レンダラー
 */
export class TitleScreen {
	private container: Container;
	private onNewGame: (() => void) | null = null;
	private onContinue: (() => void) | null = null;

	constructor() {
		this.container = new Container();
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 新規ゲーム開始コールバックを設定
	 */
	setOnNewGame(callback: () => void): void {
		this.onNewGame = callback;
	}

	/**
	 * 続きからコールバックを設定
	 */
	setOnContinue(callback: () => void): void {
		this.onContinue = callback;
	}

	/**
	 * タイトル画面を描画
	 */
	render(screenWidth: number, screenHeight: number, canContinue = false): void {
		this.container.removeChildren();

		// ゲームタイトル
		const title = new Text({
			text: "Dungeon Cards",
			style: {
				fontSize: 36,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		title.x = screenWidth / 2;
		title.y = screenHeight / 3;
		this.container.addChild(title);

		// 新規ゲーム開始ボタン
		const centerY = screenHeight / 2 + 20;
		const newGameButton = this.createButton(
			"新規ゲーム開始",
			screenWidth / 2,
			centerY,
			true,
			() => this.onNewGame?.(),
		);
		this.container.addChild(newGameButton);

		// 続きからボタン
		const continueButton = this.createButton(
			"続きから",
			screenWidth / 2,
			centerY + BUTTON_HEIGHT + BUTTON_GAP,
			canContinue && this.onContinue !== null,
			() => this.onContinue?.(),
		);
		this.container.addChild(continueButton);
	}

	/**
	 * ボタンを生成
	 */
	private createButton(
		label: string,
		x: number,
		y: number,
		enabled: boolean,
		onClick: (() => void) | null,
	): Container {
		const button = new Container();
		button.x = x - BUTTON_WIDTH / 2;
		button.y = y - BUTTON_HEIGHT / 2;

		// 背景
		const bg = new Graphics();
		const colors = enabled ? BUTTON_COLORS.active : BUTTON_COLORS.disabled;
		drawRoundedRect(bg, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS, colors.bg, {
			color: colors.border,
			width: 2,
		});
		button.addChild(bg);

		// ラベル
		const text = new Text({
			text: label,
			style: {
				fontSize: 18,
				fontFamily: "sans-serif",
				fill: enabled ? 0xffffff : UI_COLORS_DISABLED.text,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = BUTTON_WIDTH / 2;
		text.y = BUTTON_HEIGHT / 2;
		button.addChild(text);

		// インタラクション
		if (enabled && onClick) {
			makeInteractive(button, onClick);
		}

		return button;
	}

	/**
	 * 表示
	 */
	show(): void {
		this.container.visible = true;
	}

	/**
	 * 非表示
	 */
	hide(): void {
		this.container.visible = false;
	}
}
