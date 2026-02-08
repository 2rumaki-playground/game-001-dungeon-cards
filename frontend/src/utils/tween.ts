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
	/** フレームごとのコールバック（eased progressを受け取る） */
	onUpdate?: (progress: number) => void;
	/** キャンセル用のAbortSignal */
	signal?: AbortSignal;
}

/** tweenValueオプション */
export interface TweenValueOptions {
	/** アニメーション時間（ミリ秒） */
	duration: number;
	/** イージング関数（デフォルト: easeOut） */
	easing?: EasingFunction;
	/** 遅延時間（ミリ秒） */
	delay?: number;
	/** フレームごとのコールバック（eased progressを受け取る） */
	onUpdate: (progress: number) => void;
	/** 完了時のコールバック */
	onComplete?: () => void;
}

/**
 * 値補間のみのTweenアニメーション
 * TweenTargetを使わず、onUpdateにeased progressを渡す
 */
export function tweenValue(options: TweenValueOptions): Promise<void> {
	return new Promise((resolve, reject) => {
		const {
			duration,
			easing = Easing.easeOut,
			delay = 0,
			onUpdate,
			onComplete,
		} = options;

		if (duration <= 0) {
			try {
				onUpdate(1);
				onComplete?.();
				resolve();
			} catch (error) {
				reject(error);
			}
			return;
		}

		let elapsed = -delay;
		const ticker = Ticker.shared;

		const update = (tick: Ticker): void => {
			try {
				elapsed += tick.deltaMS;

				if (elapsed < 0) {
					return;
				}

				const progress = Math.min(elapsed / duration, 1);
				const easedProgress = easing(progress);

				onUpdate(easedProgress);

				if (progress >= 1) {
					ticker.remove(update);
					onComplete?.();
					resolve();
				}
			} catch (error) {
				ticker.remove(update);
				reject(error);
			}
		};

		ticker.add(update);
	});
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
	return new Promise((resolve, reject) => {
		const {
			duration,
			easing = Easing.easeOut,
			delay = 0,
			onComplete,
			onUpdate,
			signal,
		} = options;

		// 既にキャンセル済みの場合は即座にresolve
		if (signal?.aborted) {
			resolve();
			return;
		}

		// duration が 0 以下の場合は即座に目標値を適用して完了
		if (duration <= 0) {
			try {
				if (to.x !== undefined) target.x = to.x;
				if (to.y !== undefined) target.y = to.y;
				if (to.alpha !== undefined) target.alpha = to.alpha;
				if (to.scaleX !== undefined) target.scale.x = to.scaleX;
				if (to.scaleY !== undefined) target.scale.y = to.scaleY;
				if (to.rotation !== undefined) target.rotation = to.rotation;
				onUpdate?.(1);
				onComplete?.();
				resolve();
			} catch (error) {
				reject(error);
			}
			return;
		}

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
			try {
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

				onUpdate?.(easedProgress);

				if (progress >= 1) {
					ticker.remove(update);
					onComplete?.();
					resolve();
				}
			} catch (error) {
				ticker.remove(update);
				reject(error);
			}
		};

		// signalでキャンセル時にTickerから外す
		signal?.addEventListener(
			"abort",
			() => {
				ticker.remove(update);
				resolve();
			},
			{ once: true },
		);

		ticker.add(update);
	});
}
