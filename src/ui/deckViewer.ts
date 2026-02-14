/**
 * デッキ閲覧UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { getEffectiveCardCost } from "../game/debugCheats";
import { getAllCards, getTotalDeckSize } from "../game/deck";
import type { Card, DeckState } from "../types";
import {
	CARD_COLORS,
	CARD_EFFECT_TEXT,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
} from "./cardConstants";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import { CARD_HEIGHT, CARD_WIDTH } from "./handRenderer";
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
const CARD_GAP = 8;
const CARD_RADIUS = 8;

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
		const gridHeight = gridRows * CARD_HEIGHT + (gridRows - 1) * CARD_GAP;

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
	}

	/**
	 * 静的カードビューを生成（インタラクションなし）
	 */
	private createStaticCardView(card: Card, x: number, y: number): Container {
		const cardContainer = new Container();
		cardContainer.x = x;
		cardContainer.y = y;

		// 背景
		const bg = new Graphics();
		const colors = CARD_COLORS[card.type];
		drawRoundedRect(bg, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, colors.bg, {
			color: colors.border,
			width: 2,
		});
		cardContainer.addChild(bg);

		// シンボル
		const symbolText = new Text({
			text: CARD_TYPE_SYMBOL[card.type],
			style: {
				fontSize: 18,
				fontFamily: "sans-serif",
				fill: 0xffffff,
			},
		});
		symbolText.anchor.set(0.5, 0);
		symbolText.x = CARD_WIDTH / 2;
		symbolText.y = 12;
		cardContainer.addChild(symbolText);

		// カード名
		const nameText = new Text({
			text: CARD_TYPE_NAME[card.type],
			style: {
				fontSize: 16,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		nameText.anchor.set(0.5, 0);
		nameText.x = CARD_WIDTH / 2;
		nameText.y = 34;
		cardContainer.addChild(nameText);

		// APコスト
		const cost = getEffectiveCardCost(card.type);
		const costFill = cost >= 2 ? 0xffaa44 : cost === 0 ? 0x666666 : 0xcccccc;
		const costText = new Text({
			text: cost > 0 ? `AP: ${cost}` : "",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: costFill,
				fontWeight: cost >= 2 ? "bold" : "normal",
			},
		});
		costText.anchor.set(0.5, 0);
		costText.x = CARD_WIDTH / 2;
		costText.y = 56;
		cardContainer.addChild(costText);

		// 効果テキスト
		const effectText = new Text({
			text: CARD_EFFECT_TEXT[card.type],
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: 0xaaaaaa,
			},
		});
		effectText.anchor.set(0.5, 0);
		effectText.x = CARD_WIDTH / 2;
		effectText.y = 74;
		cardContainer.addChild(effectText);

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
}
