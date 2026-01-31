import { describe, expect, it, vi } from "vitest";
import { TurnEndButton } from "./turnEndButton";

describe("TurnEndButton", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const button = new TurnEndButton();
			expect(button.getContainer()).toBeDefined();
		});
	});

	describe("render", () => {
		it("プレイヤーターン中はボタンが活性化される", () => {
			const button = new TurnEndButton();
			button.render("player");

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			expect(buttonContainer.eventMode).toBe("static");
			expect(buttonContainer.cursor).toBe("pointer");
		});

		it("敵ターン中はボタンが非活性化される", () => {
			const button = new TurnEndButton();
			button.render("enemy");

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			expect(buttonContainer.eventMode).toBe("none");
			expect(buttonContainer.cursor).toBe("default");
		});

		it("ターンが切り替わるとボタン状態も切り替わる", () => {
			const button = new TurnEndButton();
			const container = button.getContainer();
			const buttonContainer = container.children[0];

			button.render("player");
			expect(buttonContainer.eventMode).toBe("static");

			button.render("enemy");
			expect(buttonContainer.eventMode).toBe("none");

			button.render("player");
			expect(buttonContainer.eventMode).toBe("static");
		});
	});

	describe("setOnEndTurn", () => {
		it("コールバックが設定される", () => {
			const button = new TurnEndButton();
			const callback = vi.fn();

			button.setOnEndTurn(callback);
			button.render("player");

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			buttonContainer.emit("pointerdown");

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("非活性時はコールバックが呼ばれない", () => {
			const button = new TurnEndButton();
			const callback = vi.fn();

			button.setOnEndTurn(callback);
			button.render("enemy");

			const container = button.getContainer();
			const buttonContainer = container.children[0];
			buttonContainer.emit("pointerdown");

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe("show/hide", () => {
		it("showでコンテナが表示される", () => {
			const button = new TurnEndButton();
			button.hide();
			button.show();
			expect(button.getContainer().visible).toBe(true);
		});

		it("hideでコンテナが非表示になる", () => {
			const button = new TurnEndButton();
			button.hide();
			expect(button.getContainer().visible).toBe(false);
		});
	});
});
