/**
 * 階層遷移バナーのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { FloorBanner } from "./floorBanner";

// tween をモック化（即座にresolve、対象プロパティを適用）
vi.mock("../utils/tween", () => ({
	Easing: {
		easeOut: (t: number) => t,
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

describe("FloorBanner コンストラクタ", () => {
	it("getContainer()がContainerを返し、初期visibleがfalse", () => {
		const banner = new FloorBanner(800, 600);
		const container = banner.getContainer();
		expect(container).toBeDefined();
		expect(container.visible).toBe(false);
	});
});

describe("FloorBanner show", () => {
	it("show()でcontainer.visibleがtrueになる", async () => {
		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(3);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;
		expect(banner.getContainer().visible).toBe(true);
		vi.useRealTimers();
	});

	it("show()でtweenが1回呼ばれる（alpha:1のフェードイン）", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(5);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;

		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(1);
		const firstCall = vi.mocked(tweenMock).mock.calls[0];
		expect(firstCall[1]).toEqual(expect.objectContaining({ alpha: 1 }));
		vi.useRealTimers();
	});

	it("テキストが画面中央に配置される", async () => {
		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(2);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;

		const container = banner.getContainer();
		const textChild = container.children[0];
		expect(textChild.x).toBe(400);
		expect(textChild.y).toBe(300);
		vi.useRealTimers();
	});
});

describe("FloorBanner hide", () => {
	it("hide()でtweenが呼ばれ、alpha:0のフェードアウトが実行される", async () => {
		const { tween: tweenMock } = await import("../utils/tween");

		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(1);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;
		vi.useRealTimers();

		vi.mocked(tweenMock).mockClear();
		await banner.hide();

		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(1);
		const call = vi.mocked(tweenMock).mock.calls[0];
		expect(call[1]).toEqual(expect.objectContaining({ alpha: 0 }));
	});

	it("hide()完了後にcontainer.visibleがfalseに戻る", async () => {
		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(1);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;
		vi.useRealTimers();

		await banner.hide();
		expect(banner.getContainer().visible).toBe(false);
	});
});

describe("FloorBanner show→hide シーケンス", () => {
	it("show→hide の全シーケンスが正しく動作する", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new FloorBanner(800, 600);
		vi.useFakeTimers();
		const showPromise = banner.show(7);
		await vi.advanceTimersByTimeAsync(1000);
		await showPromise;
		vi.useRealTimers();

		await banner.hide();

		// show(1回) + hide(1回) = 2回
		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(2);
		expect(banner.getContainer().visible).toBe(false);
	});

	it("異なる階層番号で繰り返し使用できる", async () => {
		const banner = new FloorBanner(800, 600);

		for (const floor of [1, 2, 3]) {
			vi.useFakeTimers();
			const showPromise = banner.show(floor);
			await vi.advanceTimersByTimeAsync(1000);
			await showPromise;
			vi.useRealTimers();

			expect(banner.getContainer().visible).toBe(true);
			await banner.hide();
			expect(banner.getContainer().visible).toBe(false);
		}
	});
});
