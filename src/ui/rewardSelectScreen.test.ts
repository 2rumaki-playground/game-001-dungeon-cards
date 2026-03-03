import type { Container, FederatedPointerEvent, Text } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { CARD_TYPE_NAME } from "./cardConstants";
import type { ParticleSystem } from "./particleSystem";
import { RewardSelectScreen } from "./rewardSelectScreen";

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

describe("RewardSelectScreen", () => {
	describe("コンストラクタ", () => {
		it("コンテナを作成する", () => {
			const screen = new RewardSelectScreen();
			expect(screen.getContainer()).toBeDefined();
		});

		it("初期状態では非表示", () => {
			const screen = new RewardSelectScreen();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("show/hide", () => {
		it("showでコンテナが表示される", () => {
			const screen = new RewardSelectScreen();
			screen.show();
			expect(screen.getContainer().visible).toBe(true);
		});

		it("hideでコンテナが非表示になる", () => {
			const screen = new RewardSelectScreen();
			screen.show();
			screen.hide();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("選択肢分のカードと統一ボタンが描画される", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move", "attack"], 600, 400);

			// オーバーレイ + タイトル + カード2枚 + confirmButtonContainer + tooltipContainer = 6つ
			const container = screen.getContainer();
			expect(container.children.length).toBe(6);
		});

		it("gameAreaWidth指定時にタイトルとカードがゲームエリア中央に配置される", () => {
			const screen = new RewardSelectScreen();
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
			const screen = new RewardSelectScreen();
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			// タイトルのX座標がscreenWidth(600)の中央
			expect(title.x).toBe(300);
		});

		it("gameAreaHeight変更時にタイトルとカードのY座標が垂直中央配置される", () => {
			const screen1 = new RewardSelectScreen();
			screen1.render(["move"], 800, 600, 400, 600);
			const container1 = screen1.getContainer();
			const title1 = container1.children[1] as import("pixi.js").Text;
			const card1 = container1.children[2] as Container;

			const screen2 = new RewardSelectScreen();
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
			const screen = new RewardSelectScreen();
			const callback = vi.fn();
			screen.setOnCardSelect(callback);
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			// children[2]がカードコンテナ（クリック可能）
			const cardContainer = container.children[2];
			cardContainer.emit("pointerdown", { button: 0 } as FederatedPointerEvent);

			// 獲得ボタンを探す
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn).toBeDefined();
			expect(acquireBtn?.eventMode).toBe("static");
			acquireBtn?.emit("pointerdown", { button: 0 } as FederatedPointerEvent);

			expect(callback).toHaveBeenCalledWith(0);
		});

		it("未選択時に獲得ボタンが無効状態", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn).toBeDefined();
			expect(acquireBtn?.eventMode).toBe("none");
		});

		it("カード選択後に獲得ボタンが有効状態になる", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const acquireBtn = findByLabel(container, "acquireBtn");
			expect(acquireBtn?.eventMode).toBe("none");

			// カードをクリック
			container.children[2].emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);
			expect(acquireBtn?.eventMode).toBe("static");
		});
	});

	describe("ハイライト", () => {
		it("カードクリックでハイライトが付与される", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const card0 = container.children[2] as Container;

			card0.emit("pointerdown", { button: 0 } as FederatedPointerEvent);

			const highlight = card0.children.find((c) => c.label === "highlight");
			expect(highlight).toBeDefined();
		});

		it("別カードクリックで前回ハイライトが解除される", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			const card0 = container.children[2] as Container;
			const card1 = container.children[3] as Container;

			// 1枚目を選択
			card0.emit("pointerdown", { button: 0 } as FederatedPointerEvent);
			expect(card0.children.find((c) => c.label === "highlight")).toBeDefined();

			// 2枚目を選択
			card1.emit("pointerdown", { button: 0 } as FederatedPointerEvent);
			expect(
				card0.children.find((c) => c.label === "highlight"),
			).toBeUndefined();
			expect(card1.children.find((c) => c.label === "highlight")).toBeDefined();
		});
	});

	describe("setOnSkip", () => {
		it("スキップボタンクリックでコールバックが呼ばれる", () => {
			const screen = new RewardSelectScreen();
			const callback = vi.fn();
			screen.setOnSkip(callback);
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const skipBtn = findByLabel(container, "skipBtn");
			expect(skipBtn).toBeDefined();
			skipBtn?.emit("pointerdown", { button: 0 } as FederatedPointerEvent);

			expect(callback).toHaveBeenCalled();
		});
	});

	describe("setParticleSystem", () => {
		it("パーティクルシステムを設定できる", () => {
			const screen = new RewardSelectScreen();
			const mockParticle = {
				emit: vi.fn().mockResolvedValue(undefined),
			} as unknown as ParticleSystem;
			// エラーなく設定できること
			screen.setParticleSystem(mockParticle);
		});
	});

	describe("animateCardAcquire", () => {
		it("存在しないインデックスでもエラーにならない", async () => {
			const screen = new RewardSelectScreen();
			// renderなしで呼んでもエラーにならない
			await expect(
				screen.animateCardAcquire(999, "move"),
			).resolves.toBeUndefined();
		});

		it("render後にemitがカード種別に応じた引数で呼ばれる", async () => {
			const screen = new RewardSelectScreen();
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
					count: 20,
					color: [0x44ccff, 0x2288cc],
					speed: { min: 0.02, max: 0.08 },
					life: { min: 300, max: 500 },
					size: { min: 1, max: 3 },
				}),
			);
		});
	});

	describe("ツールチップ", () => {
		function getAllTextsRecursive(container: Container): Text[] {
			const texts: Text[] = [];
			for (const child of container.children) {
				if (
					"text" in child &&
					typeof (child as { text: unknown }).text === "string"
				) {
					texts.push(child as unknown as Text);
				}
				if ("children" in child) {
					texts.push(...getAllTextsRecursive(child as Container));
				}
			}
			return texts;
		}

		function findTooltipContainer(
			screen: RewardSelectScreen,
		): Container | null {
			return findByLabel(screen.getContainer(), "tooltip");
		}

		it("報酬カードのpointeroverでツールチップが表示される", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move", "attack"], 600, 400);

			const container = screen.getContainer();
			// children[2]がカードコンテナ
			const card = container.children[2] as Container;
			card.emit("pointerover", {} as FederatedPointerEvent);

			const tooltipContainer = findTooltipContainer(screen);
			expect(tooltipContainer).toBeDefined();
			expect(tooltipContainer?.children.length).toBeGreaterThan(0);

			const texts = getAllTextsRecursive(tooltipContainer as Container);
			const hasName = texts.some((t) => t.text.includes(CARD_TYPE_NAME.move));
			expect(hasName).toBe(true);
		});

		it("報酬カードのpointeroutでツールチップが消える", () => {
			const screen = new RewardSelectScreen();
			screen.render(["move"], 600, 400);

			const container = screen.getContainer();
			const card = container.children[2] as Container;
			card.emit("pointerover", {} as FederatedPointerEvent);

			const tooltipContainer = findTooltipContainer(screen);
			expect(tooltipContainer?.children.length).toBeGreaterThan(0);

			card.emit("pointerout", {} as FederatedPointerEvent);
			expect(tooltipContainer?.children.length).toBe(0);
		});
	});
});
