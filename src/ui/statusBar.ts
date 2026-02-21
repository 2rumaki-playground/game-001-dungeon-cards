/**
 * ステータスバーUI
 * プレイヤーHP数値、APゲージバー、階層番号を表示
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Player, Turn } from "../types";
import { Easing, tweenValue } from "../utils/tween";
import { TURN_TEXT_COLORS } from "./turnColors";

/** テキスト配置のX座標 */
const HP_TEXT_X = 16;
const AP_TEXT_X = 160;
const FLOOR_TEXT_X = 304;
const TURN_TEXT_X = 424;

/** ターン別の表示テキスト */
const TURN_TEXT: Record<Turn, string> = {
	player: "あなたのターン",
	enemy: "敵のターン",
};

/** ターン別のテキスト色（共通定数から参照） */
const TURN_TEXT_COLOR = TURN_TEXT_COLORS;

/** テキストのY座標 */
const TEXT_Y = 12;

/** バーのY座標 */
const BAR_Y = 24;

/** バーの高さ */
const BAR_HEIGHT = 8;

/** APバーの幅 */
const AP_BAR_WIDTH = 80;

/** バー背景色 */
const BAR_BG_COLOR = 0x333333;

/** APバー色 */
const AP_BAR_COLOR = 0x4488cc;

/** AP消費時のフラッシュ色（明るい青） */
const AP_FLASH_COLOR = 0x88ccff;

/** バーアニメーション時間（ms） */
const BAR_TWEEN_DURATION = 300;

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
	private turnText: Text;
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

		// APバー背景（テキストの下レイヤー）
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

		this.turnText = new Text({ text: "", style: textStyle });
		this.turnText.x = TURN_TEXT_X;
		this.turnText.y = TEXT_Y;
		this.turnText.anchor.set(0, 0.5);
		this.container.addChild(this.turnText);
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
	render(player: Player, floor: number, turn: Turn, isCleared = false): void {
		this.hpText.text = `HP: ${player.hp}/${player.maxHp}`;
		this.apText.text = `AP: ${player.ap}/${player.maxAp}`;
		this.floorText.text = isCleared ? `階層: ${floor} ★` : `階層: ${floor}`;

		this.turnText.text = TURN_TEXT[turn];
		this.turnText.style.fill = TURN_TEXT_COLOR[turn];

		this.currentHpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
		this.currentApRatio = player.maxAp > 0 ? player.ap / player.maxAp : 0;

		this.drawApBar(this.currentApRatio);
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.hpText.text = "";
		this.apText.text = "";
		this.floorText.text = "";
		this.turnText.text = "";

		this.currentHpRatio = 0;
		this.currentApRatio = 0;

		this.apBarBg.clear();
		this.apBarGhost.clear();
		this.apBarFill.clear();
	}

	/**
	 * HP変化アニメーション
	 * テキスト更新 + コールバックでタイルゲージに反映
	 */
	async animateHpChange(
		fromHp: number,
		toHp: number,
		maxHp: number,
		onHpUpdate?: (ratio: number) => void,
	): Promise<void> {
		if (fromHp === toHp) return;

		const fromRatio = maxHp > 0 ? fromHp / maxHp : 0;
		const toRatio = maxHp > 0 ? toHp / maxHp : 0;

		this.currentHpRatio = fromRatio;
		this.hpText.text = `HP: ${fromHp}/${maxHp}`;
		onHpUpdate?.(fromRatio);

		// テキストとHP比率のtweenアニメーション
		await tweenValue({
			duration: BAR_TWEEN_DURATION,
			easing: Easing.easeOut,
			onUpdate: (progress) => {
				const ratio = fromRatio + (toRatio - fromRatio) * progress;
				const currentHp = Math.round(fromHp + (toHp - fromHp) * progress);
				this.currentHpRatio = ratio;
				this.hpText.text = `HP: ${currentHp}/${maxHp}`;
				onHpUpdate?.(ratio);
			},
		});
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

		// 呼び出し前にrender()でtoAp側が描画済みの場合に備え、
		// fromAp/fromRatioの状態を明示的に反映してからアニメーション開始
		this.currentApRatio = fromRatio;
		this.apText.text = `AP: ${fromAp}/${maxAp}`;
		this.drawApBar(fromRatio);
		this.apBarGhost.clear();

		let ghostPromise: Promise<void> | undefined;

		// AP消費時はフラッシュ + ゴーストバー
		if (toAp < fromAp) {
			await this.flashApBar();

			this.drawApGhost(fromRatio);
			ghostPromise = tweenValue({
				duration: GHOST_BAR_DURATION,
				delay: GHOST_BAR_DELAY,
				easing: Easing.easeOut,
				onUpdate: (progress) => {
					const ghostRatio = fromRatio + (toRatio - fromRatio) * progress;
					this.drawApGhost(ghostRatio);
				},
			});
		}

		const barPromise = tweenValue({
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
		await Promise.all([ghostPromise, barPromise]);

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
