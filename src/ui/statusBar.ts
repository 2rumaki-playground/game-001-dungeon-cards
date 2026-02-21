/**
 * ステータスバーUI
 * 階層番号表示
 */

import { Container, Text } from "pixi.js";
import { Easing, tweenValue } from "../utils/tween";

/** テキスト配置のX座標 */
const FLOOR_TEXT_X = 16;

/** テキストのY座標 */
const TEXT_Y = 12;

/** HPアニメーション時間（ms） */
const TWEEN_DURATION = 300;

/**
 * ステータスバーレンダラー
 */
export class StatusBar {
	private container: Container;
	private floorText: Text;
	private currentHpRatio = 0;

	constructor() {
		this.container = new Container();

		const textStyle = {
			fontSize: 16,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		};

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
	 * ステータスバーを描画（即座にスナップ更新）
	 */
	render(floor: number, isCleared = false): void {
		this.floorText.text = isCleared ? `階層: ${floor} ★` : `階層: ${floor}`;
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.floorText.text = "";

		this.currentHpRatio = 0;
	}

	/**
	 * HP変化アニメーション
	 * コールバックでタイルゲージに反映
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
		onHpUpdate?.(fromRatio);

		// HP比率のtweenアニメーション
		await tweenValue({
			duration: TWEEN_DURATION,
			easing: Easing.easeOut,
			onUpdate: (progress) => {
				const ratio = fromRatio + (toRatio - fromRatio) * progress;
				this.currentHpRatio = ratio;
				onHpUpdate?.(ratio);
			},
		});
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
