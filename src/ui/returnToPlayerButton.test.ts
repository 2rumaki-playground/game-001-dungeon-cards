import type { FederatedPointerEvent } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { ReturnToPlayerButton } from "./returnToPlayerButton";

describe("ReturnToPlayerButton", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const button = new ReturnToPlayerButton();
			expect(button.getContainer()).toBeDefined();
		});

		it("初期状態は非表示", () => {
			const button = new ReturnToPlayerButton();
			expect(button.getContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("trueで表示される", () => {
			const button = new ReturnToPlayerButton();
			button.render(true);
			expect(button.getContainer().visible).toBe(true);
		});

		it("falseで非表示になる", () => {
			const button = new ReturnToPlayerButton();
			button.render(true);
			button.render(false);
			expect(button.getContainer().visible).toBe(false);
		});
	});

	describe("setOnClick", () => {
		it("コールバックが設定される", () => {
			const button = new ReturnToPlayerButton();
			const callback = vi.fn();

			button.setOnClick(callback);
			button.render(true);

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			buttonContainer.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("複数回呼んでもpointerdownリスナーが増えない", () => {
			const button = new ReturnToPlayerButton();
			const container = button.getContainer();
			const buttonContainer = container.children[0];
			const initialCount = buttonContainer.listenerCount("pointerdown");

			button.setOnClick(vi.fn());
			button.setOnClick(vi.fn());
			button.setOnClick(vi.fn());

			expect(buttonContainer.listenerCount("pointerdown")).toBe(initialCount);
		});
	});

	describe("show/hide", () => {
		it("showでコンテナが表示される", () => {
			const button = new ReturnToPlayerButton();
			button.show();
			expect(button.getContainer().visible).toBe(true);
		});

		it("hideでコンテナが非表示になる", () => {
			const button = new ReturnToPlayerButton();
			button.show();
			button.hide();
			expect(button.getContainer().visible).toBe(false);
		});
	});
});
