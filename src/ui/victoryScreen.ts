/**
 * 勝利画面UI
 */

import { Container, Graphics, Text } from "pixi.js";
import { Easing, tween } from "../utils/tween";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import type { ParticleSystem } from "./particleSystem";
import {
	UI_COLORS_BUTTON_PRIMARY,
	UI_COLORS_BUTTON_SECONDARY,
} from "./uiColors";

/** ボタン描画定数 */
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;
const BUTTON_GAP = 16;

/** アニメーション定数 */
const TITLE_FADE_DURATION = 600;
const CONTENT_FADE_DURATION = 400;
const CONTENT_FADE_DELAY = 300;

/**
 * 勝利画面レンダラー
 */
export class VictoryScreen {
	private container: Container;
	private onContinue: (() => void) | null = null;
	private onReturnToTitle: (() => void) | null = null;
	private particleSystem: ParticleSystem | null = null;

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
	 * ParticleSystemを設定
	 */
	setParticleSystem(particleSystem: ParticleSystem): void {
		this.particleSystem = particleSystem;
	}

	/**
	 * ParticleSystemを取得
	 */
	getParticleSystem(): ParticleSystem | null {
		return this.particleSystem;
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
	 * 勝利画面を描画（フェードインアニメーション付き）
	 */
	render(floor: number, screenWidth: number, screenHeight: number): void {
		this.container.removeChildren();

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

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
		title.alpha = 0;
		title.scale.set(0.5);
		this.container.addChild(title);

		// タイトルのフェードイン+スケールアニメーション
		tween(
			title,
			{ alpha: 1, scaleX: 1, scaleY: 1 },
			{ duration: TITLE_FADE_DURATION, easing: Easing.easeOutBack },
		);

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
		floorText.alpha = 0;
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
		continueButton.alpha = 0;
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
		returnButton.alpha = 0;
		this.container.addChild(returnButton);

		// テキスト・ボタンの遅延フェードイン
		tween(
			floorText,
			{ alpha: 1 },
			{
				duration: CONTENT_FADE_DURATION,
				delay: CONTENT_FADE_DELAY,
				easing: Easing.easeOut,
			},
		);
		tween(
			continueButton,
			{ alpha: 1 },
			{
				duration: CONTENT_FADE_DURATION,
				delay: CONTENT_FADE_DELAY + 100,
				easing: Easing.easeOut,
			},
		);
		tween(
			returnButton,
			{ alpha: 1 },
			{
				duration: CONTENT_FADE_DURATION,
				delay: CONTENT_FADE_DELAY + 200,
				easing: Easing.easeOut,
			},
		);
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
