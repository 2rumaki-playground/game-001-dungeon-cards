import type { Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import type { Card, DeckState } from "../types";
import {
	CARD_ROW_GAP,
	CARD_ROW_HEIGHT,
	CARD_ROW_LIST_WIDTH,
} from "./cardRowRenderer";
import { CLOSE_BUTTON_HEIGHT, DeckViewer } from "./deckViewer";

/** テスト用デッキ */
function createTestDeck(): DeckState {
	const cards: Card[] = [
		{ id: "m1", type: "move" },
		{ id: "m2", type: "move" },
		{ id: "m3", type: "move" },
		{ id: "a1", type: "attack" },
		{ id: "a2", type: "attack" },
		{ id: "sa1", type: "strong_attack" },
		{ id: "r1", type: "jump" },
		{ id: "w1", type: "wait" },
	];
	return {
		drawPile: cards.slice(0, 4),
		hand: cards.slice(4, 6),
		discardPile: cards.slice(6),
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

		it("各カード種別の枚数が表示される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			viewer.render(deck, 600, 400);

			const container = viewer.getContainer();
			// overlay + title + 5種別の行 + 閉じるボタン
			// ただしデッキに含まれる種別のみ表示
			// テストデッキ: move x3, attack x2, strong_attack x1, jump x1, wait x1 = 5種別
			// overlay(1) + title(1) + 5行 + 閉じるボタン(1) = 8
			expect(container.children.length).toBe(8);
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

		it("カードリストがgameAreaWidthの中央に配置される", () => {
			const viewer = new DeckViewer();
			const deck = createTestDeck();
			const screenWidth = 800;
			const gameAreaWidth = 480;
			viewer.render(deck, screenWidth, 600, {
				width: gameAreaWidth,
				height: 500,
			});

			const container = viewer.getContainer();
			// カード行をlabelで特定
			const firstRow = container.children.find(
				(child) => child.label === "card-row",
			);
			expect(firstRow).toBeDefined();
			const expectedListX = (gameAreaWidth - CARD_ROW_LIST_WIDTH) / 2;
			expect(firstRow!.x).toBe(expectedListX);
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

			// コンテンツ全体の高さを計算
			const titleFontSize = 24;
			const titleToListGap = 12;
			const allCards = [...deck.drawPile, ...deck.hand, ...deck.discardPile];
			const typesCount = new Set(allCards.map((card) => card.type)).size;
			const listHeight =
				typesCount === 0
					? 0
					: typesCount * CARD_ROW_HEIGHT + (typesCount - 1) * CARD_ROW_GAP;
			const listToCloseGap = 10;
			const contentHeight =
				titleFontSize +
				titleToListGap +
				listHeight +
				listToCloseGap +
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
				drawPile: [],
				hand: [],
				discardPile: [],
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
			// 最後の子要素が閉じるボタン
			const closeBtn = container.children[container.children.length - 1];
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
});
