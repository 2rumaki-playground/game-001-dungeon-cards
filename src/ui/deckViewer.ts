/**
 * デッキ閲覧UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { getEffectiveCardCost } from "../game/debugCheats";
import { getAllCards, getTotalDeckSize } from "../game/deck";
import type { Card, CardType, DeckState } from "../types";
import {
	createCardTooltip,
	TOOLTIP_MARGIN,
	TOOLTIP_WIDTH,
} from "./cardTooltip";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import { createGridCardView } from "./gridCardView";
import { CARD_GAP, CARD_HEIGHT, CARD_WIDTH } from "./handRenderer";
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

/** グリッドレイアウト定数 */
const GRID_COLUMNS = 3;

/**
 * デッキ閲覧UIレンダラー
 */
export class DeckViewer {
	private container: Container;
	private buttonContainer: Container;
	private tooltipContainer: Container;
	private onClose: (() => void) | null = null;
	private onOpen: (() => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
		this.tooltipContainer = new Container();
		this.tooltipContainer.label = "tooltip";
		this.tooltipContainer.eventMode = "none";
		this.tooltipContainer.interactiveChildren = false;

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

		const allCards = getAllCards(deck);
		const totalCards = getTotalDeckSize(deck);

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// コンテンツ配置用のエリアサイズ（指定がなければ画面全体を使う）
		const areaW = gameArea?.width ?? screenWidth;
		const areaH = gameArea?.height ?? screenHeight;

		// グリッドサイズ計算
		const gridRows = Math.ceil(allCards.length / GRID_COLUMNS);
		const gridWidth = GRID_COLUMNS * CARD_WIDTH + (GRID_COLUMNS - 1) * CARD_GAP;
		const gridHeight =
			gridRows > 0 ? gridRows * CARD_HEIGHT + (gridRows - 1) * CARD_GAP : 0;

		// コンテンツ全体の高さを計算して上下センタリング
		const titleFontSize = 24;
		const titleToGridGap = 12;
		const gridToCloseGap = 10;
		const contentHeight =
			titleFontSize +
			titleToGridGap +
			gridHeight +
			gridToCloseGap +
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

		// カードグリッド
		const gridX = (areaW - gridWidth) / 2;
		const gridStartY = contentStartY + titleFontSize + titleToGridGap;

		for (let i = 0; i < allCards.length; i++) {
			const col = i % GRID_COLUMNS;
			const row = Math.floor(i / GRID_COLUMNS);
			const x = gridX + col * (CARD_WIDTH + CARD_GAP);
			const y = gridStartY + row * (CARD_HEIGHT + CARD_GAP);
			const cardView = this.createStaticCardView(allCards[i], x, y);
			this.container.addChild(cardView);
		}

		// 閉じるボタン
		const closeY = gridStartY + gridHeight + gridToCloseGap;
		const closeButton = this.createCloseButton(areaW / 2, closeY);
		this.container.addChild(closeButton);

		// ツールチップコンテナ（Z-order最前面）
		this.tooltipContainer.removeChildren();
		this.container.addChild(this.tooltipContainer);
	}

	/**
	 * 静的カードビューを生成（ツールチップ付き）
	 */
	private createStaticCardView(card: Card, x: number, y: number): Container {
		const cardContainer = createGridCardView(card.type);
		cardContainer.x = x;
		cardContainer.y = y;

		// ツールチップ表示用のインタラクション
		cardContainer.eventMode = "static";
		cardContainer.on("pointerover", () => {
			this.showCardTooltip(card.type, x, y);
		});
		cardContainer.on("pointerout", () => {
			this.hideCardTooltip();
		});

		return cardContainer;
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

	/**
	 * ツールチップをカード上部中央に表示
	 */
	private showCardTooltip(
		cardType: CardType,
		cardX: number,
		cardY: number,
	): void {
		this.tooltipContainer.removeChildren();
		const cost = getEffectiveCardCost(cardType);
		const { container: tooltip, height: tooltipHeight } = createCardTooltip(
			cardType,
			cost,
		);
		tooltip.x = cardX + CARD_WIDTH / 2 - TOOLTIP_WIDTH / 2;
		tooltip.y = cardY - tooltipHeight - TOOLTIP_MARGIN;
		this.tooltipContainer.addChild(tooltip);
	}

	/**
	 * ツールチップを非表示
	 */
	private hideCardTooltip(): void {
		this.tooltipContainer.removeChildren();
	}
}
