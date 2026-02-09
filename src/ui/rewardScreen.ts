/**
 * 報酬画面UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import { CARD_COST, CARD_RARITY } from "../constants";
import type { Card, CardType, Rarity } from "../types";
import { Easing, tween } from "../utils/tween";
import {
	CARD_COLORS,
	CARD_EFFECT_TEXT,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	RARITY_COLORS,
} from "./cardConstants";
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
import type { ParticleSystem } from "./particleSystem";
import { UI_COLOR_GOLD, UI_COLORS_BUTTON_SECONDARY } from "./uiColors";

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

/** カード取得アニメーション定数 */
const ACQUIRE_SCALE_DURATION = 200;
const ACQUIRE_SHRINK_DURATION = 300;
const ACQUIRE_PARTICLE_COLORS: Record<Rarity, number[]> = {
	common: [0xaaaaaa, 0xcccccc],
	uncommon: [0x44aa44, 0x88ff88, 0x22cc22],
	rare: [0xddaa22, 0xffdd44, 0xffcc00, 0xffffff],
};
const ACQUIRE_PARTICLE_COUNT: Record<Rarity, number> = {
	common: 12,
	uncommon: 20,
	rare: 30,
};

/** カード除去アニメーション定数 */
const REMOVE_FADE_DURATION = 400;
const REMOVE_PARTICLE_COLORS = [0xff4444, 0xff6644, 0xcc2222];
const REMOVE_PARTICLE_COUNT = 15;

/** 除去モードのカード一覧設定 */
const REMOVE_LIST_MAX_HEIGHT = 300;

/**
 * 報酬画面レンダラー
 */
