/**
 * ステータスバーUI
 * プレイヤーHP、AP、階層番号を表示（ゲージバー付き）
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Player } from "../types";
import { Easing, tweenValue } from "../utils/tween";

/** テキスト配置のX座標 */
const HP_TEXT_X = 16;
const AP_TEXT_X = 160;
const FLOOR_TEXT_X = 304;

/** テキストのY座標 */
const TEXT_Y = 12;

/** バーのY座標 */
const BAR_Y = 24;

/** バーの高さ */
const BAR_HEIGHT = 8;

/** HPバーの幅 */
const HP_BAR_WIDTH = 100;

/** APバーの幅 */
const AP_BAR_WIDTH = 80;

/** バー背景色 */
const BAR_BG_COLOR = 0x333333;

/** HPバー色 */
const HP_BAR_COLOR = 0x44aa44;

/** HPバー低残量色 */
const HP_BAR_LOW_COLOR = 0xaa4444;

/** HP低残量の閾値 */
const HP_LOW_THRESHOLD = 0.3;

/** APバー色 */
const AP_BAR_COLOR = 0x4488cc;

/** HPダメージ時のフラッシュ色 */
const HP_FLASH_COLOR = 0xff4444;

/** AP消費時のフラッシュ色（明るい青） */
const AP_FLASH_COLOR = 0x88ccff;

/** バーアニメーション時間（ms） */
const BAR_TWEEN_DURATION = 300;

/** HPフラッシュの間隔（ms）— HP残量に応じて変化 */
const HP_FLASH_INTERVAL_SLOW = 100;
const HP_FLASH_INTERVAL_NORMAL = 60;
const HP_FLASH_INTERVAL_FAST = 40;

/** HPフラッシュの回数 */
const FLASH_COUNT = 2;

/** APフラッシュの回数 */
const AP_FLASH_COUNT = 1;

/** APフラッシュの間隔（ms） */
const AP_FLASH_INTERVAL = 60;

/** ゴーストバーのアルファ値 */
const GHOST_BAR_ALPHA = 0.4;

/** ゴーストバーの遅延時間（ms） */
const GHOST_BAR_DELAY = 100;

/** ゴーストバーのtween時間（ms） */
const GHOST_BAR_DURATION = 200;

/**
 * ステータスバーレンダラー
 */
export class StatusBar {
	private container: Container;
	private hpText: Text;
	private apText: Text;
	private floorText: Text;
	private hpBarBg: Graphics;
	private hpBarGhost: Graphics;
	private hpBarFill: Graphics;
	private apBarBg: Graphics;
	private apBarGhost: Graphics;
	private apBarFill: Graphics;
	private currentHpRatio = 0;
	private currentApRatio = 0;

