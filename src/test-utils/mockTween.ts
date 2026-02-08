import { vi } from "vitest";

/**
 * Easing関数のダミー実装（すべて線形）
 */
export const mockEasing = {
	linear: (t: number) => t,
	easeOut: (t: number) => t,
	easeOutCubic: (t: number) => t,
	easeInOut: (t: number) => t,
	easeOutBack: (t: number) => t,
};

/**
 * tween関数のモック
 * 対象オブジェクトに即座にプロパティを適用し、onUpdateがあればprogress=1で呼び出す
 */
export function createTweenMock() {
	return vi.fn(
		(
			target: {
				alpha?: number;
				x?: number;
				y?: number;
				scale?: { x: number; y: number };
				rotation?: number;
			},
			to: {
				alpha?: number;
				x?: number;
				y?: number;
				scaleX?: number;
				scaleY?: number;
				rotation?: number;
			},
			options?: { onUpdate?: (p: number) => void },
		) => {
			if (to.alpha !== undefined) target.alpha = to.alpha;
			if (to.x !== undefined) target.x = to.x;
			if (to.y !== undefined) target.y = to.y;
			if (to.scaleX !== undefined && target.scale) target.scale.x = to.scaleX;
			if (to.scaleY !== undefined && target.scale) target.scale.y = to.scaleY;
			if (to.rotation !== undefined) target.rotation = to.rotation;
			options?.onUpdate?.(1);
			return Promise.resolve();
		},
	);
}

/**
 * tweenValue関数のモック
 * onUpdateをprogress=1で即座に呼び出す
 */
export function createTweenValueMock() {
	return vi.fn((options?: { onUpdate?: (p: number) => void }) => {
		options?.onUpdate?.(1);
		return Promise.resolve();
	});
}
