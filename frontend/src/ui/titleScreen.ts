/**
 * タイトル画面UI
 */

import { Container, Graphics, Text, Ticker } from "pixi.js";
import { Easing, tween } from "../utils/tween";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";
import {
	createParticles,
	type Particle,
	type ParticleConfig,
	updateParticles,
} from "./particleLogic";
import {
	createBgParticleConfig,
	getButtonDelay,
	HOVER_EFFECT,
	INTRO_TIMING,
} from "./titleAnimation";
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

/** 背景パーティクル発射間隔（ms） */
const BG_PARTICLE_INTERVAL = 2000;

/**
 * タイトル画面レンダラー
 */
export class TitleScreen {
	private container: Container;
	private onNewGame: (() => void) | null = null;
	private onContinue: (() => void) | null = null;

	/** 背景パーティクル用 */
	private bgParticleGraphics: Graphics | null = null;
	private bgParticles: Particle[] = [];
	private bgParticleConfig: ParticleConfig | null = null;
	private bgTickerCallback: ((tick: Ticker) => void) | null = null;
	private bgParticleTimer = 0;

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
	 * タイトル画面を描画（イントロアニメーション付き）
	 */
	render(screenWidth: number, screenHeight: number, canContinue = false): void {
		this.stopBgParticles();
		this.container.removeChildren();

		// 背景パーティクル用Graphics（最背面に配置）
		this.bgParticleGraphics = new Graphics();
		this.container.addChild(this.bgParticleGraphics);

		// ゲームタイトル（フェードイン + スケールアニメーション）
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
		title.alpha = 0;
		title.scale.set(0.5);
		this.container.addChild(title);

		// タイトルフェードイン + スケールアニメーション
		tween(
			title,
			{ alpha: 1, scaleX: 1, scaleY: 1 },
			{
				duration: INTRO_TIMING.titleDuration,
				delay: INTRO_TIMING.titleDelay,
				easing: Easing.easeOutBack,
			},
		);

		// 新規ゲーム開始ボタン
		const centerY = screenHeight / 2 + 20;
		const newGameButton = this.createButton(
			"新規ゲーム開始",
			screenWidth / 2,
			centerY,
			true,
			() => this.onNewGame?.(),
		);
		newGameButton.alpha = 0;
		this.container.addChild(newGameButton);

		// 新規ゲームボタン フェードイン
		tween(
			newGameButton,
			{ alpha: 1 },
			{
				duration: INTRO_TIMING.buttonDuration,
				delay: getButtonDelay(0),
				easing: Easing.easeOut,
			},
		);

		// 続きからボタン
		const continueButton = this.createButton(
			"続きから",
			screenWidth / 2,
			centerY + BUTTON_HEIGHT + BUTTON_GAP,
			canContinue && this.onContinue !== null,
			() => this.onContinue?.(),
		);
		continueButton.alpha = 0;
		this.container.addChild(continueButton);

		// 続きからボタン フェードイン
		tween(
			continueButton,
			{ alpha: 1 },
			{
				duration: INTRO_TIMING.buttonDuration,
				delay: getButtonDelay(1),
				easing: Easing.easeOut,
			},
		);

		// 背景パーティクル開始
		this.startBgParticles(screenWidth, screenHeight);
	}

	/**
	 * ボタンを生成（ホバー演出付き）
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

		// インタラクション + ホバー演出
		if (enabled && onClick) {
			makeInteractive(button, onClick);
			this.addHoverEffect(button);
		}

		return button;
	}

	/**
	 * ボタンにホバー演出を追加
	 */
	private addHoverEffect(button: Container): void {
		// ピボットをボタン中心に設定してスケール時に中央基準にする
		button.pivot.set(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2);
		button.x += BUTTON_WIDTH / 2;
		button.y += BUTTON_HEIGHT / 2;

		button.on("pointerover", () => {
			tween(
				button,
				{ scaleX: HOVER_EFFECT.scale, scaleY: HOVER_EFFECT.scale },
				{ duration: HOVER_EFFECT.duration, easing: Easing.easeOut },
			);
		});

		button.on("pointerout", () => {
			tween(
				button,
				{ scaleX: 1, scaleY: 1 },
				{ duration: HOVER_EFFECT.duration, easing: Easing.easeOut },
			);
		});
	}

	/**
	 * 背景パーティクルの更新ループを開始
	 */
	private startBgParticles(screenWidth: number, screenHeight: number): void {
		this.bgParticleConfig = createBgParticleConfig(screenWidth, screenHeight);
		this.bgParticles = createParticles(this.bgParticleConfig);
		this.bgParticleTimer = 0;

		const ticker = Ticker.shared;

		this.bgTickerCallback = (tick: Ticker): void => {
			if (!this.bgParticleGraphics || !this.bgParticleConfig) return;

			this.bgParticleTimer += tick.deltaMS;

			// 定期的に新しいパーティクルを追加
			if (this.bgParticleTimer >= BG_PARTICLE_INTERVAL) {
				this.bgParticleTimer = 0;
				const newParticles = createParticles(this.bgParticleConfig);
				this.bgParticles = [...this.bgParticles, ...newParticles];
			}

			// パーティクル更新
			this.bgParticles = updateParticles(this.bgParticles, tick.deltaMS);

			// 描画
			this.bgParticleGraphics.clear();
			for (const p of this.bgParticles) {
				this.bgParticleGraphics.circle(p.x, p.y, p.size);
				this.bgParticleGraphics.fill({
					color: p.color,
					alpha: (p.life / p.maxLife) * 0.4,
				});
			}
		};

		ticker.add(this.bgTickerCallback);
	}

	/**
	 * 背景パーティクルを停止
	 */
	private stopBgParticles(): void {
		if (this.bgTickerCallback) {
			Ticker.shared.remove(this.bgTickerCallback);
			this.bgTickerCallback = null;
		}
		this.bgParticles = [];
		this.bgParticleConfig = null;
		this.bgParticleGraphics = null;
		this.bgParticleTimer = 0;
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
		this.stopBgParticles();
	}
}
