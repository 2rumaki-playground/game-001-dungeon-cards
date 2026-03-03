/**
 * カード除去/交換画面UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import type { Card, CardType } from "../types";
import { Easing, tween } from "../utils/tween";
import {
	createCardTooltip,
	TOOLTIP_MARGIN,
	TOOLTIP_WIDTH,
} from "./cardTooltip";
import {
	BUTTON_HEIGHT,
	BUTTON_RADIUS,
	BUTTON_WIDTH,
	createRewardCardView,
	createScreenButton,
	highlightCard,
	REWARD_CARD_HEIGHT,
	REWARD_CARD_WIDTH,
	unhighlightCard,
} from "./deckbuildingScreenHelpers";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import { createGridCardView } from "./gridCardView";
import { CARD_GAP, CARD_HEIGHT, CARD_RADIUS, CARD_WIDTH } from "./handRenderer";
import type { ParticleSystem } from "./particleSystem";
import { UI_COLORS_BUTTON_SECONDARY, UI_COLORS_DISABLED } from "./uiColors";

/** カード除去アニメーション定数 */
const REMOVE_FADE_DURATION = 400;
const REMOVE_PARTICLE_COLORS = [0xff4444, 0xff6644, 0xcc2222];
const REMOVE_PARTICLE_COUNT = 15;

/** カード除去アニメーション：縮小スケール */
const REMOVE_SHRINK_SCALE = 0.8;

/** グリッドレイアウト定数 */
const GRID_COLUMNS = 4;

/**
 * カード除去/交換画面レンダラー
 */
