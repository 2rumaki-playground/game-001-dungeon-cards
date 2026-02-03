/**
 * ターンバナーのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { TurnBanner } from "./turnBanner";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
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
	it("showBanner('player')でtweenが3回以上呼ばれ完了後にvisibleがfalse", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new TurnBanner(800, 600);
		await banner.showBanner("player");

		// 背景フェードイン(1) + 文字ポップイン(N) + フェードアウト(1) = 3回以上
		expect(vi.mocked(tweenMock).mock.calls.length).toBeGreaterThanOrEqual(3);

		// 最後のtween呼び出しはコンテナのフェードアウト（alpha: 0）
		const lastCall =
			vi.mocked(tweenMock).mock.calls[
				vi.mocked(tweenMock).mock.calls.length - 1
			];
		expect(lastCall[1]).toEqual(expect.objectContaining({ alpha: 0 }));

		// 完了後にvisibleがfalse
		expect(banner.getContainer().visible).toBe(false);
	});

	it("showBanner('enemy')でtweenが3回以上呼ばれ完了後にvisibleがfalse", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const banner = new TurnBanner(800, 600);
		await banner.showBanner("enemy");

		expect(vi.mocked(tweenMock).mock.calls.length).toBeGreaterThanOrEqual(3);
		expect(banner.getContainer().visible).toBe(false);
	});
});
