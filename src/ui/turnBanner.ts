/**
 * ターン切り替えバナー
 * ターン遷移時に「プレイヤーターン」「敵ターン」を1文字ずつポップイン表示
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Turn } from "../types";
import { Easing, tween } from "../utils/tween";
import { TURN_BG_COLORS, TURN_TEXT_COLORS } from "./turnColors";

/** バナーの高さ（px） */
const BANNER_HEIGHT = 60;

/** バナー背景の不透明度 */
const BANNER_ALPHA = 0.85;

/** バナーテキストのフォントサイズ */
const BANNER_FONT_SIZE = 28;

/** 背景フェードインの時間（ms） */
const BG_FADE_IN_DURATION = 200;

/** 1文字のポップイン時間（ms） */
const CHAR_POP_DURATION = 150;

/** 文字ポップインのスタッガー遅延（ms） */
const CHAR_STAGGER_DELAY = 50;

/** 表示保持時間（ms） */
const HOLD_DURATION = 400;

/** フェードアウトアニメーションの時間（ms） */
const FADE_OUT_DURATION = 300;

/** ターン別の色設定（共通定数から参照） */
const BANNER_COLORS: Record<Turn, { bg: number; text: number }> = {
	player: { bg: TURN_BG_COLORS.player, text: TURN_TEXT_COLORS.player },
	enemy: { bg: TURN_BG_COLORS.enemy, text: TURN_TEXT_COLORS.enemy },
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
	private textContainer: Container;
	private screenWidth: number;
	private screenHeight: number;

	constructor(screenWidth: number, screenHeight: number) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;

		this.container = new Container();
		this.container.visible = false;

		this.background = new Graphics();
		this.container.addChild(this.background);

		this.textContainer = new Container();
		this.container.addChild(this.textContainer);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 画面サイズ変更に対応
	 */
	resize(screenWidth: number, screenHeight: number): void {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
	}

	/**
	 * 1文字ずつのTextオブジェクトを生成し、横並びに配置
	 */
	private createCharTexts(text: string, color: number): Text[] {
		const chars: Text[] = [];
		// フォントサイズを文字幅として使用（日本語は全角なので概ねフォントサイズ幅）
		const charWidth = BANNER_FONT_SIZE;
		const totalWidth = text.length * charWidth;
		let offsetX = -totalWidth / 2;

		for (const char of text) {
			const t = new Text({
				text: char,
				style: {
					fontSize: BANNER_FONT_SIZE,
					fontWeight: "bold",
					fill: color,
				},
			});
			t.anchor.set(0.5, 0.5);
			t.x = offsetX + charWidth / 2;
			t.y = 0;
			offsetX += charWidth;

			// アニメーション初期状態
			t.scale.set(0, 0);
			t.alpha = 0;

			this.textContainer.addChild(t);
			chars.push(t);
		}

		return chars;
	}

	/**
	 * テキストコンテナの子要素をすべて破棄
	 */
	private clearCharTexts(): void {
		for (const child of [...this.textContainer.children]) {
			this.textContainer.removeChild(child);
			child.destroy();
		}
	}

	/**
	 * ターンバナーを表示
	 * 背景フェードイン → 1文字ずつポップイン → 保持 → フェードアウト
	 */
	async showBanner(turn: Turn): Promise<void> {
		const colors = BANNER_COLORS[turn];

		// 背景を描画（初期alpha=0）
		this.background.clear();
		this.background.rect(0, 0, this.screenWidth, BANNER_HEIGHT);
		this.background.fill({ color: colors.bg });
		this.background.alpha = 0;

		// テキストコンテナの位置設定
		this.textContainer.x = this.screenWidth / 2;
		this.textContainer.y = BANNER_HEIGHT / 2;

		// 文字Text生成
		this.clearCharTexts();
		const chars = this.createCharTexts(BANNER_TEXT[turn], colors.text);

		// コンテナ位置設定
		const centerY = (this.screenHeight - BANNER_HEIGHT) / 2;
		this.container.x = 0;
		this.container.y = centerY;
		this.container.alpha = 1;
		this.container.visible = true;

		// 背景フェードイン
		await tween(
			this.background,
			{ alpha: BANNER_ALPHA },
			{ duration: BG_FADE_IN_DURATION, easing: Easing.easeOut },
		);

		// 文字ポップイン（スタッガー付き並列実行）
		await Promise.all(
			chars.map((char, i) =>
				tween(
					char,
					{ scaleX: 1, scaleY: 1, alpha: 1 },
					{
						duration: CHAR_POP_DURATION,
						delay: i * CHAR_STAGGER_DELAY,
						easing: Easing.easeOutBack,
					},
				),
			),
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
		this.clearCharTexts();
	}
}