	constructor() {
		this.container = new Container();

		const textStyle = {
			fontSize: 16,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		};

		// バー背景（テキストの下レイヤー）
		this.hpBarBg = new Graphics();
		this.container.addChild(this.hpBarBg);

		this.hpBarGhost = new Graphics();
		this.container.addChild(this.hpBarGhost);

		this.hpBarFill = new Graphics();
		this.container.addChild(this.hpBarFill);

		this.apBarBg = new Graphics();
		this.container.addChild(this.apBarBg);

		this.apBarGhost = new Graphics();
		this.container.addChild(this.apBarGhost);

		this.apBarFill = new Graphics();
		this.container.addChild(this.apBarFill);

		// テキスト（バーの上レイヤー）
		this.hpText = new Text({ text: "", style: textStyle });
		this.hpText.x = HP_TEXT_X;
		this.hpText.y = TEXT_Y;
		this.hpText.anchor.set(0, 0.5);
		this.container.addChild(this.hpText);

		this.apText = new Text({ text: "", style: textStyle });
		this.apText.x = AP_TEXT_X;
		this.apText.y = TEXT_Y;
		this.apText.anchor.set(0, 0.5);
		this.container.addChild(this.apText);

		this.floorText = new Text({ text: "", style: textStyle });
		this.floorText.x = FLOOR_TEXT_X;
		this.floorText.y = TEXT_Y;
		this.floorText.anchor.set(0, 0.5);
		this.container.addChild(this.floorText);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 現在のHP比率を取得
	 */
	getCurrentHpRatio(): number {
		return this.currentHpRatio;
	}

	/**
	 * 現在のAP比率を取得
	 */
	getCurrentApRatio(): number {
		return this.currentApRatio;
	}

	/**
	 * HPバーを描画
	 */
	drawHpBar(ratio: number, color?: number): void {
		const fillColor =
			color ?? (ratio <= HP_LOW_THRESHOLD ? HP_BAR_LOW_COLOR : HP_BAR_COLOR);
		this.hpBarBg.clear();
		this.hpBarBg.rect(HP_TEXT_X, BAR_Y, HP_BAR_WIDTH, BAR_HEIGHT);
		this.hpBarBg.fill(BAR_BG_COLOR);

		this.hpBarFill.clear();
		if (ratio > 0) {
			this.hpBarFill.rect(HP_TEXT_X, BAR_Y, HP_BAR_WIDTH * ratio, BAR_HEIGHT);
			this.hpBarFill.fill(fillColor);
		}
	}

	/**
	 * APバーを描画
	 */
	drawApBar(ratio: number, color?: number): void {
		const fillColor = color ?? AP_BAR_COLOR;
		this.apBarBg.clear();
		this.apBarBg.rect(AP_TEXT_X, BAR_Y, AP_BAR_WIDTH, BAR_HEIGHT);
		this.apBarBg.fill(BAR_BG_COLOR);

		this.apBarFill.clear();
		if (ratio > 0) {
			this.apBarFill.rect(AP_TEXT_X, BAR_Y, AP_BAR_WIDTH * ratio, BAR_HEIGHT);
			this.apBarFill.fill(fillColor);
		}
	}

	/**
	 * ステータスバーを描画（即座にスナップ更新）
	 */
	render(player: Player, floor: number, isCleared = false): void {
		this.hpText.text = `HP: ${player.hp}/${player.maxHp}`;
		this.apText.text = `AP: ${player.ap}/${player.maxAp}`;
		this.floorText.text = isCleared ? `階層: ${floor} ★` : `階層: ${floor}`;

		this.currentHpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
		this.currentApRatio = player.maxAp > 0 ? player.ap / player.maxAp : 0;

		this.drawHpBar(this.currentHpRatio);
		this.drawApBar(this.currentApRatio);
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.hpText.text = "";
		this.apText.text = "";
		this.floorText.text = "";

		this.currentHpRatio = 0;
		this.currentApRatio = 0;

		this.hpBarBg.clear();
		this.hpBarGhost.clear();
		this.hpBarFill.clear();
		this.apBarBg.clear();
		this.apBarGhost.clear();
		this.apBarFill.clear();
	}

	/**
	 * HP変化アニメーション
	 * ダメージ時は赤点滅→ゴーストバー→バー減少、回復時はバー増加
	 */
	async animateHpChange(
		fromHp: number,
		toHp: number,
		maxHp: number,
	): Promise<void> {
		if (fromHp === toHp) return;

		const fromRatio = maxHp > 0 ? fromHp / maxHp : 0;
		const toRatio = maxHp > 0 ? toHp / maxHp : 0;

		// ダメージ時は赤点滅（HP残量に応じて速度変化）
		if (toHp < fromHp) {
			await this.flashHpBar(toRatio);

			// ゴーストバー（変化前の値を半透明で遅延表示）
			this.drawHpGhost(fromRatio);
			tweenValue({
				duration: GHOST_BAR_DURATION,
				delay: GHOST_BAR_DELAY,
				easing: Easing.easeOut,
				onUpdate: (progress) => {
					const ghostRatio = fromRatio + (toRatio - fromRatio) * progress;
					this.drawHpGhost(ghostRatio);
				},
			});
		}

		// バー幅とテキストのtweenアニメーション
		await tweenValue({
			duration: BAR_TWEEN_DURATION,
			easing: Easing.easeOut,
			onUpdate: (progress) => {
				const ratio = fromRatio + (toRatio - fromRatio) * progress;
				const currentHp = Math.round(fromHp + (toHp - fromHp) * progress);
				this.currentHpRatio = ratio;
				this.hpText.text = `HP: ${currentHp}/${maxHp}`;
				this.drawHpBar(ratio);
			},
		});

		// ゴーストバークリア
		this.hpBarGhost.clear();
	}

	/**
	 * HPバーの赤点滅（HP残量に応じて速度変化）
	 */
	private async flashHpBar(hpRatio: number): Promise<void> {
		const interval = this.getFlashInterval(hpRatio);
		for (let i = 0; i < FLASH_COUNT; i++) {
			this.drawHpBar(this.currentHpRatio, HP_FLASH_COLOR);
			await this.delay(interval);
			this.drawHpBar(this.currentHpRatio);
			await this.delay(interval);
		}
	}

	/**
	 * HP残量に応じたフラッシュ間隔を取得
	 */
	private getFlashInterval(hpRatio: number): number {
		if (hpRatio > 0.5) return HP_FLASH_INTERVAL_SLOW;
		if (hpRatio > HP_LOW_THRESHOLD) return HP_FLASH_INTERVAL_NORMAL;
		return HP_FLASH_INTERVAL_FAST;
	}

	/**
	 * AP変化アニメーション
	 */
	async animateApChange(
		fromAp: number,
		toAp: number,
		maxAp: number,
	): Promise<void> {
		if (fromAp === toAp) return;

		const fromRatio = maxAp > 0 ? fromAp / maxAp : 0;
		const toRatio = maxAp > 0 ? toAp / maxAp : 0;

		// AP消費時はフラッシュ + ゴーストバー
		if (toAp < fromAp) {
			await this.flashApBar();

			this.drawApGhost(fromRatio);
			tweenValue({
				duration: GHOST_BAR_DURATION,
				delay: GHOST_BAR_DELAY,
				easing: Easing.easeOut,
				onUpdate: (progress) => {
					const ghostRatio = fromRatio + (toRatio - fromRatio) * progress;
					this.drawApGhost(ghostRatio);
				},
			});
		}

		await tweenValue({
			duration: BAR_TWEEN_DURATION,
			easing: Easing.easeOut,
			onUpdate: (progress) => {
				const ratio = fromRatio + (toRatio - fromRatio) * progress;
				const currentAp = Math.round(fromAp + (toAp - fromAp) * progress);
				this.currentApRatio = ratio;
				this.apText.text = `AP: ${currentAp}/${maxAp}`;
				this.drawApBar(ratio);
			},
		});

		// ゴーストバークリア
		this.apBarGhost.clear();
	}

	/**
	 * APバーのフラッシュ
	 */
	private async flashApBar(): Promise<void> {
		for (let i = 0; i < AP_FLASH_COUNT; i++) {
			this.drawApBar(this.currentApRatio, AP_FLASH_COLOR);
			await this.delay(AP_FLASH_INTERVAL);
			this.drawApBar(this.currentApRatio);
			await this.delay(AP_FLASH_INTERVAL);
		}
	}

	/**
	 * HPゴーストバーを描画（半透明）
	 */
	private drawHpGhost(ratio: number): void {
		this.hpBarGhost.clear();
		if (ratio > 0) {
			const color = ratio <= HP_LOW_THRESHOLD ? HP_BAR_LOW_COLOR : HP_BAR_COLOR;
			this.hpBarGhost.rect(HP_TEXT_X, BAR_Y, HP_BAR_WIDTH * ratio, BAR_HEIGHT);
			this.hpBarGhost.fill({ color, alpha: GHOST_BAR_ALPHA });
		}
	}

	/**
	 * APゴーストバーを描画（半透明）
	 */
	private drawApGhost(ratio: number): void {
		this.apBarGhost.clear();
		if (ratio > 0) {
			this.apBarGhost.rect(AP_TEXT_X, BAR_Y, AP_BAR_WIDTH * ratio, BAR_HEIGHT);
			this.apBarGhost.fill({ color: AP_BAR_COLOR, alpha: GHOST_BAR_ALPHA });
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
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
