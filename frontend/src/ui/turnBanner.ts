/**
 * ターン切り替えバナー
 * ターン遷移時に「プレイヤーターン」「敵ターン」を画面中央にスライドイン表示
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Turn } from "../types";
import { Easing, tween } from "../utils/tween";

/** バナーの高さ（px） */
const BANNER_HEIGHT = 60;

/** バナー背景の不透明度 */
const BANNER_ALPHA = 0.85;

/** バナーテキストのフォントサイズ */
const BANNER_FONT_SIZE = 28;

/** スライドインアニメーションの時間（ms） */
const SLIDE_IN_DURATION = 300;

/** 表示保持時間（ms） */
const HOLD_DURATION = 600;

/** フェードアウトアニメーションの時間（ms） */
const FADE_OUT_DURATION = 300;

/** ターン別の色設定 */
const BANNER_COLORS: Record<Turn, { bg: number; text: number }> = {
	player: { bg: 0x1a3a6a, text: 0x88bbff },
	enemy: { bg: 0x6a1a1a, text: 0xff8888 },
};

/** ターン別の表示テキスト */
const BANNER_TEXT: Record<Turn, string> = {
	player: "プレイヤーターン",
	enemy: "敵ターン",
};

/**
 * ターン切り替えバナー
 */
export class TurnBanner {
	private container: Container;
	private background: Graphics;
	private label: Text;
	private screenWidth: number;
	private screenHeight: number;

	constructor(screenWidth: number, screenHeight: number) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;

		this.container = new Container();
		this.container.visible = false;

		this.background = new Graphics();
		this.container.addChild(this.background);

		this.label = new Text({
			text: "",
			style: {
				fontSize: BANNER_FONT_SIZE,
				fontWeight: "bold",
				fill: 0xffffff,
			},
		});
		this.label.anchor.set(0.5, 0.5);
		this.container.addChild(this.label);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * ターンバナーを表示
	 * スライドイン → 保持 → フェードアウト
	 */
	async showBanner(turn: Turn): Promise<void> {
		const colors = BANNER_COLORS[turn];

		// 背景を描画
		this.background.clear();
		this.background.rect(0, 0, this.screenWidth, BANNER_HEIGHT);
		this.background.fill({ color: colors.bg, alpha: BANNER_ALPHA });

		// テキスト設定
		this.label.text = BANNER_TEXT[turn];
		this.label.style.fill = colors.text;
		this.label.x = this.screenWidth / 2;
		this.label.y = BANNER_HEIGHT / 2;

		// 初期位置: 左外
		const centerY = (this.screenHeight - BANNER_HEIGHT) / 2;
		this.container.x = -this.screenWidth;
		this.container.y = centerY;
		this.container.alpha = 1;
		this.container.visible = true;

		// スライドイン
		await tween(
			this.container,
			{ x: 0 },
			{ duration: SLIDE_IN_DURATION, easing: Easing.easeOutCubic },
		);

		// フェードアウト（保持時間後）
		await tween(
			this.container,
			{ alpha: 0 },
			{
				duration: FADE_OUT_DURATION,
				delay: HOLD_DURATION,
				easing: Easing.easeOut,
			},
		);

		// リセット
		this.container.visible = false;
	}
}
