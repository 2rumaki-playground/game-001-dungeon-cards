/**
 * ターンオーバーレイのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { TurnOverlay } from "./turnOverlay";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

describe("TurnOverlay コンストラクタ", () => {
	it("getContainer()がContainerを返し、初期visibleがfalse", () => {
		const overlay = new TurnOverlay(800, 600);
		const container = overlay.getContainer();
		expect(container).toBeDefined();
		expect(container.visible).toBe(false);
	});
});

describe("TurnOverlay render", () => {
	it("敵ターンでオーバーレイが表示される", () => {
		const overlay = new TurnOverlay(800, 600);
		overlay.render("enemy");
		expect(overlay.getContainer().visible).toBe(true);
	});

	it("プレイヤーターンでオーバーレイが非表示になる", () => {
		const overlay = new TurnOverlay(800, 600);
		overlay.render("enemy");
		overlay.render("player");
		expect(overlay.getContainer().visible).toBe(false);
	});
});

describe("TurnOverlay fadeIn/fadeOut", () => {
	it("fadeInでtweenが呼ばれコンテナが表示される", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const overlay = new TurnOverlay(800, 600);
		await overlay.fadeIn();

		expect(overlay.getContainer().visible).toBe(true);
		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(1);
	});

	it("fadeOutでtweenが呼ばれコンテナが非表示になる", async () => {
		const { tween: tweenMock } = await import("../utils/tween");
		vi.mocked(tweenMock).mockClear();

		const overlay = new TurnOverlay(800, 600);
		await overlay.fadeOut();

		expect(overlay.getContainer().visible).toBe(false);
		expect(vi.mocked(tweenMock)).toHaveBeenCalledTimes(1);
	});
});

describe("TurnOverlay show/hide", () => {
	it("showで表示される", () => {
		const overlay = new TurnOverlay(800, 600);
		overlay.show();
		expect(overlay.getContainer().visible).toBe(true);
	});

	it("hideで非表示になる", () => {
		const overlay = new TurnOverlay(800, 600);
		overlay.show();
		overlay.hide();
		expect(overlay.getContainer().visible).toBe(false);
	});
});
