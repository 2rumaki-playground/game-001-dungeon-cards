/**
 * 軽量なTweenアニメーションユーティリティ
 * PixiJSのTickerを使用して滑らかなアニメーションを実現
 */

import { Ticker } from "pixi.js";

/** イージング関数の型 */
export type EasingFunction = (t: number) => number;

/** イージング関数集 */
export const Easing = {
	/** 線形（等速） */
	linear: (t: number): number => t,

	/** 減速（ease-out） - 終盤に減速 */
	easeOut: (t: number): number => 1 - (1 - t) ** 2,

	/** 減速（強め） */
	easeOutCubic: (t: number): number => 1 - (1 - t) ** 3,

	/** 加速減速（ease-in-out） */
	easeInOut: (t: number): number =>
		t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,

	/** バウンス風（オーバーシュート付き） */
	easeOutBack: (t: number): number => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
	},
} as const;

/** Tweenのプロパティ */
export interface TweenProps {
	x?: number;
	y?: number;
	alpha?: number;
	scaleX?: number;
	scaleY?: number;
	rotation?: number;
}

/** Tweenの対象オブジェクト（PixiJSのDisplayObject互換） */
export interface TweenTarget {
	x: number;
	y: number;
	alpha: number;
	scale: { x: number; y: number };
	rotation: number;
}

/** Tweenオプション */
export interface TweenOptions {
	/** アニメーション時間（ミリ秒） */
	duration: number;
	/** イージング関数（デフォルト: easeOut） */
	easing?: EasingFunction;
	/** 遅延時間（ミリ秒） */
	delay?: number;
	/** 完了時のコールバック */
	onComplete?: () => void;
	/** フレームごとのコールバック */
	onUpdate?: (progress: number) => void;
}

/**
 * 単一オブジェクトのTweenアニメーション
 * @param target アニメーション対象
 * @param to 目標値
 * @param options オプション
 * @returns 完了時にresolveするPromise
 */
export function tween(
	target: TweenTarget,
	to: TweenProps,
	options: TweenOptions,
): Promise<void> {
	return new Promise((resolve) => {
		const {
			duration,
			easing = Easing.easeOut,
			delay = 0,
			onComplete,
			onUpdate,
		} = options;

		// 開始値を記録
		const from: TweenProps = {
			x: to.x !== undefined ? target.x : undefined,
			y: to.y !== undefined ? target.y : undefined,
			alpha: to.alpha !== undefined ? target.alpha : undefined,
			scaleX: to.scaleX !== undefined ? target.scale.x : undefined,
			scaleY: to.scaleY !== undefined ? target.scale.y : undefined,
			rotation: to.rotation !== undefined ? target.rotation : undefined,
		};

		let elapsed = -delay;
		const ticker = Ticker.shared;

		const update = (tick: Ticker): void => {
			elapsed += tick.deltaMS;

			if (elapsed < 0) {
				// 遅延中
				return;
			}

			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easing(progress);

			// 各プロパティを補間
			if (from.x !== undefined && to.x !== undefined) {
				target.x = from.x + (to.x - from.x) * easedProgress;
			}
			if (from.y !== undefined && to.y !== undefined) {
				target.y = from.y + (to.y - from.y) * easedProgress;
			}
			if (from.alpha !== undefined && to.alpha !== undefined) {
				target.alpha = from.alpha + (to.alpha - from.alpha) * easedProgress;
			}
			if (from.scaleX !== undefined && to.scaleX !== undefined) {
				target.scale.x =
					from.scaleX + (to.scaleX - from.scaleX) * easedProgress;
			}
			if (from.scaleY !== undefined && to.scaleY !== undefined) {
				target.scale.y =
					from.scaleY + (to.scaleY - from.scaleY) * easedProgress;
			}
			if (from.rotation !== undefined && to.rotation !== undefined) {
				target.rotation =
					from.rotation + (to.rotation - from.rotation) * easedProgress;
			}

			onUpdate?.(progress);

			if (progress >= 1) {
				ticker.remove(update);
				onComplete?.();
				resolve();
			}
		};

		ticker.add(update);
	});
}

/**
 * 指定時間待機
 * @param ms ミリ秒
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		let elapsed = 0;
		const ticker = Ticker.shared;

		const update = (tick: Ticker): void => {
			elapsed += tick.deltaMS;
			if (elapsed >= ms) {
				ticker.remove(update);
				resolve();
			}
		};

		ticker.add(update);
	});
}

/**
 * 複数のTweenを順番に実行
 * @param tweens Tweenを生成する関数の配列
 */
export async function sequence(tweens: (() => Promise<void>)[]): Promise<void> {
	for (const tweenFn of tweens) {
		await tweenFn();
	}
}

/**
 * 複数のTweenを並列に実行
 * @param tweens Promise配列
 */
export async function parallel(tweens: Promise<void>[]): Promise<void> {
	await Promise.all(tweens);
}
