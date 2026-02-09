import type { Container, FederatedPointerEvent } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import type { Card } from "../types";
import type { ParticleSystem } from "./particleSystem";
import { RewardScreen } from "./rewardScreen";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

/** 再帰的にlabel一致する子要素を探す */
function findByLabel(parent: Container, label: string): Container | null {
	for (const child of parent.children) {
		if (child.label === label) return child as Container;
		if ("children" in child) {
			const c = child as Container;
			if (c.children?.length > 0) {
				const found = findByLabel(c, label);
				if (found) return found;
			}
		}
	}
	return null;
}

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
		it("選択肢分のカードと統一ボタンが描画される", () => {
			const screen = new RewardScreen();
			screen.render(["move", "attack"], 600, 400);

			// オーバーレイ + タイトル + カード2枚 + confirmButtonContainer = 5つ
			const container = screen.getContainer();
			expect(container.children.length).toBe(5);
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
			const card = container.children[2] as Container;
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

		it("gameAreaHeight変更時にタイトルとカードのY座標が垂直中央配置される", () => {
			const screen1 = new RewardScreen();
			screen1.render(["move"], 800, 600, 400, 600);
			const container1 = screen1.getContainer();
			const title1 = container1.children[1] as import("pixi.js").Text;
			const card1 = container1.children[2] as Container;

			const screen2 = new RewardScreen();
			screen2.render(["move"], 800, 600, 400, 400);
			const container2 = screen2.getContainer();
			const title2 = container2.children[1] as import("pixi.js").Text;
			const card2 = container2.children[2] as Container;

			// gameAreaHeightの差(200)の半分(100)だけY座標がシフト
			expect(title1.y - title2.y).toBe(100);
			expect(card1.y - card2.y).toBe(100);
		});
	});

	describe("setOnCardSelect", () => {
		it("カード選択→獲得ボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnCardSelect(callback);
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			// children[2]がカードコンテナ（クリック可能）
			const cardContainer = container.children[2];
			cardContainer.emit("pointerdown", {} as FederatedPointerEvent);

			// 獲得ボタンを探す
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn).toBeDefined();
			expect(acquireBtn?.eventMode).toBe("static");
			acquireBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith(0);
		});

		it("未選択時に獲得ボタンが無効状態", () => {
			const screen = new RewardScreen();
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn).toBeDefined();
			expect(acquireBtn?.eventMode).toBe("none");
		});

		it("カード選択後に獲得ボタンが有効状態になる", () => {
			const screen = new RewardScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn?.eventMode).toBe("none");

			// カードをクリック
			container.children[2].emit("pointerdown", {} as FederatedPointerEvent);
			expect(acquireBtn?.eventMode).toBe("static");
		});
	});

	describe("ハイライト", () => {
		it("カードクリックでハイライトが付与される", () => {
			const screen = new RewardScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const card0 = container.children[2] as Container;

			card0.emit("pointerdown", {} as FederatedPointerEvent);

			const highlight = card0.children.find((c) => c.label === "highlight");
			expect(highlight).toBeDefined();
		});

		it("別カードクリックで前回ハイライトが解除される", () => {
			const screen = new RewardScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const card0 = container.children[2] as Container;
			const card1 = container.children[3] as Container;

			// 1枚目を選択
			card0.emit("pointerdown", {} as FederatedPointerEvent);
			expect(card0.children.find((c) => c.label === "highlight")).toBeDefined();

			// 2枚目を選択
			card1.emit("pointerdown", {} as FederatedPointerEvent);
			expect(
				card0.children.find((c) => c.label === "highlight"),
			).toBeUndefined();
			expect(card1.children.find((c) => c.label === "highlight")).toBeDefined();
		});
	});

	describe("setOnSkip", () => {
		it("スキップボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnSkip(callback);
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const skipBtn = findByLabel(container, "skipBtn");
			expect(skipBtn).toBeDefined();
			skipBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			expect(callback).toHaveBeenCalled();
		});
	});

	describe("renderRemoveSelection", () => {
		const testCards: Card[] = [
			{ id: "card-1", type: "move" },
			{ id: "card-2", type: "attack" },
			{ id: "card-3", type: "jump" },
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

		it("gameAreaHeight変更時にタイトルのY座標が垂直中央配置される", () => {
			const screen1 = new RewardScreen();
			screen1.renderRemoveSelection(testCards, 800, 600, undefined, 400, 600);
			const container1 = screen1.getContainer();
			const title1 = container1.children[1] as import("pixi.js").Text;

			const screen2 = new RewardScreen();
			screen2.renderRemoveSelection(testCards, 800, 600, undefined, 400, 400);
			const container2 = screen2.getContainer();
			const title2 = container2.children[1] as import("pixi.js").Text;

			// gameAreaHeightの差(200)の半分(100)だけY座標がシフト
			expect(title1.y - title2.y).toBe(100);
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

		it("カード行選択→除去ボタンクリックでコールバックが呼ばれる", async () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnRemoveCard(callback);
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// scrollContainer内の最初のカード行をクリック
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			expect(scrollContainer).toBeDefined();
			const firstItem = scrollContainer.children[0] as Container;
			firstItem.emit("pointertap", {} as FederatedPointerEvent);

			// 除去ボタンをクリック
			const removeBtn = findByLabel(container, "removeBtn");
			expect(removeBtn).toBeDefined();
			expect(removeBtn?.eventMode).toBe("static");
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// animateCardRemoveが非同期のためmicrotask flush
			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalledWith("card-1");
			});
		});

		it("未選択時に除去ボタンが無効状態", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const removeBtn = findByLabel(container, "removeBtn");
			expect(removeBtn).toBeDefined();
			expect(removeBtn?.eventMode).toBe("none");
		});

		it("カード行選択後に除去ボタンが有効状態になる", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const removeBtn = findByLabel(container, "removeBtn");
			expect(removeBtn?.eventMode).toBe("none");

			// カード行をクリック
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			const firstItem = scrollContainer.children[0] as Container;
			firstItem.emit("pointertap", {} as FederatedPointerEvent);

			expect(removeBtn?.eventMode).toBe("static");
		});

		it("カード行クリックでハイライトが付与される", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			const firstItem = scrollContainer.children[0] as Container;
			firstItem.emit("pointertap", {} as FederatedPointerEvent);

			const highlight = firstItem.children.find((c) => c.label === "highlight");
			expect(highlight).toBeDefined();
		});

		it("別カード行クリックで前回ハイライトが解除される", () => {
			const screen = new RewardScreen();
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			const item0 = scrollContainer.children[0] as Container;
			const item1 = scrollContainer.children[1] as Container;

			item0.emit("pointertap", {} as FederatedPointerEvent);
			expect(item0.children.find((c) => c.label === "highlight")).toBeDefined();

			item1.emit("pointertap", {} as FederatedPointerEvent);
			expect(
				item0.children.find((c) => c.label === "highlight"),
			).toBeUndefined();
			expect(item1.children.find((c) => c.label === "highlight")).toBeDefined();
		});

		it("スキップボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardScreen();
			const callback = vi.fn();
			screen.setOnSkip(callback);
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			const skipBtn = findByLabel(container, "skipBtn");
			expect(skipBtn).toBeDefined();
			skipBtn?.emit("pointerdown", {} as FederatedPointerEvent);

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

		function createMockParticle() {
			const mockEmit = vi.fn().mockResolvedValue(undefined);
			const mockGetContainer = vi.fn().mockReturnValue({
				toLocal: (pos: { x: number; y: number }) => pos,
			});
			return {
				particle: {
					emit: mockEmit,
					getContainer: mockGetContainer,
				} as unknown as ParticleSystem,
				mockEmit,
			};
		}

		it("除去ボタンクリックでemitが呼ばれonRemoveCardが発火する", async () => {
			const screen = new RewardScreen();
			const { particle, mockEmit } = createMockParticle();
			screen.setParticleSystem(particle);

			const onRemove = vi.fn();
			screen.setOnRemoveCard(onRemove);
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// カード行を選択
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			scrollContainer.children[0].emit(
				"pointertap",
				{} as FederatedPointerEvent,
			);

			// 除去ボタンをクリック
			const removeBtn = findByLabel(container, "removeBtn");
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// tween/emitは非同期なのでmicrotask flush
			await vi.waitFor(() => {
				expect(mockEmit).toHaveBeenCalledTimes(1);
				expect(onRemove).toHaveBeenCalledWith("rm-1");
			});
		});

		it("除去アニメーション中はconfirmButtonContainerが無効化される", () => {
			const screen = new RewardScreen();
			const { particle } = createMockParticle();
			screen.setParticleSystem(particle);

			screen.setOnRemoveCard(vi.fn());
			screen.setOnSkip(vi.fn());
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// カード行を選択
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			scrollContainer.children[0].emit(
				"pointertap",
				{} as FederatedPointerEvent,
			);

			// 除去ボタンをクリック
			const removeBtn = findByLabel(container, "removeBtn");
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// confirmButtonContainerのinteractiveChildrenがfalseになる
			const confirmContainer = container.children.find(
				(c) =>
					"children" in c &&
					(c as Container).children?.some((ch) => ch.label === "removeBtn"),
			) as Container | undefined;
			expect(confirmContainer?.interactiveChildren).toBe(false);
		});

		it("除去ボタンクリック後にスクロールコンテナが無効化される", () => {
			const screen = new RewardScreen();
			const { particle } = createMockParticle();
			screen.setParticleSystem(particle);

			screen.setOnRemoveCard(vi.fn());
			screen.renderRemoveSelection(testCards, 600, 400);

			const container = screen.getContainer();
			// カード行を選択
			const scrollContainer = container.children.find(
				(c) => "mask" in c && c.mask != null,
			) as Container;
			scrollContainer.children[0].emit(
				"pointertap",
				{} as FederatedPointerEvent,
			);

			// 除去ボタンをクリック
			const removeBtn = findByLabel(container, "removeBtn");
			removeBtn?.emit("pointerdown", {} as FederatedPointerEvent);

			// スクロールコンテナのinteractiveChildrenがfalseになる
			expect(scrollContainer?.interactiveChildren).toBe(false);
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
			screen.render(["jump"], 600, 400);

			await screen.animateCardAcquire(0, "jump");
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