export class RewardScreen {
	private container: Container;
	private onCardSelect: ((index: number) => void) | null = null;
	private onSkip: ((index: number) => void) | null = null;
	private onRemoveCard: ((cardId: string) => void) | null = null;
	private particleSystem: ParticleSystem | null = null;
	private cardContainers: Container[] = [];
	private scrollContainer: Container | null = null;
	private cancelButton: Container | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	setParticleSystem(particleSystem: ParticleSystem): void {
		this.particleSystem = particleSystem;
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
	 * @param gameAreaWidth ゲームエリアの幅（ログエリアを除いた領域）
	 * @param gameAreaHeight ゲームエリアの高さ
	 */
	render(
		choices: CardType[],
		screenWidth: number,
		screenHeight: number,
		gameAreaWidth?: number,
		gameAreaHeight?: number,
	): void {
		this.container.removeChildren();
		this.cardContainers = [];
		this.scrollContainer = null;
		this.cancelButton = null;

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// コンテンツ配置用のエリアサイズ（指定がなければ画面全体を使う）
		const areaW = gameAreaWidth ?? screenWidth;
		const areaH = gameAreaHeight ?? screenHeight;

		// カードを横並びで表示
		const totalCardsWidth =
			choices.length * REWARD_CARD_WIDTH +
			(choices.length - 1) * REWARD_CARD_GAP;

		// タイトル
		const titleFontSize = 28;
		const titleToCardGap = 16;
		const contentHeight = titleFontSize + titleToCardGap + REWARD_CARD_HEIGHT;

		const contentStartY = (areaH - contentHeight) / 2;

		const title = new Text({
			text: "カード報酬",
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

		const startX = (areaW - totalCardsWidth) / 2;
		const cardY = contentStartY + titleFontSize + titleToCardGap;

		for (let i = 0; i < choices.length; i++) {
			const cardX = startX + i * (REWARD_CARD_WIDTH + REWARD_CARD_GAP);
			const cardContainer = this.createRewardCard(choices[i], cardX, cardY, i);
			this.container.addChild(cardContainer);
			this.cardContainers.push(cardContainer);
		}
	}

	/**
	 * 除去選択画面のデッキ一覧を描画
	 * @param gameAreaWidth ゲームエリアの幅（ログエリアを除いた領域）
	 * @param gameAreaHeight ゲームエリアの高さ
	 */
	renderRemoveSelection(
		deckCards: Card[],
		screenWidth: number,
		screenHeight: number,
		titleText = "除去するカードを選択",
		gameAreaWidth?: number,
		gameAreaHeight?: number,
	): void {
		this.container.removeChildren();
		this.cardContainers = [];
		this.scrollContainer = null;
		this.cancelButton = null;

		// 半透明オーバーレイ（背面UIへのポインタ入力を吸収）
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// コンテンツ配置用のエリアサイズ（指定がなければ画面全体を使う）
		const areaW = gameAreaWidth ?? screenWidth;
		const areaH = gameAreaHeight ?? screenHeight;

		// タイトル
		const titleFontSize = 24;
		const title = new Text({
			text: titleText,
			style: {
				fontSize: titleFontSize,
				fontFamily: "sans-serif",
				fill: 0xff6644,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5);
		this.container.addChild(title);

		// リストとボタンのサイズ計算
		const listX = (areaW - CARD_ROW_LIST_WIDTH) / 2;
		const totalListHeight =
			deckCards.length === 0
				? 0
				: deckCards.length * CARD_ROW_HEIGHT +
					(deckCards.length - 1) * CARD_ROW_GAP;
		const visibleHeight = Math.min(REMOVE_LIST_MAX_HEIGHT, totalListHeight);

		// コンテンツ全体の高さ（タイトル + gap + リスト + gap + ボタン）
		const titleToListGap = 12;
		const listToButtonGap = 10;
		const contentHeight =
			titleFontSize +
			titleToListGap +
			visibleHeight +
			listToButtonGap +
			BUTTON_HEIGHT;
		const contentStartY = (areaH - contentHeight) / 2;

		// タイトル位置
		title.x = areaW / 2;
		title.y = contentStartY + titleFontSize / 2;

		const listStartY = contentStartY + titleFontSize + titleToListGap;

		// スクロールコンテナ
		this.scrollContainer = new Container();
		const scrollContainer = this.scrollContainer;
		for (let i = 0; i < deckCards.length; i++) {
			const card = deckCards[i];
			const y = i * (CARD_ROW_HEIGHT + CARD_ROW_GAP);
			const item = this.createRemoveCardItem(card, 0, y, CARD_ROW_LIST_WIDTH);
			scrollContainer.addChild(item);
		}
		scrollContainer.x = listX;
		scrollContainer.y = listStartY;

		// リスト表示領域をマスクで制限
		// PixiJS v8ではマスクをディスプレイリストに追加せず参照のみ保持する
		const maskGraphics = new Graphics();
		maskGraphics.rect(listX, listStartY, CARD_ROW_LIST_WIDTH, visibleHeight);
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
		const cancelY = listStartY + visibleHeight + listToButtonGap;
		this.cancelButton = this.createButton(
			"スキップ",
			areaW / 2 - BUTTON_WIDTH / 2,
			cancelY,
			UI_COLORS_BUTTON_SECONDARY.bg,
			UI_COLORS_BUTTON_SECONDARY.border,
			() => {
				// キャンセル = スキップ扱い
				this.onSkip?.(0);
			},
		);
		this.container.addChild(this.cancelButton);
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
			UI_COLORS_BUTTON_SECONDARY.bg,
			UI_COLORS_BUTTON_SECONDARY.border,
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
		const item = createCardListRow({ cardType: card.type, width });
		item.x = x;
		item.y = y;

		// 除去ボタン
		const removeBtnWidth = 50;
		const removeBtnHeight = 22;
		const removeBtn = new Container();
		removeBtn.x = width - removeBtnWidth - 6;
		removeBtn.y = (CARD_ROW_HEIGHT - removeBtnHeight) / 2;

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

		makeInteractive(removeBtn, async (e) => {
			e.stopPropagation?.();
			// アニメーション中は全除去ボタン・スキップボタンへの入力を一括無効化
			if (this.scrollContainer) {
				this.scrollContainer.interactiveChildren = false;
			}
			if (this.cancelButton) {
				this.cancelButton.eventMode = "none";
			}
			try {
				await this.animateCardRemove(item, width);
				this.onRemoveCard?.(card.id);
			} catch (error) {
				console.error("カード除去処理中にエラーが発生しました", error);
			} finally {
				if (this.scrollContainer) {
					this.scrollContainer.interactiveChildren = true;
				}
				if (this.cancelButton) {
					this.cancelButton.eventMode = "static";
				}
			}
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

	/**
	 * カード取得アニメーション
	 * レアリティに応じたパーティクルエフェクト + カードが縮小してフェードアウト
	 */
	async animateCardAcquire(index: number, cardType: CardType): Promise<void> {
		const cardContainer = this.cardContainers[index];
		if (!cardContainer) return;

		const rarity = CARD_RARITY[cardType];

		// パーティクルエフェクト（レアリティで差別化）
		// カード中心のグローバル座標をパーティクルシステムのローカル座標に変換
		// パーティクルはUXフローをブロックしないよう待機せず並列実行
		if (this.particleSystem) {
			const globalPos = cardContainer.toGlobal({
				x: REWARD_CARD_WIDTH / 2,
				y: REWARD_CARD_HEIGHT / 2,
			});
			const particleOrigin = this.particleSystem
				.getContainer()
				.toLocal(globalPos);

			this.particleSystem.emit({
				count: ACQUIRE_PARTICLE_COUNT[rarity],
				origin: particleOrigin,
				color: ACQUIRE_PARTICLE_COLORS[rarity],
				speed: { min: 0.02, max: rarity === "rare" ? 0.12 : 0.08 },
				life: { min: 300, max: rarity === "rare" ? 800 : 500 },
				size: { min: 1, max: rarity === "rare" ? 4 : 3 },
				pattern: { type: "radial" },
			});
		}

		// カード拡大 → 縮小フェードアウト
		// pivotをカード中心に設定してスケールアニメーション
		cardContainer.pivot.set(REWARD_CARD_WIDTH / 2, REWARD_CARD_HEIGHT / 2);
		cardContainer.x += REWARD_CARD_WIDTH / 2;
		cardContainer.y += REWARD_CARD_HEIGHT / 2;

		await tween(
			cardContainer,
			{ scaleX: 1.15, scaleY: 1.15 },
			{ duration: ACQUIRE_SCALE_DURATION, easing: Easing.easeOutBack },
		);

		await tween(
			cardContainer,
			{ scaleX: 0, scaleY: 0, alpha: 0 },
			{ duration: ACQUIRE_SHRINK_DURATION, easing: Easing.easeInOut },
		);
	}

	/**
	 * カード除去アニメーション
	 * 赤いパーティクル + フェードアウト
	 */
	async animateCardRemove(
		itemContainer: Container,
		itemWidth: number,
	): Promise<void> {
		// アイテム中心のグローバル座標をパーティクルシステムのローカル座標に変換
		const globalPos = itemContainer.toGlobal({
			x: itemWidth / 2,
			y: CARD_ROW_HEIGHT / 2,
		});
		const particleOrigin = this.particleSystem
			? this.particleSystem.getContainer().toLocal(globalPos)
			: { x: 0, y: 0 };

		this.particleSystem?.emit({
			count: REMOVE_PARTICLE_COUNT,
			origin: particleOrigin,
			color: REMOVE_PARTICLE_COLORS,
			speed: { min: 0.02, max: 0.06 },
			life: { min: 200, max: 500 },
			size: { min: 1, max: 3 },
			pattern: { type: "radial" },
		});

		await tween(
			itemContainer,
			{ alpha: 0, scaleX: 0.8, scaleY: 0.8 },
			{ duration: REMOVE_FADE_DURATION, easing: Easing.easeInOut },
		);
	}
}
