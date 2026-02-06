/**
 * 報酬画面UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import {
	CARD_COST,
	CARD_RARITY,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
	RUSH_MAX_DISTANCE,
} from "../constants";
import type { Card, CardType, Rarity } from "../types";

/** カードサイズ */
const REWARD_CARD_WIDTH = 120;
const REWARD_CARD_HEIGHT = 160;
const REWARD_CARD_RADIUS = 8;
const REWARD_CARD_GAP = 20;

/** ボタンサイズ */
const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 32;
const BUTTON_RADIUS = 6;

/** レアリティ色 */
const RARITY_COLORS: Record<Rarity, number> = {
	common: 0x888888,
	uncommon: 0x44aa44,
	rare: 0xddaa22,
};

/** カード背景色 */
const REWARD_CARD_COLORS: Record<CardType, { bg: number; border: number }> = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	attack: { bg: 0x8c2a2a, border: 0xca4a4a },
	strong_attack: { bg: 0x7a3a6a, border: 0xaa5a9a },
	rush: { bg: 0x2a6a3a, border: 0x4aaa5a },
	wait: { bg: 0x4a4a4a, border: 0x6a6a6a },
};

/** カード種別シンボル */
const CARD_TYPE_SYMBOL: Record<CardType, string> = {
	move: "👟",
	attack: "⚔",
	strong_attack: "🔥",
	rush: "💨",
	wait: "⏳",
};

/** カード効果テキスト */
const CARD_EFFECT_TEXT: Record<CardType, string> = {
	move: "1マス移動",
	attack: `${PLAYER_ATTACK_DAMAGE}ダメージ`,
	strong_attack: `${PLAYER_STRONG_ATTACK_DAMAGE}ダメージ`,
	rush: `${RUSH_MAX_DISTANCE}マス移動`,
	wait: "-",
};

/** カード種別の日本語名 */
const CARD_TYPE_NAME: Record<CardType, string> = {
	move: "移動",
	attack: "攻撃",
	strong_attack: "強攻撃",
	rush: "突進",
	wait: "待機",
};

/** レアリティ日本語名 */
const RARITY_NAME: Record<Rarity, string> = {
	common: "コモン",
	uncommon: "アンコモン",
	rare: "レア",
};

