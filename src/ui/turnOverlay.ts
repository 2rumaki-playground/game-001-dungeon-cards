/**
 * ターンオーバーレイ
 * 敵ターン中に画面全体を薄い赤暗いオーバーレイで覆い、
 * 操作不可状態を視覚的に示す
 */

import { Container, Graphics } from "pixi.js";
import type { Turn } from "../types";
import { Easing, tween } from "../utils/tween";
import { TURN_BG_COLORS } from "./turnColors";

/** オーバーレイ色（共通定数から参照） */
const OVERLAY_COLOR = TURN_BG_COLORS.enemy;

/** オーバーレイの不透明度 */
const OVERLAY_ALPHA = 0.15;

/** フェードアニメーション時間（ms） */
const FADE_DURATION = 200;

export class TurnOverlay {
	private container: Container;
	private overlay: Graphics;
	private isAnimating = false;

	constructor(screenWidth: number, screenHeight: number) {
		this.container = new Container();
		this.container.visible = false;

		this.overlay = new Graphics();
		this.overlay.rect(0, 0, screenWidth, screenHeight);
		this.overlay.fill({ color: OVERLAY_COLOR });
		this.overlay.alpha = OVERLAY_ALPHA;
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
		const prevAlpha = this.overlay.alpha;
		this.overlay.clear();
		this.overlay.rect(0, 0, screenWidth, screenHeight);
		this.overlay.fill({ color: OVERLAY_COLOR });
		this.overlay.alpha = prevAlpha;
	}

	/**
	 * ターンに応じてオーバーレイの表示/非表示を切り替え
	 */
	render(turn: Turn): void {
		if (this.isAnimating) return;
		this.container.visible = turn === "enemy";
	}

	/**
	 * フェードインで表示
	 */
	async fadeIn(): Promise<void> {
		this.isAnimating = true;
		this.overlay.alpha = 0;
		this.container.visible = true;
		try {
			await tween(
				this.overlay,
				{ alpha: OVERLAY_ALPHA },
				{ duration: FADE_DURATION, easing: Easing.easeOut },
			);
		} finally {
			this.isAnimating = false;
		}
	}

	/**
	 * フェードアウトで非表示
	 */
	async fadeOut(): Promise<void> {
		this.isAnimating = true;
		try {
			await tween(
				this.overlay,
				{ alpha: 0 },
				{ duration: FADE_DURATION, easing: Easing.easeOut },
			);
		} finally {
			this.container.visible = false;
			this.overlay.alpha = OVERLAY_ALPHA;
			this.isAnimating = false;
		}
	}

	/**
	 * 表示
	 */
	show(): void {
		this.overlay.alpha = OVERLAY_ALPHA;
		this.container.visible = true;
	}

	/**
	 * 非表示
	 */
	hide(): void {
		this.container.visible = false;
		this.overlay.alpha = OVERLAY_ALPHA;
	}
}
