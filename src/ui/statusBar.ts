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

/** バーアニメーション時間（ms） */
const BAR_TWEEN_DURATION = 300;

/** フラッシュの間隔（ms） */
const FLASH_INTERVAL = 75;

/** フラッシュの回数 */
const FLASH_COUNT = 2;

/**
 * ステータスバーレンダラー
 */
export class StatusBar {
	private container: Container;
	private hpText: Text;
	private apText: Text;
	private floorText: Text;
	private hpBarBg: Graphics;
	private hpBarFill: Graphics;
	private apBarBg: Graphics;
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

		this.hpBarFill = new Graphics();
		this.container.addChild(this.hpBarFill);

		this.apBarBg = new Graphics();
		this.container.addChild(this.apBarBg);

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
	drawApBar(ratio: number): void {
		this.apBarBg.clear();
		this.apBarBg.rect(AP_TEXT_X, BAR_Y, AP_BAR_WIDTH, BAR_HEIGHT);
		this.apBarBg.fill(BAR_BG_COLOR);

		this.apBarFill.clear();
		if (ratio > 0) {
			this.apBarFill.rect(AP_TEXT_X, BAR_Y, AP_BAR_WIDTH * ratio, BAR_HEIGHT);
			this.apBarFill.fill(AP_BAR_COLOR);
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
		this.hpBarFill.clear();
		this.apBarBg.clear();
		this.apBarFill.clear();
	}

	/**
	 * HP変化アニメーション
	 * ダメージ時は赤点滅→バー減少、回復時はバー増加
	 */
	async animateHpChange(
		fromHp: number,
		toHp: number,
		maxHp: number,
	): Promise<void> {
		if (fromHp === toHp) return;

		const fromRatio = maxHp > 0 ? fromHp / maxHp : 0;
		const toRatio = maxHp > 0 ? toHp / maxHp : 0;

		// ダメージ時は赤点滅
		if (toHp < fromHp) {
			await this.flashHpBar();
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
	}

	/**
	 * HPバーの赤点滅
	 */
	private async flashHpBar(): Promise<void> {
		for (let i = 0; i < FLASH_COUNT; i++) {
			this.drawHpBar(this.currentHpRatio, HP_FLASH_COLOR);
			await this.delay(FLASH_INTERVAL);
			this.drawHpBar(this.currentHpRatio);
			await this.delay(FLASH_INTERVAL);
		}
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
