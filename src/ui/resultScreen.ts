/**
 * リザルト画面UI
 * ゲームオーバー・勝利の両方で使用する統合リザルト画面
 */

import { Container, Graphics, Text } from "pixi.js";
import {
	PERSONALITY_LABEL,
	PERSONALITY_SYMBOL,
	RESULT_HIGHLIGHT_MIN,
} from "../constants";
import type { Card, HighlightEntry, ResultData } from "../types";
import { Easing, tween } from "../utils/tween";
import { CARD_COLORS, CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import { PERSONALITY_CARD_COLORS } from "./characterCardRenderer";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import {
	UI_COLORS_BUTTON_PRIMARY,
	UI_COLORS_BUTTON_SECONDARY,
} from "./uiColors";

/** レイアウト定数 */
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 8;
const BUTTON_GAP = 16;
const SECTION_GAP = 16;
const PANEL_PADDING = 12;
const CONTENT_WIDTH = 380;

/** アニメーション定数 */
const TITLE_FADE_DURATION = 600;
const CONTENT_FADE_DURATION = 400;
const CONTENT_FADE_DELAY = 300;
const SECTION_DELAY_STEP = 150;

/** 色定数 */
const GAME_OVER_COLOR = 0xcc3333;
const VICTORY_COLOR = 0x44cc44;
const STAT_LABEL_COLOR = 0x999999;
const STAT_VALUE_COLOR = 0xffffff;
const HIGHLIGHT_TEXT_COLOR = 0xffdd88;
const MVP_BORDER_COLOR = 0xffd700;

/**
 * テスト環境（Canvas API不在）でも安全にheightを取得する
 */
function safeTextHeight(obj: Text | Container, fallback: number): number {
	try {
		return obj.height;
	} catch {
		return fallback;
	}
}

/**
 * リザルト画面レンダラー
 */
export class ResultScreen {
	private container: Container;
	private onContinue: (() => void) | null = null;
	private onReturnToTitle: (() => void) | null = null;
	private tweenAbort: AbortController | null = null;

	constructor() {
		this.container = new Container();
	}

	getContainer(): Container {
		return this.container;
	}

	setOnContinue(callback: () => void): void {
		this.onContinue = callback;
	}

	setOnReturnToTitle(callback: () => void): void {
		this.onReturnToTitle = callback;
	}

	/**
	 * リザルト画面を描画
	 */
	render(data: ResultData, screenWidth: number, screenHeight: number): void {
		this.tweenAbort?.abort();
		this.tweenAbort = new AbortController();
		const { signal } = this.tweenAbort;

		this.container.removeChildren();

		const isVictory = data.result === "clear";
		const centerX = screenWidth / 2;
		let currentY = 0;

		// 半透明オーバーレイ
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// スクロール可能なコンテンツコンテナ
		const content = new Container();
		this.container.addChild(content);

		let sectionIndex = 0;

		// === ヘッダー ===
		currentY = 24;
		const titleText = isVictory ? "ダンジョンクリア！" : "ゲームオーバー";
		const titleColor = isVictory ? VICTORY_COLOR : GAME_OVER_COLOR;
		const title = new Text({
			text: titleText,
			style: {
				fontSize: 32,
				fontFamily: "sans-serif",
				fill: titleColor,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5, 0);
		title.x = centerX;
		title.y = currentY;
		title.alpha = 0;
		title.scale.set(0.5);
		content.addChild(title);

		tween(
			title,
			{ alpha: 1, scaleX: 1, scaleY: 1 },
			{ duration: TITLE_FADE_DURATION, easing: Easing.easeOutBack, signal },
		);
		currentY += 48;

		// === 発話パネル ===
		if (data.speechLog) {
			const speechPanel = this.createSpeechPanel(data, centerX, currentY);
			const speechHeight = safeTextHeight(speechPanel, 60);
			speechPanel.alpha = 0;
			content.addChild(speechPanel);
			this.fadeIn(speechPanel, sectionIndex++, signal);
			currentY += speechHeight + SECTION_GAP;
		}

		// === 基本統計 2×2グリッド ===
		const statsPanel = this.createStatsGrid(data, centerX, currentY);
		statsPanel.alpha = 0;
		content.addChild(statsPanel);
		this.fadeIn(statsPanel, sectionIndex++, signal);
		currentY += 80 + SECTION_GAP;

		// === ハイライト ===
		if (data.highlights.length >= RESULT_HIGHLIGHT_MIN) {
			const highlightPanel = this.createHighlightPanel(
				data.highlights,
				centerX,
				currentY,
			);
			highlightPanel.alpha = 0;
			content.addChild(highlightPanel);
			this.fadeIn(highlightPanel, sectionIndex++, signal);
			currentY += this.getHighlightHeight(data.highlights) + SECTION_GAP;
		}

		// === 手札統計 + MVP ===
		if (data.hand.length > 0) {
			const cardPanel = this.createCardStatsPanel(data, centerX, currentY);
			cardPanel.alpha = 0;
			content.addChild(cardPanel);
			this.fadeIn(cardPanel, sectionIndex++, signal);
			currentY += this.getCardStatsPanelHeight(data) + SECTION_GAP;
		}

		// === ボタン ===
		const buttonContainer = new Container();
		buttonContainer.alpha = 0;

		if (isVictory) {
			const continueBtn = this.createButton(
				"続ける",
				centerX,
				0,
				UI_COLORS_BUTTON_PRIMARY,
				() => this.onContinue?.(),
			);
			buttonContainer.addChild(continueBtn);

			const returnBtn = this.createButton(
				"タイトルに戻る",
				centerX,
				BUTTON_HEIGHT + BUTTON_GAP,
				UI_COLORS_BUTTON_SECONDARY,
				() => this.onReturnToTitle?.(),
			);
			buttonContainer.addChild(returnBtn);
		} else {
			const returnBtn = this.createButton(
				"タイトルに戻る",
				centerX,
				0,
				UI_COLORS_BUTTON_PRIMARY,
				() => this.onReturnToTitle?.(),
			);
			buttonContainer.addChild(returnBtn);
		}

		buttonContainer.y = currentY;
		content.addChild(buttonContainer);
		this.fadeIn(buttonContainer, sectionIndex, signal);

		// コンテンツが画面より高い場合は上方にオフセット
		const totalContentHeight =
			currentY +
			(isVictory ? BUTTON_HEIGHT * 2 + BUTTON_GAP : BUTTON_HEIGHT) +
			24;
		if (totalContentHeight > screenHeight) {
			content.y = Math.max(-(totalContentHeight - screenHeight), -100);
		}
	}

	private fadeIn(target: Container, index: number, signal: AbortSignal): void {
		tween(
			target,
			{ alpha: 1 },
			{
				duration: CONTENT_FADE_DURATION,
				delay: CONTENT_FADE_DELAY + index * SECTION_DELAY_STEP,
				easing: Easing.easeOut,
				signal,
			},
		);
	}

	/**
	 * 発話パネルを作成
	 */
	private createSpeechPanel(
		data: ResultData,
		centerX: number,
		y: number,
	): Container {
		const panel = new Container();
		const panelWidth = CONTENT_WIDTH;
		const panelX = centerX - panelWidth / 2;
		panel.x = panelX;
		panel.y = y;

		const colors = PERSONALITY_CARD_COLORS[data.personality];

		const icon = new Text({
			text: `${PERSONALITY_SYMBOL[data.personality]} ${PERSONALITY_LABEL[data.personality]}`,
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: colors.border,
			},
		});
		icon.x = PANEL_PADDING;
		icon.y = 6;

		let panelHeight = 26 + PANEL_PADDING;
		if (data.speechLog) {
			const speech = new Text({
				text: `「${data.speechLog.message}」`,
				style: {
					fontSize: 13,
					fontFamily: "sans-serif",
					fill: 0xeeeef0,
					wordWrap: true,
					wordWrapWidth: panelWidth - PANEL_PADDING * 2,
				},
			});
			speech.x = PANEL_PADDING;
			speech.y = 26;
			panelHeight = 26 + safeTextHeight(speech, 20) + PANEL_PADDING;
			panel.addChild(speech);
		}

		const bg = new Graphics();
		drawRoundedRect(
			bg,
			panelWidth,
			panelHeight,
			6,
			{ color: colors.bg, alpha: 0.9 },
			{ color: colors.border, width: 1 },
		);
		panel.addChildAt(bg, 0);
		panel.addChild(icon);

		return panel;
	}

	/**
	 * 基本統計2×2グリッドを作成
	 */
	private createStatsGrid(
		data: ResultData,
		centerX: number,
		y: number,
	): Container {
		const panel = new Container();
		const gridWidth = CONTENT_WIDTH;
		panel.x = centerX - gridWidth / 2;
		panel.y = y;

		const stats = [
			{ label: "到達階層", value: `${data.maxFloor}F` },
			{ label: "総ターン数", value: `${data.totalTurns}` },
			{ label: "与ダメージ", value: `${data.totalDamageDealt}` },
			{ label: "被ダメージ", value: `${data.totalDamageTaken}` },
		];

		const cellWidth = gridWidth / 2;
		const cellHeight = 36;
		for (let i = 0; i < stats.length; i++) {
			const col = i % 2;
			const row = Math.floor(i / 2);
			const x = col * cellWidth;
			const yOff = row * cellHeight;

			const label = new Text({
				text: stats[i].label,
				style: {
					fontSize: 12,
					fontFamily: "sans-serif",
					fill: STAT_LABEL_COLOR,
				},
			});
			label.x = x + PANEL_PADDING;
			label.y = yOff;
			panel.addChild(label);

			const value = new Text({
				text: stats[i].value,
				style: {
					fontSize: 18,
					fontFamily: "sans-serif",
					fill: STAT_VALUE_COLOR,
					fontWeight: "bold",
				},
			});
			value.x = x + PANEL_PADDING;
			value.y = yOff + 16;
			panel.addChild(value);
		}

		return panel;
	}

	/**
	 * ハイライトパネルを作成
	 */
	private createHighlightPanel(
		highlights: HighlightEntry[],
		centerX: number,
		y: number,
	): Container {
		const panel = new Container();
		const panelWidth = CONTENT_WIDTH;
		panel.x = centerX - panelWidth / 2;
		panel.y = y;

		const headerText = new Text({
			text: "- ハイライト -",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: STAT_LABEL_COLOR,
			},
		});
		headerText.anchor.set(0.5, 0);
		headerText.x = panelWidth / 2;
		headerText.y = 0;
		panel.addChild(headerText);

		let lineY = 22;
		for (const h of highlights) {
			const text = new Text({
				text: h.text,
				style: {
					fontSize: 13,
					fontFamily: "sans-serif",
					fill: HIGHLIGHT_TEXT_COLOR,
				},
			});
			text.x = PANEL_PADDING;
			text.y = lineY;
			panel.addChild(text);
			lineY += 20;
		}

		return panel;
	}

	private getHighlightHeight(highlights: HighlightEntry[]): number {
		return 22 + highlights.length * 20;
	}

	/**
	 * 手札統計+MVPパネルを作成
	 */
	private createCardStatsPanel(
		data: ResultData,
		centerX: number,
		y: number,
	): Container {
		const panel = new Container();
		const panelWidth = CONTENT_WIDTH;
		panel.x = centerX - panelWidth / 2;
		panel.y = y;

		const headerText = new Text({
			text: "- 手札 -",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: STAT_LABEL_COLOR,
			},
		});
		headerText.anchor.set(0.5, 0);
		headerText.x = panelWidth / 2;
		headerText.y = 0;
		panel.addChild(headerText);

		let cardY = 22;
		for (const card of data.hand) {
			const row = this.createCardRow(card, data.mvpCard, panelWidth);
			row.y = cardY;
			panel.addChild(row);
			cardY += 28;
		}

		return panel;
	}

	private getCardStatsPanelHeight(data: ResultData): number {
		return 22 + data.hand.length * 28;
	}

	/**
	 * カード1行分の描画
	 */
	private createCardRow(
		card: Card,
		mvpCard: Card | null,
		panelWidth: number,
	): Container {
		const row = new Container();
		const isMvp = mvpCard !== null && card.id === mvpCard.id;

		if (isMvp) {
			const mvpBg = new Graphics();
			drawRoundedRect(
				mvpBg,
				panelWidth,
				24,
				4,
				{ color: 0x3a3a20, alpha: 0.6 },
				{ color: MVP_BORDER_COLOR, width: 1 },
			);
			row.addChild(mvpBg);
		}

		const colors = CARD_COLORS[card.type];
		const symbol = CARD_TYPE_SYMBOL[card.type];
		const name = CARD_TYPE_NAME[card.type];

		const cardLabel = new Text({
			text: `${symbol} ${name} Lv.${card.level}`,
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: colors.border,
				fontWeight: isMvp ? "bold" : "normal",
			},
		});
		cardLabel.x = PANEL_PADDING;
		cardLabel.y = 4;
		row.addChild(cardLabel);

		const statsText = new Text({
			text: `使用${card.stats.useCount} 撃破${card.stats.defeatCount}`,
			style: {
				fontSize: 11,
				fontFamily: "sans-serif",
				fill: STAT_LABEL_COLOR,
			},
		});
		statsText.x = panelWidth - PANEL_PADDING - 120;
		statsText.y = 6;
		row.addChild(statsText);

		if (isMvp) {
			const mvpBadge = new Text({
				text: "MVP",
				style: {
					fontSize: 10,
					fontFamily: "sans-serif",
					fill: MVP_BORDER_COLOR,
					fontWeight: "bold",
				},
			});
			mvpBadge.x = panelWidth - PANEL_PADDING - 28;
			mvpBadge.y = 6;
			row.addChild(mvpBadge);
		}

		return row;
	}

	/**
	 * ボタンを生成
	 */
	private createButton(
		label: string,
		centerX: number,
		y: number,
		colors: { bg: number; border: number },
		onClick: () => void,
	): Container {
		const button = new Container();
		button.x = centerX - BUTTON_WIDTH / 2;
		button.y = y;

		const bg = new Graphics();
		drawRoundedRect(bg, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS, colors.bg, {
			color: colors.border,
			width: 2,
		});
		button.addChild(bg);

		const text = new Text({
			text: label,
			style: {
				fontSize: 18,
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
