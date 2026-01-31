/**
 * ゲームオーバー画面UI
 */

import { Container, Graphics, Text } from "pixi.js";

/** ボタン描画定数 */
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;

/** ボタン色定義 */
const BUTTON_COLORS = {
	bg: 0x2a5a8c,
	border: 0x4a8cca,
} as const;

/**
 * ゲームオーバー画面レンダラー
 */
export class GameOverScreen {
	private container: Container;
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
	 * タイトルに戻るコールバックを設定
	 */
	setOnReturnToTitle(callback: () => void): void {
		this.onReturnToTitle = callback;
	}

	/**
	 * ゲームオーバー画面を描画
	 */
	render(floor: number, screenWidth: number, screenHeight: number): void {
		this.container.removeChildren();

		// ゲームオーバーテキスト
		const title = new Text({
			text: "ゲームオーバー",
			style: {
				fontSize: 36,
				fontFamily: "sans-serif",
				fill: 0xcc3333,
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

		// タイトルに戻るボタン
		const buttonY = screenHeight / 2 + 40;
		const button = this.createButton(
			"タイトルに戻る",
			screenWidth / 2,
			buttonY,
		);
		this.container.addChild(button);
	}

	/**
	 * ボタンを生成
	 */
	private createButton(label: string, x: number, y: number): Container {
		const button = new Container();
		button.x = x - BUTTON_WIDTH / 2;
		button.y = y - BUTTON_HEIGHT / 2;

		// 背景
		const bg = new Graphics();
		bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
		bg.fill(BUTTON_COLORS.bg);
		bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
		bg.stroke({ color: BUTTON_COLORS.border, width: 2 });
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
		button.eventMode = "static";
		button.cursor = "pointer";
		button.on("pointerdown", () => this.onReturnToTitle?.());

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
