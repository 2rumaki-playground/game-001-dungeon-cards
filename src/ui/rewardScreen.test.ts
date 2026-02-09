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

		it("gameAreaWidth指定時にタイトルとカードがゲームエリア中央に配置される", () => {
			const screen = new RewardScreen();
			// screenWidth=800, screenHeight=600だが、ゲームエリアは400x600
			screen.render(["move"], 800, 600, 400, 600);

			const container = screen.getContainer();
			// children[1]がタイトル
			const title = container.children[1] as import("pixi.js").Text;
			// タイトルのX座標がゲームエリア幅(400)の中央付近であること
			expect(title.x).toBe(200);

			// children[2]がカードコンテナ
			const card = container.children[2] as import("pixi.js").Container;
			// カード幅120なので、(400 - 120) / 2 = 140
			expect(card.x).toBe(140);
		});

		it("gameAreaWidth未指定時にscreenWidth基準で配置される", () => {
			const screen = new RewardScreen();
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			// タイトルのX座標がscreenWidth(600)の中央
			expect(title.x).toBe(300);
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

		it("gameAreaWidth指定時にタイトルがゲームエリア中央に配置される", () => {
			const screen = new RewardScreen();
			// screenWidth=800だが、ゲームエリアは400
			screen.renderRemoveSelection(testCards, 800, 600, undefined, 400, 600);

			const container = screen.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			// タイトルのX座標がゲームエリア幅(400)の中央
			expect(title.x).toBe(200);
		});

		it("gameAreaWidth未指定時にscreenWidth基準で配置される", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			// タイトルのX座標がscreenWidth(600)の中央
			expect(title.x).toBe(300);
		});

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

		it("除去ボタンクリックでコールバックが呼ばれる", async () => {
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

			// animateCardRemoveが非同期のためmicrotask flush
			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalledWith("card-1");
			});
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

	describe("animateCardRemove（ParticleSystem設定済み）", () => {
		const testCards: Card[] = [
			{ id: "rm-1", type: "move" },
			{ id: "rm-2", type: "attack" },
		];

		function findRemoveButton(
			parent: import("pixi.js").Container,
		): import("pixi.js").Container | null {
			for (const child of parent.children) {
				if (child.eventMode === "static" && child.cursor === "pointer") {
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

		it("除去ボタンクリックでemitが呼ばれonRemoveCardが発火する", async () => {
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

			const onRemove = vi.fn();
			screen.setOnRemoveCard(onRemove);
			screen.renderRemoveSelection(testCards, 600, 400);

			const removeBtn = findRemoveButton(screen.getContainer());
			expect(removeBtn).toBeDefined();
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// tween/emitは非同期なのでmicrotask flush
			await vi.waitFor(() => {
				expect(mockEmit).toHaveBeenCalledTimes(1);
				expect(onRemove).toHaveBeenCalledWith("rm-1");
			});
		});

		it("除去アニメーション中はキャンセルボタンのeventModeがnoneになる", () => {
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

			screen.setOnRemoveCard(vi.fn());
			screen.setOnSkip(vi.fn());
			screen.renderRemoveSelection(testCards, 600, 400);

			// キャンセルボタンを取得
			const container = screen.getContainer();
			function findDirectButtons(
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
			const directButtons = findDirectButtons(container);
			const cancelBtn = directButtons[directButtons.length - 1];
			expect(cancelBtn?.eventMode).toBe("static");

			const removeBtn = findRemoveButton(container);
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// 除去クリック後にキャンセルボタンが無効化される
			expect(cancelBtn?.eventMode).toBe("none");
		});

		it("除去ボタンクリック後にスクロールコンテナとキャンセルボタンが無効化される", () => {
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

			screen.setOnRemoveCard(vi.fn());
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const removeBtn = findRemoveButton(container);
			expect(removeBtn).toBeDefined();
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// スクロールコンテナのinteractiveChildrenがfalseになる
			const scrollContainer = container.children.find(
				(c) => "interactiveChildren" in c && c.mask != null,
			) as import("pixi.js").Container | undefined;
			expect(scrollContainer?.interactiveChildren).toBe(false);

			// キャンセルボタンのeventModeがnoneになる
			function findDirectButtons(
				parent: import("pixi.js").Container,
			): import("pixi.js").Container[] {
				const result: import("pixi.js").Container[] = [];
				for (const child of parent.children) {
					if (
						child.cursor === "pointer" &&
						!("mask" in child && child.mask != null)
					) {
						result.push(child as import("pixi.js").Container);
					}
				}
				return result;
			}
			const directButtons = findDirectButtons(container);
			const cancelBtn = directButtons[directButtons.length - 1];
			expect(cancelBtn?.eventMode).toBe("none");
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
					color: [0xaaaaaa, 0xcccccc],
					life: { min: 300, max: 500 },
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
					color: [0xddaa22, 0xffdd44, 0xffcc00, 0xffffff],
					life: { min: 300, max: 800 },
				}),
			);
		});
	});
});
