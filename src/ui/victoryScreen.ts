/**
 * 勝利画面UI
 */

import { Container, Graphics, Text } from "pixi.js";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";
import {
	UI_COLORS_BUTTON_PRIMARY,
	UI_COLORS_BUTTON_SECONDARY,
} from "./uiColors";

/** ボタン描画定数 */
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;
const BUTTON_GAP = 16;

/**
 * 勝利画面レンダラー
 */
export class VictoryScreen {
	private container: Container;
	private onContinue: (() => void) | null = null;
	private onReturnToTitle: (() => void) | null = null;

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
	 * 「続ける」コールバックを設定
	 */
	setOnContinue(callback: () => void): void {
		this.onContinue = callback;
	}

	/**
	 * 「タイトルに戻る」コールバックを設定
	 */
	setOnReturnToTitle(callback: () => void): void {
		this.onReturnToTitle = callback;
	}

	/**
	 * 勝利画面を描画
	 */
	render(floor: number, screenWidth: number, screenHeight: number): void {
		this.container.removeChildren();

		// ダンジョンクリアテキスト
		const title = new Text({
			text: "ダンジョンクリア！",
			style: {
				fontSize: 36,
				fontFamily: "sans-serif",
				fill: 0x44cc44,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		title.x = screenWidth / 2;
		title.y = screenHeight / 3;
		this.container.addChild(title);

		// 到達階層テキスト
		const floorText = new Text({
			text: `到達階層: ${floor}`,
			style: {
				fontSize: 24,
				fontFamily: "sans-serif",
				fill: 0xffffff,
			},
		});
		floorText.anchor.set(0.5);
		floorText.x = screenWidth / 2;
		floorText.y = screenHeight / 3 + 60;
		this.container.addChild(floorText);

		// 「続ける」ボタン
		const continueButtonY = screenHeight / 2 + 20;
		const continueButton = this.createButton(
			"続ける",
			screenWidth / 2,
			continueButtonY,
			UI_COLORS_BUTTON_PRIMARY,
			() => this.onContinue?.(),
		);
		this.container.addChild(continueButton);

		// 「タイトルに戻る」ボタン
		const returnButtonY = continueButtonY + BUTTON_HEIGHT + BUTTON_GAP;
		const returnButton = this.createButton(
			"タイトルに戻る",
			screenWidth / 2,
			returnButtonY,
			UI_COLORS_BUTTON_SECONDARY,
			() => this.onReturnToTitle?.(),
		);
		this.container.addChild(returnButton);
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
		button.x = x - BUTTON_WIDTH / 2;
		button.y = y - BUTTON_HEIGHT / 2;

		// 背景
		const bg = new Graphics();
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
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = BUTTON_WIDTH / 2;
		text.y = BUTTON_HEIGHT / 2;
		button.addChild(text);

		// インタラクション
		makeInteractive(button, onClick);

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