/** 除去モードのカード一覧設定 */
const REMOVE_CARD_WIDTH = 80;
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
	render(
		choices: CardType[],
		selectedCards: (CardType | null)[],
		screenWidth: number,
		screenHeight: number,
	): void {
		this.container.removeChildren();

		// 半透明オーバーレイ
		const overlay = new Graphics();
		overlay.rect(0, 0, screenWidth, screenHeight);
		overlay.fill({ color: 0x000000, alpha: 0.7 });
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
			const isSelected = selectedCards[i] !== null;
			const cardX = startX + i * (REWARD_CARD_WIDTH + REWARD_CARD_GAP);
			const cardContainer = this.createRewardCard(
				choices[i],
				cardX,
				cardY,
				i,
				isSelected,
			);
			this.container.addChild(cardContainer);
		}
	}

	/**
	 * 入れ替えモードのデッキ一覧を描画
	 */
	renderRemoveSelection(
		deckCards: Card[],
		rewardCardType: CardType,
		screenWidth: number,
		screenHeight: number,
	): void {
		this.container.removeChildren();

		// 半透明オーバーレイ
		const overlay = new Graphics();
		overlay.rect(0, 0, screenWidth, screenHeight);
		overlay.fill({ color: 0x000000, alpha: 0.7 });
		this.container.addChild(overlay);

		// タイトル
		const title = new Text({
			text: "除去するカードを選択",
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

		// 獲得予定カードの表示
		const previewText = new Text({
			text: `獲得: ${CARD_TYPE_NAME[rewardCardType]}`,
			style: {
				fontSize: 16,
				fontFamily: "sans-serif",
				fill: 0xaaaaaa,
			},
		});
		previewText.anchor.set(0.5);
		previewText.x = screenWidth / 2;
		previewText.y = 60;
		this.container.addChild(previewText);

		// スクロール可能なカード一覧
		const listStartY = 90;
		const maxVisible = Math.floor(
			REMOVE_LIST_MAX_HEIGHT / (REMOVE_CARD_HEIGHT + REMOVE_CARD_GAP),
		);
		const visibleCards = deckCards.slice(0, maxVisible);
		const listWidth = 240;
		const listX = (screenWidth - listWidth) / 2;

		for (let i = 0; i < visibleCards.length; i++) {
			const card = visibleCards[i];
			const y = listStartY + i * (REMOVE_CARD_HEIGHT + REMOVE_CARD_GAP);
			const item = this.createRemoveCardItem(card, listX, y, listWidth);
			this.container.addChild(item);
		}

		// キャンセルボタン
		const cancelY =
			listStartY +
			visibleCards.length * (REMOVE_CARD_HEIGHT + REMOVE_CARD_GAP) +
			10;
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
		isSelected: boolean,
	): Container {
		const cardContainer = new Container();
		cardContainer.x = x;
		cardContainer.y = y;

		const colors = REWARD_CARD_COLORS[cardType];
		const rarity = CARD_RARITY[cardType];
		const rarityColor = RARITY_COLORS[rarity];

		// 背景
		const bg = new Graphics();
		bg.roundRect(
			0,
			0,
			REWARD_CARD_WIDTH,
			REWARD_CARD_HEIGHT,
			REWARD_CARD_RADIUS,
		);
		bg.fill(isSelected ? 0x333333 : colors.bg);
		bg.roundRect(
			0,
			0,
			REWARD_CARD_WIDTH,
			REWARD_CARD_HEIGHT,
			REWARD_CARD_RADIUS,
		);
		bg.stroke({ color: isSelected ? 0x555555 : colors.border, width: 2 });
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
				fill: isSelected ? 0x666666 : 0xffffff,
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
				fill: isSelected ? 0x666666 : 0xffffff,
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
				fill: isSelected ? 0x444444 : 0xcccccc,
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
				fill: isSelected ? 0x444444 : 0xaaaaaa,
			},
		});
		effect.anchor.set(0.5, 0);
		effect.x = REWARD_CARD_WIDTH / 2;
		effect.y = 94;
		cardContainer.addChild(effect);

		if (!isSelected) {
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
		} else {
			// 選択済みマーク
			const doneText = new Text({
				text: "✓ 選択済み",
				style: {
					fontSize: 12,
					fontFamily: "sans-serif",
					fill: 0x44aa44,
				},
			});
			doneText.anchor.set(0.5, 0);
			doneText.x = REWARD_CARD_WIDTH / 2;
			doneText.y = 130;
			cardContainer.addChild(doneText);
		}

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
		bg.roundRect(0, 0, width, REMOVE_CARD_HEIGHT, 4);
		bg.fill(REWARD_CARD_COLORS[card.type].bg);
		bg.roundRect(0, 0, width, REMOVE_CARD_HEIGHT, 4);
		bg.stroke({ color: REWARD_CARD_COLORS[card.type].border, width: 1 });
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
		removeBg.roundRect(0, 0, removeBtnWidth, removeBtnHeight, 4);
		removeBg.fill(0x882222);
		removeBg.roundRect(0, 0, removeBtnWidth, removeBtnHeight, 4);
		removeBg.stroke({ color: 0xaa4444, width: 1 });
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

		removeBtn.eventMode = "static";
		removeBtn.cursor = "pointer";
		removeBtn.on("pointerdown", () => this.onRemoveCard?.(card.id));
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
		bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
		bg.fill(bgColor);
		bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
		bg.stroke({ color: borderColor, width: 1 });
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

		button.eventMode = "static";
		button.cursor = "pointer";
		button.on("pointerdown", onClick);

		return button;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}
}
