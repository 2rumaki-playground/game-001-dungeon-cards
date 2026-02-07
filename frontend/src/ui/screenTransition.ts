/**
 * 画面遷移トランジション
 * 全画面を覆う黒矩形のalphaをtweenで制御し、
 * フェードアウト→コールバック→フェードインの一連のトランジションを提供
 */

import { Container, Graphics } from "pixi.js";
import { Easing, tween } from "../utils/tween";

/** フェードアウトの時間（ms）- 現画面を暗転 */
const FADE_OUT_DURATION = 300;

/** フェードインの時間（ms）- 新画面を表示 */
const FADE_IN_DURATION = 300;

/** オーバーレイの色（黒） */
const OVERLAY_COLOR = 0x000000;

export class ScreenTransition {
	private container: Container;
	private overlay: Graphics;

	constructor(screenWidth: number, screenHeight: number) {
		this.container = new Container();
		this.container.visible = false;

		this.overlay = new Graphics();
		this.overlay.rect(0, 0, screenWidth, screenHeight);
		this.overlay.fill({ color: OVERLAY_COLOR });
		this.overlay.alpha = 0;
		this.container.addChild(this.overlay);
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
		this.overlay.clear();
		this.overlay.rect(0, 0, screenWidth, screenHeight);
		this.overlay.fill({ color: OVERLAY_COLOR });
		this.overlay.alpha = 0;
	}

	/**
	 * フェードトランジションを実行
	 * 1. フェードアウト（alpha 0→1、画面を暗転）
	 * 2. onTransition コールバック実行（画面切り替え処理）
	 * 3. フェードイン（alpha 1→0、新画面を表示）
	 */
	async fadeTransition(
		onTransition: () => void | Promise<void>,
	): Promise<void> {
		this.overlay.alpha = 0;
		this.container.visible = true;

		// フェードアウト（暗転）
		await tween(
			this.overlay,
			{ alpha: 1 },
			{ duration: FADE_OUT_DURATION, easing: Easing.easeInOut },
		);

		// 暗転中に画面切り替え
		await onTransition();

		// フェードイン（新画面を表示）
		await tween(
			this.overlay,
			{ alpha: 0 },
			{ duration: FADE_IN_DURATION, easing: Easing.easeInOut },
		);

		this.container.visible = false;
	}
}
