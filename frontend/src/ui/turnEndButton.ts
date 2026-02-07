/**
 * ターン終了ボタンUI
 * @see docs/spec/mvp/rules.md
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Turn } from "../types";
import { drawRoundedRect } from "./graphicsHelpers";
import { BUTTON_HEIGHT, TURN_END_BUTTON_WIDTH as BUTTON_WIDTH } from "./layout";

/** ボタンサイズ */
const BUTTON_RADIUS = 6;

/** ボタン色定義 */
const BUTTON_COLORS = {
	active: { bg: 0x2a5a8c, border: 0x4a8cca, text: 0xffffff },
	disabled: { bg: 0x2a2a2a, border: 0x4a4a4a, text: 0x666666 },
} as const;

/**
 * ターン終了ボタンレンダラー
 */
export class TurnEndButton {
	private container: Container;
	private button: Container;
	private background: Graphics;
	private label: Text;
	private onEndTurn: (() => void) | null = null;
	private enabled = true;

	constructor() {
		this.container = new Container();
		this.button = new Container();
		this.container.addChild(this.button);

		// 背景
		this.background = new Graphics();
		this.button.addChild(this.background);

		// ラベル
		this.label = new Text({
			text: "ターン終了",
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
			this.onEndTurn?.();
		});

		// 初期状態の描画
		this.drawButton(true);
	}

	/**
	 * ボタンを描画
	 */
	private drawButton(enabled: boolean): void {
		const colors = enabled ? BUTTON_COLORS.active : BUTTON_COLORS.disabled;

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

		if (enabled) {
			this.button.eventMode = "static";
			this.button.cursor = "pointer";
		} else {
			this.button.eventMode = "none";
			this.button.cursor = "default";
		}
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * ターン終了コールバックを設定
	 */
	setOnEndTurn(callback: () => void): void {
		this.onEndTurn = callback;
	}

	/**
	 * 現在のターンに応じてボタンの状態を更新
	 * プレイヤーターン中のみ活性化
	 */
	render(turn: Turn): void {
		const shouldEnable = turn === "player";
		if (this.enabled !== shouldEnable) {
			this.enabled = shouldEnable;
			this.drawButton(shouldEnable);
		}
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
