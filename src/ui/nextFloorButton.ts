/**
 * 次の階層へボタンUI
 * 全敵撃破後に表示し、階段まで歩かずに階層遷移できる
 */

import { Container, Graphics, Text } from "pixi.js";
import { drawRoundedRect } from "./graphicsHelpers";
import {
	BUTTON_HEIGHT,
	NEXT_FLOOR_BUTTON_WIDTH as BUTTON_WIDTH,
} from "./layout";
import { UI_COLORS_BUTTON_PRIMARY, UI_COLORS_DISABLED } from "./uiColors";

/** ボタンサイズ */
const BUTTON_RADIUS = 6;

/** ボタン色定義 */
const BUTTON_COLORS = {
	active: { ...UI_COLORS_BUTTON_PRIMARY, text: 0xffffff },
	disabled: UI_COLORS_DISABLED,
} as const;

/**
 * 次の階層へボタンレンダラー
 */
export class NextFloorButton {
	private container: Container;
	private button: Container;
	private background: Graphics;
	private label: Text;
	private onNextFloor: (() => void) | null = null;

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
			text: "次の階層へ",
			style: {
				fontSize: 14,
				fontFamily: "sans-serif",
				fill: BUTTON_COLORS.active.text,
				fontWeight: "bold",
			},
		});
		this.label.anchor.set(0.5);
		this.label.x = BUTTON_WIDTH / 2;
		this.label.y = BUTTON_HEIGHT / 2;
		this.button.addChild(this.label);

		// イベントリスナー登録（1回のみ）
		this.button.on("pointerdown", () => {
			this.onNextFloor?.();
		});

		// 初期状態の描画
		this.drawButton();
	}

	/**
	 * ボタンを描画
	 */
	private drawButton(): void {
		const colors = BUTTON_COLORS.active;

		this.background.clear();
		drawRoundedRect(
			this.background,
			BUTTON_WIDTH,
			BUTTON_HEIGHT,
			BUTTON_RADIUS,
			colors.bg,
			{ color: colors.border, width: 2 },
		);

		this.label.style.fill = colors.text;
		this.button.eventMode = "static";
		this.button.cursor = "pointer";
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 次の階層へコールバックを設定
	 */
	setOnNextFloor(callback: () => void): void {
		this.onNextFloor = callback;
	}

	/**
	 * 敵の残数に応じてボタンの表示/非表示を更新
	 * 敵が全滅（0体）の場合のみ表示
	 */
	render(enemyCount: number): void {
		this.container.visible = enemyCount === 0;
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
