/**
 * 勝利画面UIのテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/tween", () => ({
	tween: vi.fn(() => Promise.resolve()),
	Easing: {
		linear: (t: number) => t,
		easeOut: (t: number) => t,
		easeOutCubic: (t: number) => t,
		easeInOut: (t: number) => t,
		easeOutBack: (t: number) => t,
	},
}));

import type { Container, FederatedPointerEvent } from "pixi.js";
import { getTexts } from "../test-utils/pixiTestHelper";
import { VictoryScreen } from "./victoryScreen";

/** ラベルテキストでinteractiveなボタンを探索 */
function findButtonByLabel(
	parent: Container,
	label: string,
): Container | undefined {
	return parent.children.find((child) => {
		if (child.eventMode !== "static" || child.cursor !== "pointer")
			return false;
		const texts = getTexts(child as Container);
		return texts.some((t) => t.text === label);
	}) as Container | undefined;
}

describe("VictoryScreen", () => {
	let screen: VictoryScreen;

	beforeEach(() => {
		screen = new VictoryScreen();
	});

	describe("getContainer", () => {
		it("Containerを返す", () => {
			const container = screen.getContainer();
			expect(container).toBeDefined();
		});
	});

	describe("render", () => {
		it("タイトルテキストが含まれる", () => {
			screen.render(20, 400, 600);
			const texts = getTexts(screen.getContainer());
			const titleTexts = texts.filter((t) =>
				t.text.includes("ダンジョンクリア"),
			);
			expect(titleTexts.length).toBeGreaterThan(0);
		});

		it("到達階層テキストが含まれる", () => {
			screen.render(20, 400, 600);
			const texts = getTexts(screen.getContainer());
			const floorTexts = texts.filter((t) => t.text.includes("到達階層"));
			expect(floorTexts.length).toBeGreaterThan(0);
		});

		it("floor値が反映される", () => {
			screen.render(15, 400, 600);
			const texts = getTexts(screen.getContainer());
			const floorText = texts.find((t) => t.text.includes("15"));
			expect(floorText).toBeDefined();
		});

		it("半透明オーバーレイが含まれる", () => {
			screen.render(20, 400, 600);
			const container = screen.getContainer();
			// オーバーレイはGraphics要素として最初の子要素
			expect(container.children.length).toBeGreaterThanOrEqual(1);
		});

		it("再描画時に前の子要素がクリアされる", () => {
			screen.render(20, 400, 600);
			const countBefore = screen.getContainer().children.length;
			screen.render(20, 400, 600);
			const countAfter = screen.getContainer().children.length;
			expect(countAfter).toBe(countBefore);
		});
	});

	describe("show / hide", () => {
		it("show()でvisibleがtrueになる", () => {
			screen.hide();
			screen.show();
			expect(screen.getContainer().visible).toBe(true);
		});

		it("hide()でvisibleがfalseになる", () => {
			screen.show();
			screen.hide();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("コールバック", () => {
		it("続けるボタンのpointerdownでsetOnContinueコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnContinue(callback);
			screen.render(20, 400, 600);
			const continueButton = findButtonByLabel(screen.getContainer(), "続ける");
			expect(continueButton).toBeDefined();
			continueButton?.emit("pointerdown", {} as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("タイトルに戻るボタンのpointerdownでsetOnReturnToTitleコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnReturnToTitle(callback);
			screen.render(20, 400, 600);
			const returnButton = findButtonByLabel(
				screen.getContainer(),
				"タイトルに戻る",
			);
			expect(returnButton).toBeDefined();
			returnButton?.emit("pointerdown", {} as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
