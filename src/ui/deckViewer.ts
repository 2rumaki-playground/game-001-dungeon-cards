/**
 * デッキ閲覧UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { getAllCards, getTotalDeckSize } from "../game/deck";
import type { CardType, DeckState } from "../types";
import {
	CARD_ROW_GAP,
	CARD_ROW_HEIGHT,
	CARD_ROW_LIST_WIDTH,
	createCardListRow,
} from "./cardRowRenderer";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import { BUTTON_HEIGHT, DECK_BUTTON_WIDTH } from "./layout";
import { UI_COLOR_GOLD, UI_COLORS_BUTTON_SECONDARY } from "./uiColors";

/** 閉じるボタンサイズ */
const CLOSE_BUTTON_WIDTH = 100;
export const CLOSE_BUTTON_HEIGHT = 32;
const CLOSE_BUTTON_RADIUS = 6;

/** デッキ閲覧ボタンサイズ */
const DECK_BUTTON_RADIUS = 6;

/** ボタン色定義 */
const DECK_BUTTON_COLORS = {
	bg: 0x3a5a3a,
	border: 0x5a8a5a,
	text: 0xffffff,
} as const;

/** 表示順（CardType定義順） */
const CARD_TYPE_ORDER: CardType[] = [
	"move",
	"attack",
	"strong_attack",
	"jump",
	"wait",
];

/**
 * デッキ閲覧UIレンダラー
 */
export class DeckViewer {
	private container: Container;
	private buttonContainer: Container;
	private onClose: (() => void) | null = null;
	private onOpen: (() => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;

		this.buttonContainer = new Container();
		this.buttonContainer.visible = false;
		this.createButton();
	}

	/**
	 * オーバーレイのルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * ボタンのコンテナを取得
	 */
	getButtonContainer(): Container {
		return this.buttonContainer;
	}

	/**
	 * 閉じるコールバックを設定
	 */
	setOnClose(callback: () => void): void {
		this.onClose = callback;
	}

	/**
	 * 開くコールバックを設定
	 */
	setOnOpen(callback: () => void): void {
		this.onOpen = callback;
	}

	/**
	 * オーバーレイを表示
	 */
	show(): void {
		this.container.visible = true;
	}

	/**
	 * オーバーレイを非表示
	 */
	hide(): void {
		this.container.visible = false;
	}

	/**
	 * ボタンを表示
	 */
	showButton(): void {
		this.buttonContainer.visible = true;
	}

	/**
	 * ボタンを非表示
	 */
	hideButton(): void {
		this.buttonContainer.visible = false;
	}

	/**
	 * デッキ情報をオーバーレイに描画
	 * @param gameArea ゲームエリアのサイズ（ログエリアを除いた領域）。省略時は画面全体を使う
	 */
	render(
		deck: DeckState,
		screenWidth: number,
		screenHeight: number,
		gameArea?: { width: number; height: number },
	): void {
		this.container.removeChildren();

		const cardCounts = this.countCardsByType(deck);
		const totalCards = getTotalDeckSize(deck);

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// コンテンツ配置用のエリアサイズ（指定がなければ画面全体を使う）
		const areaW = gameArea?.width ?? screenWidth;
		const areaH = gameArea?.height ?? screenHeight;

		const types = CARD_TYPE_ORDER.filter((t) => (cardCounts.get(t) ?? 0) > 0);

		// コンテンツ全体の高さを計算して上下センタリング
		const titleFontSize = 24;
		const titleToListGap = 12;
		const listHeight = types.length * (CARD_ROW_HEIGHT + CARD_ROW_GAP);
		const listToCloseGap = 10;
		const contentHeight =
			titleFontSize +
			titleToListGap +
			listHeight +
			listToCloseGap +
			CLOSE_BUTTON_HEIGHT;
		const contentStartY = (areaH - contentHeight) / 2;

		// タイトル
		const title = new Text({
			text: `デッキ一覧 (${totalCards}枚)`,
			style: {
				fontSize: titleFontSize,
				fontFamily: "sans-serif",
				fill: UI_COLOR_GOLD,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		title.x = areaW / 2;
		title.y = contentStartY + titleFontSize / 2;
		this.container.addChild(title);

		// カード種別リスト
		const listX = (areaW - CARD_ROW_LIST_WIDTH) / 2;
		const listStartY = contentStartY + titleFontSize + titleToListGap;

		for (let i = 0; i < types.length; i++) {
			const cardType = types[i];
			const count = cardCounts.get(cardType) ?? 0;
			const y = listStartY + i * (CARD_ROW_HEIGHT + CARD_ROW_GAP);
			const row = createCardListRow({ cardType, count });
			row.label = "card-row";
			row.x = listX;
			row.y = y;
			this.container.addChild(row);
		}

		// 閉じるボタン
		const closeY = listStartY + listHeight + listToCloseGap;
		const closeButton = this.createCloseButton(areaW / 2, closeY);
		this.container.addChild(closeButton);
	}

	/**
	 * デッキ内の全カードを種別ごとに集計
	 */
	private countCardsByType(deck: DeckState): Map<CardType, number> {
		const counts = new Map<CardType, number>();
		const allCards = getAllCards(deck);
		for (const card of allCards) {
			counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
		}
		return counts;
	}

	/**
	 * 閉じるボタンを生成
	 */
	private createCloseButton(centerX: number, y: number): Container {
		const button = new Container();
		button.x = centerX - CLOSE_BUTTON_WIDTH / 2;
		button.y = y;

		const bg = new Graphics();
		drawRoundedRect(
			bg,
			CLOSE_BUTTON_WIDTH,
			CLOSE_BUTTON_HEIGHT,
			CLOSE_BUTTON_RADIUS,
			UI_COLORS_BUTTON_SECONDARY.bg,
			{ color: UI_COLORS_BUTTON_SECONDARY.border, width: 1 },
		);
		button.addChild(bg);

		const text = new Text({
			text: "閉じる",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = CLOSE_BUTTON_WIDTH / 2;
		text.y = CLOSE_BUTTON_HEIGHT / 2;
		button.addChild(text);

		makeInteractive(button, () => {
			this.onClose?.();
		});

		return button;
	}

	/**
	 * デッキ閲覧ボタンを生成
	 */
	private createButton(): void {
		const button = new Container();

		const bg = new Graphics();
		drawRoundedRect(
			bg,
			DECK_BUTTON_WIDTH,
			BUTTON_HEIGHT,
			DECK_BUTTON_RADIUS,
			DECK_BUTTON_COLORS.bg,
			{ color: DECK_BUTTON_COLORS.border, width: 2 },
		);
		button.addChild(bg);

		const text = new Text({
			text: "デッキ",
			style: {
				fontSize: 14,
				fontFamily: "sans-serif",
				fill: DECK_BUTTON_COLORS.text,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = DECK_BUTTON_WIDTH / 2;
		text.y = BUTTON_HEIGHT / 2;
		button.addChild(text);

		makeInteractive(button, () => {
			this.onOpen?.();
		});

		this.buttonContainer.addChild(button);
	}
}
