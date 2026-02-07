/**
 * 報酬画面UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST, CARD_RARITY } from "../constants";
import type { Card, CardType, Rarity } from "../types";
import {
	CARD_COLORS,
	CARD_EFFECT_TEXT,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	RARITY_COLORS,
} from "./cardConstants";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";

/** カードサイズ */
const REWARD_CARD_WIDTH = 120;
const REWARD_CARD_HEIGHT = 190;
const REWARD_CARD_RADIUS = 8;
const REWARD_CARD_GAP = 20;

/** ボタンサイズ */
const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 32;
const BUTTON_RADIUS = 6;

/** レアリティ日本語名 */
const RARITY_NAME: Record<Rarity, string> = {
	common: "コモン",
	uncommon: "アンコモン",
	rare: "レア",
};

/** 除去モードのカード一覧設定 */
const REMOVE_CARD_HEIGHT = 28;
const REMOVE_CARD_GAP = 4;
const REMOVE_LIST_MAX_HEIGHT = 300;

/**
 * 報酬画面レンダラー
 */
export class RewardScreen {
	private container: Container;
	private onCardSelect: ((index: number) => void) | null = null;
	private onSkip: ((index: number) => void) | null = null;
	private onRemoveCard: ((cardId: string) => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	getContainer(): Container {
		return this.container;
	}

	setOnCardSelect(callback: (index: number) => void): void {
		this.onCardSelect = callback;
	}

	setOnSkip(callback: (index: number) => void): void {
		this.onSkip = callback;
	}

	setOnRemoveCard(callback: (cardId: string) => void): void {
		this.onRemoveCard = callback;
	}

	/**
	 * 報酬選択画面を描画
	 */
	render(choices: CardType[], screenWidth: number, screenHeight: number): void {
		this.container.removeChildren();

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		overlay.rect(0, 0, screenWidth, screenHeight);
		overlay.fill({ color: 0x000000, alpha: 0.7 });
		overlay.eventMode = "static";
		this.container.addChild(overlay);

		// タイトル
		const title = new Text({
			text: "カード報酬",
			style: {
				fontSize: 28,
				fontFamily: "sans-serif",
				fill: 0xffd700,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		title.x = screenWidth / 2;
		title.y = 40;
		this.container.addChild(title);

		// カードを横並びで表示
		const totalWidth =
			choices.length * REWARD_CARD_WIDTH +
			(choices.length - 1) * REWARD_CARD_GAP;
		const startX = (screenWidth - totalWidth) / 2;
		const cardY = 80;

		for (let i = 0; i < choices.length; i++) {
			const cardX = startX + i * (REWARD_CARD_WIDTH + REWARD_CARD_GAP);
			const cardContainer = this.createRewardCard(choices[i], cardX, cardY, i);
			this.container.addChild(cardContainer);
		}
	}

	/**
	 * 除去選択画面のデッキ一覧を描画
	 */
	renderRemoveSelection(
		deckCards: Card[],
		screenWidth: number,
		screenHeight: number,
		titleText = "除去するカードを選択",
	): void {
		this.container.removeChildren();

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		overlay.rect(0, 0, screenWidth, screenHeight);
		overlay.fill({ color: 0x000000, alpha: 0.7 });
		overlay.eventMode = "static";
		this.container.addChild(overlay);

		// タイトル
		const title = new Text({
			text: titleText,
			style: {
				fontSize: 24,
				fontFamily: "sans-serif",
				fill: 0xff6644,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		title.x = screenWidth / 2;
		title.y = 30;
		this.container.addChild(title);

		// スクロール可能なカード一覧
		const listStartY = 60;
		const listWidth = 240;
		const listX = (screenWidth - listWidth) / 2;
		const totalListHeight =
			deckCards.length === 0
				? 0
				: deckCards.length * REMOVE_CARD_HEIGHT +
					(deckCards.length - 1) * REMOVE_CARD_GAP;

		// スクロールコンテナ
		const scrollContainer = new Container();
		for (let i = 0; i < deckCards.length; i++) {
			const card = deckCards[i];
			const y = i * (REMOVE_CARD_HEIGHT + REMOVE_CARD_GAP);
			const item = this.createRemoveCardItem(card, 0, y, listWidth);
			scrollContainer.addChild(item);
		}
		scrollContainer.x = listX;
		scrollContainer.y = listStartY;

		// リスト表示領域をマスクで制限
		// PixiJS v8ではマスクをディスプレイリストに追加せず参照のみ保持する
		const visibleHeight = Math.min(REMOVE_LIST_MAX_HEIGHT, totalListHeight);
		const maskGraphics = new Graphics();
		maskGraphics.rect(listX, listStartY, listWidth, visibleHeight);
		maskGraphics.fill(0xffffff);
		scrollContainer.mask = maskGraphics;
		this.container.addChild(scrollContainer);

		// ドラッグスクロール（scrollContainer自体にイベントを持たせる）
		if (totalListHeight > REMOVE_LIST_MAX_HEIGHT) {
			scrollContainer.eventMode = "static";
			scrollContainer.cursor = "grab";
			scrollContainer.interactiveChildren = true;

			let isDragging = false;
			let lastY = 0;
			const minScrollY = listStartY - (totalListHeight - visibleHeight);
			const maxScrollY = listStartY;

			scrollContainer.on("pointerdown", (e) => {
				isDragging = true;
				lastY = e.globalY;
				scrollContainer.cursor = "grabbing";
			});
			scrollContainer.on("pointermove", (e) => {
				if (!isDragging) return;
				const dy = e.globalY - lastY;
				lastY = e.globalY;
				scrollContainer.y = Math.max(
					minScrollY,
					Math.min(maxScrollY, scrollContainer.y + dy),
				);
			});
			scrollContainer.on("pointerup", () => {
				isDragging = false;
				scrollContainer.cursor = "grab";
			});
			scrollContainer.on("pointerupoutside", () => {
				isDragging = false;
				scrollContainer.cursor = "grab";
			});
		}

		// キャンセルボタン
		const cancelY = listStartY + visibleHeight + 10;
		const cancelButton = this.createButton(
			"スキップ",
			screenWidth / 2 - BUTTON_WIDTH / 2,
			cancelY,
			0x555555,
			0x777777,
			() => {
				// キャンセル = スキップ扱い
				this.onSkip?.(0);
			},
		);
		this.container.addChild(cancelButton);
	}

	/**
	 * 報酬カードを1枚生成
	 */
	private createRewardCard(
		cardType: CardType,
		x: number,
		y: number,
		index: number,
	): Container {
		const cardContainer = new Container();
		cardContainer.x = x;
		cardContainer.y = y;

		const colors = CARD_COLORS[cardType];
		const rarity = CARD_RARITY[cardType];
		const rarityColor = RARITY_COLORS[rarity];

		// 背景
		const bg = new Graphics();
		drawRoundedRect(
			bg,
			REWARD_CARD_WIDTH,
			REWARD_CARD_HEIGHT,
			REWARD_CARD_RADIUS,
			colors.bg,
			{ color: colors.border, width: 2 },
		);
		cardContainer.addChild(bg);

		// レアリティバー
		const rarityBar = new Graphics();
		rarityBar.roundRect(10, 6, REWARD_CARD_WIDTH - 20, 3, 1);
		rarityBar.fill(rarityColor);
		cardContainer.addChild(rarityBar);

		// シンボル
		const symbol = new Text({
			text: CARD_TYPE_SYMBOL[cardType],
			style: {
				fontSize: 22,
				fontFamily: "sans-serif",
				fill: 0xffffff,
			},
		});
		symbol.anchor.set(0.5, 0);
		symbol.x = REWARD_CARD_WIDTH / 2;
		symbol.y = 16;
		cardContainer.addChild(symbol);

		// カード名
		const name = new Text({
			text: CARD_TYPE_NAME[cardType],
			style: {
				fontSize: 16,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		name.anchor.set(0.5, 0);
		name.x = REWARD_CARD_WIDTH / 2;
		name.y = 42;
		cardContainer.addChild(name);

		// レアリティ
		const rarityText = new Text({
			text: RARITY_NAME[rarity],
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: rarityColor,
			},
		});
		rarityText.anchor.set(0.5, 0);
		rarityText.x = REWARD_CARD_WIDTH / 2;
		rarityText.y = 62;
		cardContainer.addChild(rarityText);

		// APコスト
		const cost = CARD_COST[cardType];
		const costText = new Text({
			text: cost > 0 ? `AP: ${cost}` : "",
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: 0xcccccc,
			},
		});
		costText.anchor.set(0.5, 0);
		costText.x = REWARD_CARD_WIDTH / 2;
		costText.y = 78;
		cardContainer.addChild(costText);

		// 効果テキスト
		const effect = new Text({
			text: CARD_EFFECT_TEXT[cardType],
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: 0xaaaaaa,
			},
		});
		effect.anchor.set(0.5, 0);
		effect.x = REWARD_CARD_WIDTH / 2;
		effect.y = 94;
		cardContainer.addChild(effect);

		// 選択ボタン
		const selectBtn = this.createButton(
			"選択",
			(REWARD_CARD_WIDTH - BUTTON_WIDTH) / 2,
			118,
			0x2a7a2a,
			0x4aaa4a,
			() => this.onCardSelect?.(index),
		);
		cardContainer.addChild(selectBtn);

		// スキップボタン
		const skipBtn = this.createButton(
			"スキップ",
			(REWARD_CARD_WIDTH - BUTTON_WIDTH) / 2,
			118 + BUTTON_HEIGHT + 4,
			0x555555,
			0x777777,
			() => this.onSkip?.(index),
		);
		cardContainer.addChild(skipBtn);

		return cardContainer;
	}

	/**
	 * 除去用カードアイテムを生成
	 */
	private createRemoveCardItem(
		card: Card,
		x: number,
		y: number,
		width: number,
	): Container {
		const item = new Container();
		item.x = x;
		item.y = y;

		// 背景
		const bg = new Graphics();
		drawRoundedRect(
			bg,
			width,
			REMOVE_CARD_HEIGHT,
			4,
			CARD_COLORS[card.type].bg,
			{ color: CARD_COLORS[card.type].border, width: 1 },
		);
		item.addChild(bg);

		// カード名
		const nameLabel = new Text({
			text: `${CARD_TYPE_SYMBOL[card.type]} ${CARD_TYPE_NAME[card.type]}`,
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: 0xffffff,
			},
		});
		nameLabel.anchor.set(0, 0.5);
		nameLabel.x = 8;
		nameLabel.y = REMOVE_CARD_HEIGHT / 2;
		item.addChild(nameLabel);

		// 除去ボタン
		const removeBtnWidth = 50;
		const removeBtnHeight = 22;
		const removeBtn = new Container();
		removeBtn.x = width - removeBtnWidth - 6;
		removeBtn.y = (REMOVE_CARD_HEIGHT - removeBtnHeight) / 2;

		const removeBg = new Graphics();
		drawRoundedRect(removeBg, removeBtnWidth, removeBtnHeight, 4, 0x882222, {
			color: 0xaa4444,
			width: 1,
		});
		removeBtn.addChild(removeBg);

		const removeBtnText = new Text({
			text: "除去",
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		removeBtnText.anchor.set(0.5);
		removeBtnText.x = removeBtnWidth / 2;
		removeBtnText.y = removeBtnHeight / 2;
		removeBtn.addChild(removeBtnText);

		makeInteractive(removeBtn, (e) => {
			e.stopPropagation?.();
			this.onRemoveCard?.(card.id);
		});
		item.addChild(removeBtn);

		return item;
	}

	/**
	 * 汎用ボタン生成
	 */
	private createButton(
		label: string,
		x: number,
		y: number,
		bgColor: number,
		borderColor: number,
		onClick: () => void,
	): Container {
		const button = new Container();
		button.x = x;
		button.y = y;

		const bg = new Graphics();
		drawRoundedRect(bg, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS, bgColor, {
			color: borderColor,
			width: 1,
		});
		button.addChild(bg);

		const text = new Text({
			text: label,
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = BUTTON_WIDTH / 2;
		text.y = BUTTON_HEIGHT / 2;
		button.addChild(text);

		makeInteractive(button, onClick);

		return button;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}
}
