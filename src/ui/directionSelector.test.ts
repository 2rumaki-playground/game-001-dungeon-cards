import type { FederatedPointerEvent } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { DirectionSelector } from "./directionSelector";

describe("DirectionSelector", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const selector = new DirectionSelector();
			expect(selector.getContainer()).toBeDefined();
		});

		it("初期状態では非表示", () => {
			const selector = new DirectionSelector();
			expect(selector.isVisible()).toBe(false);
		});
	});

	describe("show/hide", () => {
		it("showで表示状態になる", () => {
			const selector = new DirectionSelector();
			selector.show();
			expect(selector.isVisible()).toBe(true);
		});

		it("hideで非表示状態になる", () => {
			const selector = new DirectionSelector();
			selector.show();
			selector.hide();
			expect(selector.isVisible()).toBe(false);
		});

		it("showで方向ボタン4つ+キャンセルボタン1つ=5つの子要素が生成される", () => {
			const selector = new DirectionSelector();
			selector.show();
			expect(selector.getContainer().children.length).toBe(5);
		});

		it("hideで子要素がクリアされる", () => {
			const selector = new DirectionSelector();
			selector.show();
			selector.hide();
			expect(selector.getContainer().children.length).toBe(0);
		});
	});

	describe("方向選択コールバック", () => {
		it("方向ボタンクリックでコールバックが呼ばれる", () => {
			const selector = new DirectionSelector();
			const callback = vi.fn();
			selector.setOnDirectionSelect(callback);
			selector.show();

			// 最初のボタン（up）をクリック
			const upButton = selector.getContainer().children[0];
			upButton.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith("up");
		});
	});

	describe("キャンセルコールバック", () => {
		it("キャンセルボタンクリックでコールバックが呼ばれる", () => {
			const selector = new DirectionSelector();
			const callback = vi.fn();
			selector.setOnCancel(callback);
			selector.show();

			// 最後のボタン（キャンセル）をクリック
			const cancelButton = selector.getContainer().children[4];
			cancelButton.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe("ホバーエフェクト", () => {
		it("方向ボタンにpointeroverリスナーが登録されている", () => {
			const selector = new DirectionSelector();
			selector.show();

			const upButton = selector.getContainer().children[0];
			expect(upButton.listenerCount("pointerover")).toBeGreaterThan(0);
		});

		it("方向ボタンにpointeroutリスナーが登録されている", () => {
			const selector = new DirectionSelector();
			selector.show();

			const upButton = selector.getContainer().children[0];
			expect(upButton.listenerCount("pointerout")).toBeGreaterThan(0);
		});

		it("キャンセルボタンにもホバーリスナーが登録されている", () => {
			const selector = new DirectionSelector();
			selector.show();

			const cancelButton = selector.getContainer().children[4];
			expect(cancelButton.listenerCount("pointerover")).toBeGreaterThan(0);
			expect(cancelButton.listenerCount("pointerout")).toBeGreaterThan(0);
		});
	});
});
