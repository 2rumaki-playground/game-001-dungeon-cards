import type { FederatedPointerEvent } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import type { Card } from "../types";
import type { ParticleSystem } from "./particleSystem";
import { RewardScreen } from "./rewardScreen";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

describe("RewardScreen", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const screen = new RewardScreen();
			expect(screen.getContainer()).toBeDefined();
		});

		it("初期状態では非表示", () => {
			const screen = new RewardScreen();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("show/hide", () => {
		it("showでコンテナが表示される", () => {
			const screen = new RewardScreen();
			screen.show();
			expect(screen.getContainer().visible).toBe(true);
		});

		it("hideでコンテナが非表示になる", () => {
			const screen = new RewardScreen();
			screen.show();
			screen.hide();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("選択肢分のカードが描画される", () => {
			const screen = new RewardScreen();
			screen.render(["move", "attack"], 600, 400);

			// オーバーレイ + タイトル + カード2枚 = 4つの子要素
			const container = screen.getContainer();
			expect(container.children.length).toBe(4);
		});
	});

	describe("setOnCardSelect", () => {
		it("選択ボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnCardSelect(callback);
			screen.render(["move"], 600, 400);

			// カードコンテナ内の選択ボタンを探してクリック
			const container = screen.getContainer();
			// children: overlay, title, card0
			const cardContainer = container.children[2];
			// カード内の選択ボタンを見つける（eventModeが"static"でcursorが"pointer"のもの）
			const selectBtn = cardContainer.children.find(
				(child) => child.eventMode === "static" && child.cursor === "pointer",
			);
			expect(selectBtn).toBeDefined();
			selectBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith(0);
		});
	});

	describe("setOnSkip", () => {
		it("スキップボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnSkip(callback);
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const cardContainer = container.children[2];
			// 2つ目のinteractiveなボタンがスキップ
			const buttons = cardContainer.children.filter(
				(child) => child.eventMode === "static" && child.cursor === "pointer",
			);
			expect(buttons.length).toBeGreaterThanOrEqual(2);
			buttons[1].emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith(0);
		});
	});

	describe("renderRemoveSelection", () => {
		const testCards: Card[] = [
			{ id: "card-1", type: "move" },
			{ id: "card-2", type: "attack" },
			{ id: "card-3", type: "rush" },
		];

		it("カスタムタイトルを渡した場合にそのテキストが描画される", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400, "カード除去イベント");

			const container = screen.getContainer();
			// children[0]=overlay, children[1]=title(Text)
			const title = container.children[1] as import("pixi.js").Text;
			expect(title.text).toBe("カード除去イベント");
		});

		it("除去選択画面が描画される", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// 子要素が生成されている
			expect(container.children.length).toBeGreaterThan(0);
		});

		it("除去ボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnRemoveCard(callback);
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// コンテナの子要素を再帰的に探索して除去ボタンを見つける
			function findRemoveButton(
				parent: import("pixi.js").Container,
			): import("pixi.js").Container | null {
				for (const child of parent.children) {
					if (child.eventMode === "static" && child.cursor === "pointer") {
						// 除去ボタンは子がテキストを含むContainer
						return child as import("pixi.js").Container;
					}
					if ("children" in child) {
						const c = child as import("pixi.js").Container;
						if (c.children?.length > 0) {
							const found = findRemoveButton(c);
							if (found) return found;
						}
					}
				}
				return null;
			}
			const removeBtn = findRemoveButton(container);
			expect(removeBtn).toBeDefined();
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith("card-1");
		});

		it("スキップボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnSkip(callback);
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// スキップボタンはcontainer直下のinteractive要素
			function findButtons(
				parent: import("pixi.js").Container,
			): import("pixi.js").Container[] {
				const result: import("pixi.js").Container[] = [];
				for (const child of parent.children) {
					if (child.eventMode === "static" && child.cursor === "pointer") {
						result.push(child as import("pixi.js").Container);
					}
				}
				return result;
			}
			const buttons = findButtons(container);
			// 最後のinteractive直下要素がスキップボタン
			const cancelBtn = buttons[buttons.length - 1];
			expect(cancelBtn).toBeDefined();
			cancelBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalled();
		});
	});

	describe("setParticleSystem", () => {
		it("パーティクルシステムを設定できる", () => {
			const screen = new RewardScreen();
			const mockParticle = {
				emit: vi.fn().mockResolvedValue(undefined),
			} as unknown as ParticleSystem;
			// エラーなく設定できること
			screen.setParticleSystem(mockParticle);
		});
	});

	describe("animateCardAcquire", () => {
		it("存在しないインデックスでもエラーにならない", async () => {
			const screen = new RewardScreen();
			// renderなしで呼んでもエラーにならない
			await expect(
				screen.animateCardAcquire(999, "move"),
			).resolves.toBeUndefined();
		});

		it("render後にemitがレアリティに応じた引数で呼ばれる（common）", async () => {
			const screen = new RewardScreen();
			const mockEmit = vi.fn().mockResolvedValue(undefined);
			const mockGetContainer = vi.fn().mockReturnValue({
				toLocal: (pos: { x: number; y: number }) => pos,
			});
			const mockParticle = {
				emit: mockEmit,
				getContainer: mockGetContainer,
			} as unknown as ParticleSystem;
			screen.setParticleSystem(mockParticle);
			screen.render(["move"], 600, 400);

			await screen.animateCardAcquire(0, "move");
			expect(mockEmit).toHaveBeenCalledTimes(1);
			expect(mockEmit).toHaveBeenCalledWith(
				expect.objectContaining({
					count: 12,
				}),
			);
		});

		it("render後にemitがレアリティに応じた引数で呼ばれる（rare）", async () => {
			const screen = new RewardScreen();
			const mockEmit = vi.fn().mockResolvedValue(undefined);
			const mockGetContainer = vi.fn().mockReturnValue({
				toLocal: (pos: { x: number; y: number }) => pos,
			});
			const mockParticle = {
				emit: mockEmit,
				getContainer: mockGetContainer,
			} as unknown as ParticleSystem;
			screen.setParticleSystem(mockParticle);
			screen.render(["rush"], 600, 400);

			await screen.animateCardAcquire(0, "rush");
			expect(mockEmit).toHaveBeenCalledTimes(1);
			expect(mockEmit).toHaveBeenCalledWith(
				expect.objectContaining({
					count: 30,
				}),
			);
		});
	});
});
