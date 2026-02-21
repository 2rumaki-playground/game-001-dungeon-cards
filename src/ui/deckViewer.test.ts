import type { Container, FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import type { DeckState } from "../types";
import { CARD_DESCRIPTION, CARD_TYPE_NAME } from "./cardConstants";
import { CLOSE_BUTTON_HEIGHT, DeckViewer } from "./deckViewer";
import { CARD_GAP, CARD_HEIGHT, CARD_WIDTH } from "./handRenderer";

/** テスト用デッキ */
function createTestDeck(): DeckState {
	return {
		hand: [
			{ id: "m1", type: "move", keyword: "flame" },
			{ id: "m2", type: "move", keyword: "flame" },
			{ id: "m3", type: "move", keyword: "flame" },
			{ id: "a1", type: "attack", keyword: "flame" },
			{ id: "a2", type: "attack", keyword: "flame" },
			{ id: "sa1", type: "strong_attack", keyword: "flame" },
			{ id: "r1", type: "jump", keyword: "flame" },
			{ id: "w1", type: "wait", keyword: "flame" },
		],
		usedCardIds: [],
	};
}

describe("DeckViewer", () => {
	describe("コンストラクタ", () => {
		it("コンテナが作成される", () => {
			const viewer = new DeckViewer();
			expect(viewer.getContainer()).toBeDefined();
		});

		it("初期状態でオーバーレイが非表示", () => {
			const viewer = new DeckViewer();
			expect(viewer.getContainer().visible).toBe(false);
		});

		it("初期状態でボタンが非表示", () => {
			const viewer = new DeckViewer();
			expect(viewer.getButtonContainer().visible).toBe(false);
		});
	});

	describe("show/hide", () => {
		it("showでオーバーレイが表示される", () => {
			const viewer = new DeckViewer();
			viewer.show();
			expect(viewer.getContainer().visible).toBe(true);
		});

		it("hideでオーバーレイが非表示になる", () => {
			const viewer = new DeckViewer();
			viewer.show();
			viewer.hide();
			expect(viewer.getContainer().visible).toBe(false);
		});
	});

	describe("showButton/hideButton", () => {
		it("showButtonでボタンが表示される", () => {
			const viewer = new DeckViewer();
			viewer.showButton();
			expect(viewer.getButtonContainer().visible).toBe(true);
		});

		it("hideButtonでボタンが非表示になる", () => {
			const viewer = new DeckViewer();
			viewer.showButton();
			viewer.hideButton();
			expect(viewer.getButtonContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("デッキ情報が描画される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			// 子要素が生成されている
			expect(container.children.length).toBeGreaterThan(0);
		});

		it("総枚数テキストが表示される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			// children[0]=overlay, children[1]=title(Text)
			const title = container.children[1] as import("pixi.js").Text;
			expect(title.text).toBe("デッキ一覧 (8枚)");
		});

		it("全カードが個別に表示される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			// overlay(1) + title(1) + 8カード + 閉じるボタン(1) + tooltipContainer(1) = 12
			expect(container.children.length).toBe(12);
		});

		it("オーバーレイはscreenWidthで全画面を覆う", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			const screenWidth = 800;
			const screenHeight = 600;
			viewer.render(deck, screenWidth, screenHeight, {
				width: 480,
				height: 500,
			});

			const container = viewer.getContainer();
			const overlay = container.children[0] as Graphics;
			// overlayのboundsがscreenWidthで描画されていること
			expect(overlay.width).toBeGreaterThanOrEqual(screenWidth);
		});

		it("タイトルがgameAreaWidthの中央に配置される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			const screenWidth = 800;
			const gameAreaWidth = 480;
			viewer.render(deck, screenWidth, 600, {
				width: gameAreaWidth,
				height: 500,
			});

			const container = viewer.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			expect(title.x).toBe(gameAreaWidth / 2);
		});

		it("カードグリッドがgameAreaWidthの中央に配置される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			const screenWidth = 800;
			const gameAreaWidth = 480;
			viewer.render(deck, screenWidth, 600, {
				width: gameAreaWidth,
				height: 500,
			});

			const container = viewer.getContainer();
			// children[2]が最初のカード（overlay=0, title=1）
			const firstCard = container.children[2];
			const gridWidth = 4 * CARD_WIDTH + 3 * CARD_GAP;
			const expectedGridX = (gameAreaWidth - gridWidth) / 2;
			expect(firstCard.x).toBe(expectedGridX);
		});

		it("コンテンツがgameAreaHeightの中央に配置される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			const screenWidth = 800;
			const gameAreaHeight = 500;
			viewer.render(deck, screenWidth, 600, {
				width: 480,
				height: gameAreaHeight,
			});

			const container = viewer.getContainer();
			const title = container.children[1] as import("pixi.js").Text;

			// グリッドベースでコンテンツ高さを計算
			const titleFontSize = 24;
			const titleToGridGap = 12;
			const allCards = deck.hand;
			const gridRows = Math.ceil(allCards.length / 4);
			const gridHeight = gridRows * CARD_HEIGHT + (gridRows - 1) * CARD_GAP;
			const gridToCloseGap = 10;
			const contentHeight =
				titleFontSize +
				titleToGridGap +
				gridHeight +
				gridToCloseGap +
				CLOSE_BUTTON_HEIGHT;
			const expectedStartY = (gameAreaHeight - contentHeight) / 2;

			expect(title.y).toBe(expectedStartY + titleFontSize / 2);
		});

		it("gameAreaを指定しない場合はscreenWidthでセンタリング", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			expect(title.x).toBe(600 / 2);
		});

		it("空デッキでも描画できる", () => {
			const viewer = new DeckViewer();
			const emptyDeck: DeckState = {
				hand: [],
				usedCardIds: [],
			};
			viewer.render(emptyDeck, 600, 400);

			const container = viewer.getContainer();
			const title = container.children[1] as import("pixi.js").Text;
			expect(title.text).toBe("デッキ一覧 (0枚)");
		});
	});

	describe("閉じるボタン", () => {
		it("クリックでonCloseコールバックが呼ばれる", () => {
			const viewer = new DeckViewer();
			const callback = vi.fn();
			viewer.setOnClose(callback);
			viewer.render(createTestDeck(), 600, 400);

			const container = viewer.getContainer();
			// tooltipContainerが最後なので、閉じるボタンはその1つ前
			const closeBtn = container.children[container.children.length - 2];
			expect(closeBtn.eventMode).toBe("static");
			closeBtn.emit("pointerdown", {
				button: 0,
			} as import("pixi.js").FederatedPointerEvent);

			expect(callback).toHaveBeenCalled();
		});
	});

	describe("デッキ閲覧ボタン", () => {
		it("ボタンコンテナが存在する", () => {
			const viewer = new DeckViewer();
			expect(viewer.getButtonContainer()).toBeDefined();
			expect(viewer.getButtonContainer().children.length).toBeGreaterThan(0);
		});

		it("クリックでonOpenコールバックが呼ばれる", () => {
			const viewer = new DeckViewer();
			const callback = vi.fn();
			viewer.setOnOpen(callback);

			// ボタンコンテナ内のinteractive要素を探す
			const btnContainer = viewer.getButtonContainer();
			const button = btnContainer.children[0];
			expect(button.eventMode).toBe("static");
			button.emit("pointerdown", {
				button: 0,
			} as import("pixi.js").FederatedPointerEvent);

			expect(callback).toHaveBeenCalled();
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

		it("カードのpointeroverでツールチップが表示される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			// children[2]が最初のカード（overlay=0, title=1）
			const card = container.children[2] as Container;
			card.emit("pointerover", {} as FederatedPointerEvent);

			const tooltipContainer = findByLabel(container, "tooltip");
			expect(tooltipContainer).toBeDefined();
			expect(tooltipContainer?.children.length).toBeGreaterThan(0);

			const texts = getAllTextsRecursive(tooltipContainer as Container);
			const hasName = texts.some((t) => t.text.includes(CARD_TYPE_NAME.move));
			expect(hasName).toBe(true);
		});

		it("カードのpointeroutでツールチップが消える", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			const card = container.children[2] as Container;
			card.emit("pointerover", {} as FederatedPointerEvent);

			const tooltipContainer = findByLabel(container, "tooltip");
			expect(tooltipContainer?.children.length).toBeGreaterThan(0);

			card.emit("pointerout", {} as FederatedPointerEvent);
			expect(tooltipContainer?.children.length).toBe(0);
		});

		it("ツールチップにCARD_DESCRIPTIONが含まれる", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			const card = container.children[2] as Container;
			card.emit("pointerover", {} as FederatedPointerEvent);

			const tooltipContainer = findByLabel(container, "tooltip");
			const texts = getAllTextsRecursive(tooltipContainer as Container);
			const hasDesc = texts.some((t) => t.text.includes(CARD_DESCRIPTION.move));
			expect(hasDesc).toBe(true);
		});
	});
});
