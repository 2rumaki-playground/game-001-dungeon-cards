import type { FederatedPointerEvent } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { NextFloorButton } from "./nextFloorButton";

describe("NextFloorButton", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const button = new NextFloorButton();
			expect(button.getContainer()).toBeDefined();
		});

		it("初期状態は非表示", () => {
			const button = new NextFloorButton();
			expect(button.getContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("敵が0体のときボタンが表示される", () => {
			const button = new NextFloorButton();
			button.render(0);
			expect(button.getContainer().visible).toBe(true);
		});

		it("敵が残っているときボタンが非表示になる", () => {
			const button = new NextFloorButton();
			button.render(0);
			expect(button.getContainer().visible).toBe(true);

			button.render(3);
			expect(button.getContainer().visible).toBe(false);
		});

		it("敵が1体でもいればボタンは非表示", () => {
			const button = new NextFloorButton();
			button.render(1);
			expect(button.getContainer().visible).toBe(false);
		});
	});

	describe("setOnNextFloor", () => {
		it("コールバックが設定される", () => {
			const button = new NextFloorButton();
			const callback = vi.fn();

			button.setOnNextFloor(callback);
			button.render(0);

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			buttonContainer.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("複数回呼んでもpointerdownリスナーが増えない", () => {
			const button = new NextFloorButton();
			const container = button.getContainer();
			const buttonContainer = container.children[0];
			const initialCount = buttonContainer.listenerCount("pointerdown");

			button.setOnNextFloor(vi.fn());
			button.setOnNextFloor(vi.fn());
			button.setOnNextFloor(vi.fn());

			expect(buttonContainer.listenerCount("pointerdown")).toBe(initialCount);
		});
	});

	describe("show/hide", () => {
		it("showでコンテナが表示される", () => {
			const button = new NextFloorButton();
			button.show();
			expect(button.getContainer().visible).toBe(true);
		});

		it("hideでコンテナが非表示になる", () => {
			const button = new NextFloorButton();
			button.show();
			button.hide();
			expect(button.getContainer().visible).toBe(false);
		});
	});
});
