/**
 * ターンバナーのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { TurnBanner } from "./turnBanner";

// tween をモック化（即座にresolve、対象プロパティを適用）
vi.mock("../utils/tween", () => ({
	Easing: {
		easeOut: (t: number) => t,
		easeOutCubic: (t: number) => t,
	},
	tween: vi.fn(
		(
			target: {
				alpha?: number;
				x?: number;
				y?: number;
			},
			to: {
				alpha?: number;
				x?: number;
				y?: number;
			},
		) => {
			if (to.alpha !== undefined) target.alpha = to.alpha;
			if (to.x !== undefined) target.x = to.x;
			if (to.y !== undefined) target.y = to.y;
			return Promise.resolve();
		},
	),
}));

describe("TurnBanner コンストラクタ", () => {
	it("getContainer()がContainerを返す", () => {
		const banner = new TurnBanner(800, 600);
		const container = banner.getContainer();
		expect(container).toBeDefined();
		expect(container.visible).toBe(false);
	});

	it("初期状態でvisibleがfalse", () => {
		const banner = new TurnBanner(800, 600);
		expect(banner.getContainer().visible).toBe(false);
	});
});

describe("TurnBanner showBanner", () => {
	it("showBanner('player')でテキストが「プレイヤーターン」になる", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new TurnBanner(800, 600);
		await banner.showBanner("player");

		// tweenが2回呼ばれる（スライドイン + フェードアウト）
		expect(tweenMock).toHaveBeenCalledTimes(2);

		// スライドイン: x: 0
		const firstCall = vi.mocked(tweenMock).mock.calls[0];
		expect(firstCall[1]).toEqual(expect.objectContaining({ x: 0 }));

		// フェードアウト: alpha: 0
		const secondCall = vi.mocked(tweenMock).mock.calls[1];
		expect(secondCall[1]).toEqual(expect.objectContaining({ alpha: 0 }));

		// 完了後にvisibleがfalse
		expect(banner.getContainer().visible).toBe(false);
	});

	it("showBanner('enemy')でtweenが2回呼ばれ完了後にvisibleがfalse", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new TurnBanner(800, 600);
		await banner.showBanner("enemy");

		expect(tweenMock).toHaveBeenCalledTimes(2);
		expect(banner.getContainer().visible).toBe(false);
	});
});
