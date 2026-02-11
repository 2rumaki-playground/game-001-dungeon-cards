/**
 * 「プレイヤーへ戻る」ボタンUI
 * カメラドラッグ中に表示し、プレイヤー中心にカメラを戻す
 */

import { Container, Graphics, Text } from "pixi.js";
import { drawRoundedRect } from "./graphicsHelpers";
import { BUTTON_HEIGHT, RETURN_TO_PLAYER_BUTTON_WIDTH } from "./layout";
import { UI_COLORS_BUTTON_PRIMARY } from "./uiColors";

/** ボタンサイズ */
const BUTTON_RADIUS = 6;

/** ボタン色定義 */
const BUTTON_COLORS = {
	active: { ...UI_COLORS_BUTTON_PRIMARY, text: 0xffffff },
} as const;

/**
 * プレイヤーへ戻るボタンレンダラー
 */
export class ReturnToPlayerButton {
	private container: Container;
	private button: Container;
	private background: Graphics;
	private label: Text;
	private onClick: (() => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
		this.button = new Container();
		this.container.addChild(this.button);

		// 背景
		this.background = new Graphics();
		this.button.addChild(this.background);

		// ラベル
		this.label = new Text({
			text: "プレイヤーへ戻る",
			style: {
				fontSize: 14,
				fontFamily: "sans-serif",
				fill: BUTTON_COLORS.active.text,
				fontWeight: "bold",
			},
		});
		this.label.anchor.set(0.5);
		this.label.x = RETURN_TO_PLAYER_BUTTON_WIDTH / 2;
		this.label.y = BUTTON_HEIGHT / 2;
		this.button.addChild(this.label);

		// イベントリスナー登録（1回のみ）
		this.button.on("pointerdown", () => {
			this.onClick?.();
		});

		// 初期状態の描画
		this.drawButton();
	}

	private drawButton(): void {
		const colors = BUTTON_COLORS.active;

		this.background.clear();
		drawRoundedRect(
			this.background,
			RETURN_TO_PLAYER_BUTTON_WIDTH,
			BUTTON_HEIGHT,
			BUTTON_RADIUS,
			colors.bg,
			{ color: colors.border, width: 2 },
		);

		this.label.style.fill = colors.text;
		this.button.eventMode = "static";
		this.button.cursor = "pointer";
	}

	getContainer(): Container {
		return this.container;
	}

	setOnClick(callback: () => void): void {
		this.onClick = callback;
	}

	/**
	 * ドラッグ状態に応じてボタンの表示/非表示を更新
	 */
	render(visible: boolean): void {
		this.container.visible = visible;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}
}
