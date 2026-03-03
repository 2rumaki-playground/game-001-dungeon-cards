/**
 * 報酬選択画面UI
 * @see docs/spec/deckbuilding.md
 */

import { Container, Graphics, Text } from "pixi.js";
import type { CardType } from "../types";
import { Easing, tween } from "../utils/tween";
import { CARD_GLOW_COLORS } from "./cardConstants";
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
	REWARD_CARD_GAP,
	REWARD_CARD_HEIGHT,
	REWARD_CARD_RADIUS,
	REWARD_CARD_WIDTH,
	unhighlightCard,
} from "./deckbuildingScreenHelpers";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import type { ParticleSystem } from "./particleSystem";
import {
	UI_COLOR_GOLD,
	UI_COLORS_BUTTON_SECONDARY,
	UI_COLORS_DISABLED,
} from "./uiColors";

/** カード取得アニメーション定数 */
const ACQUIRE_SCALE_DURATION = 200;
const ACQUIRE_SHRINK_DURATION = 300;
const ACQUIRE_PARTICLE_COUNT = 20;

/**
 * 報酬選択画面レンダラー
 */
export class RewardSelectScreen {
	private container: Container;
	private tooltipContainer: Container;
	private particleSystem: ParticleSystem | null = null;
	private onCardSelect: ((index: number) => void) | null = null;
	private onSkip: (() => void) | null = null;
	private cardContainers: Container[] = [];
	private selectedCardIndex: number | null = null;
	private confirmButtonContainer: Container | null = null;

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

	setOnCardSelect(callback: (index: number) => void): void {
		this.onCardSelect = callback;
	}

	setOnSkip(callback: () => void): void {
		this.onSkip = callback;
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
		this.selectedCardIndex = null;
		this.confirmButtonContainer = null;

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
		const cardToButtonGap = 16;
		const contentHeight =
			titleFontSize +
			titleToCardGap +
			REWARD_CARD_HEIGHT +
			cardToButtonGap +
			BUTTON_HEIGHT;

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

		// 統一ボタンエリア
		const buttonY = cardY + REWARD_CARD_HEIGHT + cardToButtonGap;
		const buttonGap = 12;
		const totalButtonWidth = BUTTON_WIDTH * 2 + buttonGap;
		const buttonStartX = (areaW - totalButtonWidth) / 2;

		this.confirmButtonContainer = new Container();

		// 「獲得」ボタン（未選択時は無効）
		const acquireBtn = createScreenButton(
			"獲得",
			buttonStartX,
			buttonY,
			UI_COLORS_DISABLED.bg,
			UI_COLORS_DISABLED.border,
			() => {
				if (this.selectedCardIndex !== null) {
					this.onCardSelect?.(this.selectedCardIndex);
				}
			},
		);
		acquireBtn.label = "acquireBtn";
		acquireBtn.eventMode = "none";
		acquireBtn.cursor = "default";
		(acquireBtn.children[1] as Text).style.fill = UI_COLORS_DISABLED.text;
		this.confirmButtonContainer.addChild(acquireBtn);

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
	 * カード取得アニメーション
	 * レアリティに応じたパーティクルエフェクト + カードが縮小してフェードアウト
	 */
	async animateCardAcquire(index: number, cardType: CardType): Promise<void> {
		const cardContainer = this.cardContainers[index];
		if (!cardContainer) return;

		// パーティクルエフェクト（カード種別の発光色を使用）
		if (this.particleSystem) {
			const globalPos = cardContainer.toGlobal({
				x: REWARD_CARD_WIDTH / 2,
				y: REWARD_CARD_HEIGHT / 2,
			});
			const particleOrigin = this.particleSystem
				.getContainer()
				.toLocal(globalPos);

			this.particleSystem.emit({
				count: ACQUIRE_PARTICLE_COUNT,
				origin: particleOrigin,
				color: CARD_GLOW_COLORS[cardType],
				speed: { min: 0.02, max: 0.08 },
				life: { min: 300, max: 500 },
				size: { min: 1, max: 3 },
				pattern: { type: "radial" },
			});
		}

		// カード拡大 → 縮小フェードアウト
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
	 * 報酬カードを1枚生成
	 */
	private createRewardCard(
		cardType: CardType,
		x: number,
		y: number,
		index: number,
	): Container {
		const cardContainer = createRewardCardView(cardType);
		cardContainer.x = x;
		cardContainer.y = y;

		makeInteractive(cardContainer, () => {
			this.selectRewardCard(index);
		});

		cardContainer.on("pointerover", () => {
			this.showTooltip(cardType, x, y, REWARD_CARD_WIDTH);
		});
		cardContainer.on("pointerout", () => {
			this.hideTooltip();
		});

		return cardContainer;
	}

	/**
	 * 報酬カードの選択状態を更新
	 */
	private selectRewardCard(index: number): void {
		if (this.selectedCardIndex !== null) {
			unhighlightCard(this.cardContainers[this.selectedCardIndex]);
		}
		this.selectedCardIndex = index;
		highlightCard(
			this.cardContainers[index],
			REWARD_CARD_WIDTH,
			REWARD_CARD_HEIGHT,
			REWARD_CARD_RADIUS,
		);
		this.updateRewardConfirmButton();
	}

	/**
	 * 報酬画面の「獲得」ボタンの有効/無効を更新
	 */
	private updateRewardConfirmButton(): void {
		if (!this.confirmButtonContainer) return;
		const acquireBtn = this.confirmButtonContainer.children.find(
			(c) => c.label === "acquireBtn",
		);
		if (!acquireBtn) return;

		const bg = acquireBtn.children[0] as Graphics;
		const text = acquireBtn.children[1] as Text;

		if (this.selectedCardIndex !== null) {
			acquireBtn.eventMode = "static";
			acquireBtn.cursor = "pointer";
			bg.clear();
			drawRoundedRect(
				bg,
				BUTTON_WIDTH,
				BUTTON_HEIGHT,
				BUTTON_RADIUS,
				0x2a7a2a,
				{
					color: 0x4aaa4a,
					width: 1,
				},
			);
			text.style.fill = 0xffffff;
		} else {
			acquireBtn.eventMode = "none";
			acquireBtn.cursor = "default";
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
	 * ツールチップをカード上部中央に表示
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
	 * ツールチップを非表示
	 */
	private hideTooltip(): void {
		this.tooltipContainer.removeChildren();
	}
}