export class CardRemoveScreen {
	private container: Container;
	private tooltipContainer: Container;
	private particleSystem: ParticleSystem | null = null;
	private onRemoveCard: ((cardId: string) => void) | null = null;
	private onSkip: (() => void) | null = null;
	private gridContainer: Container | null = null;
	private confirmButtonContainer: Container | null = null;
	private selectedRemoveCardId: string | null = null;
	private selectedRemoveItem: { container: Container; width: number } | null =
		null;
	private isRemoving = false;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
		this.tooltipContainer = new Container();
		this.tooltipContainer.label = "tooltip";
		this.tooltipContainer.eventMode = "none";
		this.tooltipContainer.interactiveChildren = false;
	}

	getContainer(): Container {
		return this.container;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}

	setParticleSystem(particleSystem: ParticleSystem): void {
		this.particleSystem = particleSystem;
	}

	setOnRemoveCard(callback: (cardId: string) => void): void {
		this.onRemoveCard = callback;
	}

	setOnSkip(callback: () => void): void {
		this.onSkip = callback;
	}

	/**
	 * 除去選択画面のデッキ一覧を描画（グリッド形式）
	 * @param gameAreaWidth ゲームエリアの幅（ログエリアを除いた領域）
	 * @param gameAreaHeight ゲームエリアの高さ
	 * @param acquiredCardType 獲得候補カードの種別（交換画面で表示）
	 */
	renderRemoveSelection(
		deckCards: Card[],
		screenWidth: number,
		screenHeight: number,
		titleText = "除去するカードを選択",
		gameAreaWidth?: number,
		gameAreaHeight?: number,
		acquiredCardType?: CardType,
	): void {
		this.container.removeChildren();
		this.gridContainer = null;
		this.selectedRemoveCardId = null;
		this.selectedRemoveItem = null;
		this.confirmButtonContainer = null;
		this.isRemoving = false;

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

		// レイアウト間隔
		const sectionGap = 12;
		const subtitleFontSize = 16;
		const gridToButtonGap = 10;
		const buttonGap = 12;
		const totalButtonWidth = BUTTON_WIDTH * 2 + buttonGap;

		// グリッドサイズ計算
		const gridRows = Math.ceil(deckCards.length / GRID_COLUMNS);
		const gridWidth = GRID_COLUMNS * CARD_WIDTH + (GRID_COLUMNS - 1) * CARD_GAP;
		const gridHeight =
			gridRows > 0 ? gridRows * CARD_HEIGHT + (gridRows - 1) * CARD_GAP : 0;

		// コンテンツ全体の高さ計算
		const hasAcquired = acquiredCardType !== undefined;
		const acquiredCardHeight = hasAcquired
			? REWARD_CARD_HEIGHT + sectionGap
			: 0;
		const showSubtitle =
			hasAcquired && !titleText.includes("交換するカードを選択");
		const subtitleHeight = showSubtitle ? subtitleFontSize + sectionGap : 0;
		const contentHeight =
			titleFontSize +
			sectionGap +
			acquiredCardHeight +
			subtitleHeight +
			gridHeight +
			gridToButtonGap +
			BUTTON_HEIGHT;
		const contentStartY = (areaH - contentHeight) / 2;

		// タイトル位置
		title.x = areaW / 2;
		title.y = contentStartY + titleFontSize / 2;

		let currentY = contentStartY + titleFontSize + sectionGap;

		// 獲得候補カード（指定時のみ）
		if (hasAcquired) {
			const acquiredX = (areaW - REWARD_CARD_WIDTH) / 2;
			const acquiredCard = this.createAcquiredCardPreview(
				acquiredCardType,
				acquiredX,
				currentY,
			);
			this.container.addChild(acquiredCard);
			currentY += REWARD_CARD_HEIGHT + sectionGap;

			// タイトルに同じ案内文が含まれていない場合のみサブタイトルを表示して重複を回避
			if (showSubtitle) {
				const subtitle = new Text({
					text: "交換するカードを選択",
					style: {
						fontSize: subtitleFontSize,
						fontFamily: "sans-serif",
						fill: 0xcccccc,
					},
				});
				subtitle.anchor.set(0.5);
				subtitle.x = areaW / 2;
				subtitle.y = currentY + subtitleFontSize / 2;
				this.container.addChild(subtitle);
				currentY += subtitleFontSize + sectionGap;
			}
		}

		// グリッドコンテナ
		this.gridContainer = new Container();
		this.gridContainer.label = "gridContainer";
		const gridX = (areaW - gridWidth) / 2;
		this.gridContainer.x = gridX;
		this.gridContainer.y = currentY;

		for (let i = 0; i < deckCards.length; i++) {
			const card = deckCards[i];
			const col = i % GRID_COLUMNS;
			const row = Math.floor(i / GRID_COLUMNS);
			const x = col * (CARD_WIDTH + CARD_GAP);
			const y = row * (CARD_HEIGHT + CARD_GAP);
			const item = this.createExchangeGridCard(card, x, y);
			this.gridContainer.addChild(item);
		}
		this.container.addChild(this.gridContainer);

		// 統一ボタンエリア
		const buttonY = currentY + gridHeight + gridToButtonGap;
		const buttonStartX = (areaW - totalButtonWidth) / 2;

		this.confirmButtonContainer = new Container();

		// 「交換」ボタン（未選択時は無効）
		const removeConfirmBtn = createScreenButton(
			"交換",
			buttonStartX,
			buttonY,
			UI_COLORS_DISABLED.bg,
			UI_COLORS_DISABLED.border,
			async () => {
				if (this.isRemoving) return;
				if (
					this.selectedRemoveCardId === null ||
					this.selectedRemoveItem === null
				)
					return;
				this.isRemoving = true;
				const cardId = this.selectedRemoveCardId;
				const item = this.selectedRemoveItem;
				// アニメーション中は入力を一括無効化
				const prevEventMode = this.gridContainer?.eventMode;
				if (this.gridContainer) {
					this.gridContainer.eventMode = "none";
					this.gridContainer.interactiveChildren = false;
				}
				if (this.confirmButtonContainer) {
					this.confirmButtonContainer.interactiveChildren = false;
				}
				try {
					await this.animateCardRemove(item.container, item.width);
					this.onRemoveCard?.(cardId);
				} catch (error) {
					console.error("カード除去処理中にエラーが発生しました", error);
				} finally {
					this.isRemoving = false;
					if (this.gridContainer) {
						this.gridContainer.eventMode = prevEventMode ?? "passive";
						this.gridContainer.interactiveChildren = true;
					}
					if (this.confirmButtonContainer) {
						this.confirmButtonContainer.interactiveChildren = true;
					}
				}
			},
		);
		removeConfirmBtn.label = "removeBtn";
		removeConfirmBtn.eventMode = "none";
		removeConfirmBtn.cursor = "default";
		(removeConfirmBtn.children[1] as Text).style.fill = UI_COLORS_DISABLED.text;
		this.confirmButtonContainer.addChild(removeConfirmBtn);

		// 「スキップ」ボタン（常に有効）
		const skipBtn = createScreenButton(
			"スキップ",
			buttonStartX + BUTTON_WIDTH + buttonGap,
			buttonY,
			UI_COLORS_BUTTON_SECONDARY.bg,
			UI_COLORS_BUTTON_SECONDARY.border,
			() => {
				this.onSkip?.();
			},
		);
		skipBtn.label = "skipBtn";
		this.confirmButtonContainer.addChild(skipBtn);

		this.container.addChild(this.confirmButtonContainer);

		// ツールチップコンテナ（Z-order最前面）
		this.tooltipContainer.removeChildren();
		this.container.addChild(this.tooltipContainer);
	}

	/**
	 * カード除去アニメーション
	 * 赤いパーティクル + フェードアウト
	 */
	async animateCardRemove(
		itemContainer: Container,
		itemWidth: number,
	): Promise<void> {
		const globalPos = itemContainer.toGlobal({
			x: itemWidth / 2,
			y: CARD_HEIGHT / 2,
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
			{ alpha: 0, scaleX: REMOVE_SHRINK_SCALE, scaleY: REMOVE_SHRINK_SCALE },
			{ duration: REMOVE_FADE_DURATION, easing: Easing.easeInOut },
		);
	}

	/**
	 * 交換グリッド用カードを生成（共通カードビュー + インタラクション付き）
	 */
	private createExchangeGridCard(card: Card, x: number, y: number): Container {
		const cardContainer = createGridCardView(card.type);
		cardContainer.x = x;
		cardContainer.y = y;

		makeInteractive(cardContainer, () => {
			this.selectRemoveCard(card.id, cardContainer, CARD_WIDTH);
		});

		cardContainer.on("pointerover", () => {
			this.showGridTooltip(card, cardContainer);
		});
		cardContainer.on("pointerout", () => {
			this.hideTooltip();
		});

		return cardContainer;
	}

	/**
	 * 獲得候補カードのプレビューを生成（ツールチップ用のホバーのみ）
	 */
	private createAcquiredCardPreview(
		cardType: CardType,
		x: number,
		y: number,
	): Container {
		const cardContainer = createRewardCardView(cardType);
		cardContainer.x = x;
		cardContainer.y = y;
		cardContainer.label = "acquiredCard";
		cardContainer.eventMode = "static";

		cardContainer.on("pointerover", () => {
			this.showTooltip(cardType, x, y, REWARD_CARD_WIDTH);
		});
		cardContainer.on("pointerout", () => {
			this.hideTooltip();
		});

		return cardContainer;
	}

	/**
	 * 除去カードの選択状態を更新
	 */
	private selectRemoveCard(
		cardId: string,
		item: Container,
		width: number,
	): void {
		if (this.selectedRemoveItem) {
			unhighlightCard(this.selectedRemoveItem.container);
		}
		this.selectedRemoveCardId = cardId;
		this.selectedRemoveItem = { container: item, width };
		highlightCard(item, width, CARD_HEIGHT, CARD_RADIUS);
		this.updateRemoveConfirmButton();
	}

	/**
	 * 除去画面の「除去」ボタンの有効/無効を更新
	 */
	private updateRemoveConfirmButton(): void {
		if (!this.confirmButtonContainer) return;
		const removeBtn = this.confirmButtonContainer.children.find(
			(c) => c.label === "removeBtn",
		);
		if (!removeBtn) return;

		const bg = removeBtn.children[0] as Graphics;
		const text = removeBtn.children[1] as Text;

		if (this.selectedRemoveCardId !== null) {
			removeBtn.eventMode = "static";
			removeBtn.cursor = "pointer";
			bg.clear();
			drawRoundedRect(
				bg,
				BUTTON_WIDTH,
				BUTTON_HEIGHT,
				BUTTON_RADIUS,
				0x882222,
				{
					color: 0xaa4444,
					width: 1,
				},
			);
			text.style.fill = 0xffffff;
		} else {
			removeBtn.eventMode = "none";
			removeBtn.cursor = "default";
			bg.clear();
			drawRoundedRect(
				bg,
				BUTTON_WIDTH,
				BUTTON_HEIGHT,
				BUTTON_RADIUS,
				UI_COLORS_DISABLED.bg,
				{ color: UI_COLORS_DISABLED.border, width: 1 },
			);
			text.style.fill = UI_COLORS_DISABLED.text;
		}
	}

	/**
	 * ツールチップをカード上部中央に表示（報酬カード用）
	 */
	private showTooltip(
		cardType: CardType,
		cardX: number,
		cardY: number,
		cardWidth: number,
	): void {
		this.tooltipContainer.removeChildren();
		const { container: tooltip, height: tooltipHeight } =
			createCardTooltip(cardType);
		tooltip.x = cardX + cardWidth / 2 - TOOLTIP_WIDTH / 2;
		tooltip.y = cardY - tooltipHeight - TOOLTIP_MARGIN;
		this.tooltipContainer.addChild(tooltip);
	}

	/**
	 * ツールチップをカード上部中央に表示（グリッドカード用）
	 */
	private showGridTooltip(
		cardOrType: Card | CardType,
		cardContainer: Container,
	): void {
		this.tooltipContainer.removeChildren();
		if (!this.gridContainer) return;
		const { container: tooltip, height: tooltipHeight } =
			createCardTooltip(cardOrType);
		tooltip.x =
			this.gridContainer.x +
			cardContainer.x +
			CARD_WIDTH / 2 -
			TOOLTIP_WIDTH / 2;
		tooltip.y =
			this.gridContainer.y + cardContainer.y - tooltipHeight - TOOLTIP_MARGIN;
		this.tooltipContainer.addChild(tooltip);
	}

	/**
	 * ツールチップを非表示
	 */
	private hideTooltip(): void {
		this.tooltipContainer.removeChildren();
	}
}
