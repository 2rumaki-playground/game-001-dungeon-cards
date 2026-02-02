/**
 * 画面遷移トランジションのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { ScreenTransition } from "./screenTransition";

// tween をモック化（即座にresolve、対象プロパティを適用）
vi.mock("../utils/tween", () => ({
	Easing: {
		easeInOut: (t: number) => t,
	},
	tween: vi.fn(
		(
			target: {
				alpha?: number;
			},
			to: {
				alpha?: number;
			},
		) => {
			if (to.alpha !== undefined) target.alpha = to.alpha;
			return Promise.resolve();
		},
	),
}));

describe("ScreenTransition コンストラクタ", () => {
	it("getContainer()がContainerを返し、初期visibleがfalse", () => {
		const transition = new ScreenTransition(800, 600);
		const container = transition.getContainer();
		expect(container).toBeDefined();
		expect(container.visible).toBe(false);
	});
});

describe("ScreenTransition fadeTransition", () => {
	it("tweenが2回呼ばれる（フェードアウト+フェードイン）", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(() => {});

		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(2);
	});

	it("最初のtweenがalpha:1（フェードアウト）で呼ばれる", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(() => {});

		const firstCall = vi.mocked(tweenMock).mock.calls[0];
		expect(firstCall[1]).toEqual(expect.objectContaining({ alpha: 1 }));
	});

	it("2回目のtweenがalpha:0（フェードイン）で呼ばれる", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(() => {});

		const secondCall = vi.mocked(tweenMock).mock.calls[1];
		expect(secondCall[1]).toEqual(expect.objectContaining({ alpha: 0 }));
	});

	it("onTransitionコールバックが1回呼ばれる", async () => {
		const callback = vi.fn();
		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(callback);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("実行順序: フェードアウト → コールバック → フェードイン", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		const callOrder: string[] = [];

		vi.mocked(tweenMock).mockImplementation(
			(target: { alpha?: number }, to: { alpha?: number }) => {
				if (to.alpha !== undefined) target.alpha = to.alpha;
				if (to.alpha === 1) callOrder.push("fadeOut");
				if (to.alpha === 0) callOrder.push("fadeIn");
				return Promise.resolve();
			},
		);

		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(() => {
			callOrder.push("callback");
		});

		expect(callOrder).toEqual(["fadeOut", "callback", "fadeIn"]);
	});

	it("完了後にcontainer.visibleがfalseに戻る", async () => {
		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(() => {});

		expect(transition.getContainer().visible).toBe(false);
	});

	it("非同期コールバックが正しくawaitされる", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		const callOrder: string[] = [];

		vi.mocked(tweenMock).mockImplementation(
			(target: { alpha?: number }, to: { alpha?: number }) => {
				if (to.alpha !== undefined) target.alpha = to.alpha;
				if (to.alpha === 1) callOrder.push("fadeOut");
				if (to.alpha === 0) callOrder.push("fadeIn");
				return Promise.resolve();
			},
		);

		const transition = new ScreenTransition(800, 600);
		await transition.fadeTransition(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			callOrder.push("asyncCallback");
		});

		expect(callOrder).toEqual(["fadeOut", "asyncCallback", "fadeIn"]);
	});
});
