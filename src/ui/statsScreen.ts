/**
 * 統計ダッシュボード画面UI
 *
 * DeckViewerと同じオーバーレイパターンで実装。
 * タイトル画面上に重ねて表示し、閉じるボタンで非表示にする。
 */

import { Container, Graphics, Text } from "pixi.js";
import { ENEMY_TYPE_LABEL } from "../constants";
import { aggregateStats, formatDuration } from "../game/statsAggregator";
import type { DeathCause, EnemyType, PlaySession } from "../types";
import { CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "./cardConstants";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";
import { UI_COLOR_GOLD, UI_COLORS_BUTTON_SECONDARY } from "./uiColors";

/** 死因の表示名 */
const DEATH_CAUSE_LABEL: Record<DeathCause, string> = {
	enemy_attack: "敵の攻撃",
	trap: "トラップ",
	unknown: "不明",
};

/** ボタン描画定数 */
const CLOSE_BUTTON_WIDTH = 100;
const CLOSE_BUTTON_HEIGHT = 32;
const CLOSE_BUTTON_RADIUS = 6;

const RESET_BUTTON_WIDTH = 130;
const RESET_BUTTON_COLORS = {
	bg: 0x8c2a2a,
	border: 0xca4a4a,
} as const;

/** セクション間ギャップ */
const SECTION_GAP = 16;
const LINE_HEIGHT = 20;

/** ヒストグラム描画定数 */
const HISTOGRAM_BAR_WIDTH = 16;
const HISTOGRAM_BAR_GAP = 2;
const HISTOGRAM_MAX_HEIGHT = 60;
const HISTOGRAM_BAR_COLOR = 0x4a8cca;
const HISTOGRAM_LABEL_COLOR = 0x999999;

/**
 * 統計ダッシュボード画面
 */
export class StatsScreen {
	private container: Container;
	private onClose: (() => void) | null = null;
	private onReset: (() => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
	}

	getContainer(): Container {
		return this.container;
	}

	setOnClose(callback: () => void): void {
		this.onClose = callback;
	}

	setOnReset(callback: () => void): void {
		this.onReset = callback;
	}

	/**
	 * 統計画面を描画
	 */
	render(
		sessions: PlaySession[],
		screenWidth: number,
		screenHeight: number,
	): void {
		this.container.removeChildren();

		// 半透明オーバーレイ
		const overlay = new Graphics();
		createOverlay(overlay, screenWidth, screenHeight);
		this.container.addChild(overlay);

		// タイトル
		const titleFontSize = 24;
		const titleY = 30;
		const title = new Text({
			text: "プレイ統計",
			style: {
				fontSize: titleFontSize,
				fontFamily: "sans-serif",
				fill: UI_COLOR_GOLD,
				fontWeight: "bold",
			},
		});
		title.anchor.set(0.5, 0);
		title.x = screenWidth / 2;
		title.y = titleY;
		this.container.addChild(title);

		if (sessions.length === 0) {
			this.renderEmptyState(screenWidth, screenHeight);
			return;
		}

		const stats = aggregateStats(sessions);
		let currentY = titleY + titleFontSize + SECTION_GAP;
		const contentX = 40;
		const rightColumnX = screenWidth / 2 + 20;

		// === 概要サマリー ===
		currentY = this.renderSummary(stats, contentX, rightColumnX, currentY);

		// === カード使用ランキング ===
		currentY += SECTION_GAP;
		currentY = this.renderCardUsageRanking(
			stats.cardUsageRanking,
			contentX,
			currentY,
		);

		// === 死因分布 ===
		if (stats.deathCauseRanking.length > 0) {
			currentY += SECTION_GAP;
			currentY = this.renderDeathCauseRanking(
				stats.deathCauseRanking,
				contentX,
				currentY,
			);
		}

		// === 敵タイプ別死因内訳 ===
		if (stats.enemyTypeDeathRanking.length > 0) {
			currentY += SECTION_GAP;
			currentY = this.renderEnemyTypeDeathRanking(
				stats.enemyTypeDeathRanking,
				contentX,
				currentY,
			);
		}

		// === 到達階層ヒストグラム ===
		if (stats.floorDistribution.size > 0) {
			currentY += SECTION_GAP;
			this.renderHistogram(
				stats.floorDistribution,
				contentX,
				currentY,
				screenWidth - contentX * 2,
			);
		}

		// ボタン群（画面下部）
		this.renderButtons(screenWidth, screenHeight);
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}

	/**
	 * データなし状態を描画
	 */
	private renderEmptyState(screenWidth: number, screenHeight: number): void {
		const emptyText = new Text({
			text: "データなし\nゲームをプレイすると統計が表示されます",
			style: {
				fontSize: 16,
				fontFamily: "sans-serif",
				fill: 0x999999,
				align: "center",
			},
		});
		emptyText.anchor.set(0.5);
		emptyText.x = screenWidth / 2;
		emptyText.y = screenHeight / 2 - 40;
		this.container.addChild(emptyText);

		// 閉じるボタン
		const closeButton = this.createCloseButton(screenWidth / 2);
		closeButton.y = screenHeight - 60;
		this.container.addChild(closeButton);
	}

	/**
	 * 概要サマリーを描画
	 */
	private renderSummary(
		stats: ReturnType<typeof aggregateStats>,
		leftX: number,
		rightX: number,
		startY: number,
	): number {
		const headerStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: UI_COLOR_GOLD,
			fontWeight: "bold" as const,
		};
		const valueStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		};

		let y = startY;

		// ヘッダー
		this.addText("概要", leftX, y, headerStyle);
		y += LINE_HEIGHT + 4;

		// 左カラム
		const clearRateStr =
			stats.clearRate !== null ? `${Math.round(stats.clearRate * 100)}%` : "-";
		this.addText(`総プレイ: ${stats.totalPlays}回`, leftX, y, valueStyle);
		this.addText(
			`クリア: ${stats.clearCount}回 (${clearRateStr})`,
			rightX,
			y,
			valueStyle,
		);
		y += LINE_HEIGHT;

		this.addText(`最高到達: ${stats.maxFloorReached}階`, leftX, y, valueStyle);
		const avgFloorStr =
			stats.averageMaxFloor !== null
				? `${stats.averageMaxFloor.toFixed(1)}階`
				: "-";
		this.addText(`平均到達: ${avgFloorStr}`, rightX, y, valueStyle);
		y += LINE_HEIGHT;

		const avgTimeStr =
			stats.averageRunTime !== null
				? formatDuration(stats.averageRunTime)
				: "-";
		this.addText(`平均プレイ時間: ${avgTimeStr}`, leftX, y, valueStyle);
		y += LINE_HEIGHT;

		return y;
	}

	/**
	 * カード使用ランキングを描画
	 */
	private renderCardUsageRanking(
		ranking: { cardType: string; count: number }[],
		x: number,
		startY: number,
	): number {
		const headerStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: UI_COLOR_GOLD,
			fontWeight: "bold" as const,
		};
		const itemStyle = {
			fontSize: 13,
			fontFamily: "sans-serif",
			fill: 0xdddddd,
		};

		let y = startY;
		this.addText("カード使用回数", x, y, headerStyle);
		y += LINE_HEIGHT + 2;

		for (const entry of ranking) {
			const cardType = entry.cardType as keyof typeof CARD_TYPE_NAME;
			const symbol = CARD_TYPE_SYMBOL[cardType] ?? "";
			const name = CARD_TYPE_NAME[cardType] ?? entry.cardType;
			this.addText(`${symbol} ${name}: ${entry.count}回`, x + 8, y, itemStyle);
			y += LINE_HEIGHT;
		}

		return y;
	}

	/**
	 * 死因ランキングを描画
	 */
	private renderDeathCauseRanking(
		ranking: { cause: DeathCause; count: number }[],
		x: number,
		startY: number,
	): number {
		const headerStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: UI_COLOR_GOLD,
			fontWeight: "bold" as const,
		};
		const itemStyle = {
			fontSize: 13,
			fontFamily: "sans-serif",
			fill: 0xdddddd,
		};

		let y = startY;
		this.addText("死因", x, y, headerStyle);
		y += LINE_HEIGHT + 2;

		for (const entry of ranking) {
			const label = DEATH_CAUSE_LABEL[entry.cause] ?? entry.cause;
			this.addText(`${label}: ${entry.count}回`, x + 8, y, itemStyle);
			y += LINE_HEIGHT;
		}

		return y;
	}

	/**
	 * 敵タイプ別死因ランキングを描画
	 */
	private renderEnemyTypeDeathRanking(
		ranking: { enemyType: EnemyType; count: number }[],
		x: number,
		startY: number,
	): number {
		const headerStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: UI_COLOR_GOLD,
			fontWeight: "bold" as const,
		};
		const itemStyle = {
			fontSize: 13,
			fontFamily: "sans-serif",
			fill: 0xdddddd,
		};

		let y = startY;
		this.addText("敵タイプ別死因", x, y, headerStyle);
		y += LINE_HEIGHT + 2;

		for (const entry of ranking) {
			const label = ENEMY_TYPE_LABEL[entry.enemyType] ?? entry.enemyType;
			this.addText(`${label}: ${entry.count}回`, x + 8, y, itemStyle);
			y += LINE_HEIGHT;
		}

		return y;
	}

	/**
	 * 到達階層ヒストグラムを描画
	 */
	private renderHistogram(
		distribution: Map<number, number>,
		x: number,
		startY: number,
		availableWidth: number,
	): void {
		const headerStyle = {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: UI_COLOR_GOLD,
			fontWeight: "bold" as const,
		};

		this.addText("到達階層分布", x, startY, headerStyle);

		const maxFloor = Math.max(...distribution.keys());
		const maxCount = Math.max(...distribution.values());
		if (maxCount === 0) return;

		const barY = startY + LINE_HEIGHT + 8;

		// 利用可能な幅からバー幅を動的計算
		const totalBars = maxFloor;
		const barStep = Math.min(
			HISTOGRAM_BAR_WIDTH + HISTOGRAM_BAR_GAP,
			availableWidth / totalBars,
		);
		const barWidth = Math.max(4, barStep - HISTOGRAM_BAR_GAP);

		const graphics = new Graphics();

		for (let floor = 1; floor <= maxFloor; floor++) {
			const count = distribution.get(floor) ?? 0;
			const barHeight =
				maxCount > 0 ? (count / maxCount) * HISTOGRAM_MAX_HEIGHT : 0;
			const barX = x + (floor - 1) * barStep;

			if (barHeight > 0) {
				graphics.rect(
					barX,
					barY + HISTOGRAM_MAX_HEIGHT - barHeight,
					barWidth,
					barHeight,
				);
				graphics.fill(HISTOGRAM_BAR_COLOR);
			}

			// 階層ラベル（5の倍数のみ表示、数が多い場合の視認性向上）
			if (floor % 5 === 0 || floor === 1 || floor === maxFloor) {
				const label = new Text({
					text: `${floor}`,
					style: {
						fontSize: 10,
						fontFamily: "sans-serif",
						fill: HISTOGRAM_LABEL_COLOR,
					},
				});
				label.anchor.set(0.5, 0);
				label.x = barX + barWidth / 2;
				label.y = barY + HISTOGRAM_MAX_HEIGHT + 4;
				this.container.addChild(label);
			}
		}

		this.container.addChild(graphics);
	}

	/**
	 * 下部ボタン群を描画
	 */
	private renderButtons(screenWidth: number, screenHeight: number): void {
		const buttonY = screenHeight - 60;
		const gap = 16;

		// データリセットボタン
		const resetButton = this.createResetButton();
		resetButton.x = screenWidth / 2 - RESET_BUTTON_WIDTH - gap / 2;
		resetButton.y = buttonY;
		this.container.addChild(resetButton);

		// 閉じるボタン
		const closeButton = this.createCloseButton(
			screenWidth / 2 + gap / 2 + CLOSE_BUTTON_WIDTH / 2,
		);
		closeButton.y = buttonY;
		this.container.addChild(closeButton);
	}

	/**
	 * 閉じるボタンを生成
	 */
	private createCloseButton(centerX: number): Container {
		const button = new Container();
		button.x = centerX - CLOSE_BUTTON_WIDTH / 2;

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
	 * データリセットボタンを生成
	 */
	private createResetButton(): Container {
		const button = new Container();

		const bg = new Graphics();
		drawRoundedRect(
			bg,
			RESET_BUTTON_WIDTH,
			CLOSE_BUTTON_HEIGHT,
			CLOSE_BUTTON_RADIUS,
			RESET_BUTTON_COLORS.bg,
			{ color: RESET_BUTTON_COLORS.border, width: 1 },
		);
		button.addChild(bg);

		const text = new Text({
			text: "データリセット",
			style: {
				fontSize: 13,
				fontFamily: "sans-serif",
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		text.anchor.set(0.5);
		text.x = RESET_BUTTON_WIDTH / 2;
		text.y = CLOSE_BUTTON_HEIGHT / 2;
		button.addChild(text);

		makeInteractive(button, () => {
			this.onReset?.();
		});

		return button;
	}

	/**
	 * テキスト要素を追加するヘルパー
	 */
	private addText(
		content: string,
		x: number,
		y: number,
		style: {
			fontSize: number;
			fontFamily: string;
			fill: number;
			fontWeight?: "bold" | "normal";
			align?: "left" | "center" | "right" | "justify";
		},
	): Text {
		const text = new Text({ text: content, style });
		text.x = x;
		text.y = y;
		this.container.addChild(text);
		return text;
	}
}
