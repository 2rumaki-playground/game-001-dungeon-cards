/**
 * キャラクターカードUI
 * 行動ログパネル下部に性格アイコン・性格名・発話テキストを表示する
 */

import { Container, Graphics, Text } from "pixi.js";
import {
	CHARACTER_CARD_HEIGHT,
	DEFAULT_PERSONALITY,
	LOG_AREA_WIDTH,
	PERSONALITY_DESCRIPTION,
	PERSONALITY_LABEL,
	PERSONALITY_SYMBOL,
} from "../constants";
import type { Personality, SpeechLogEntry } from "../types";
import { drawRoundedRect } from "./graphicsHelpers";
import { CARD_RADIUS } from "./handRenderer";

const CARD_PADDING = 8;
const CARD_BACKGROUND_ALPHA = 0.95;
const CARD_BORDER_WIDTH = 2;
const SPEECH_TEXT_COLOR = 0xeeeef0;
const ICON_FONT_SIZE = 18;

export const PERSONALITY_CARD_COLORS: Record<
	Personality,
	{ bg: number; border: number }
> = {
	brave: { bg: 0x3a2020, border: 0xca5a4a },
	cautious: { bg: 0x1e2e3e, border: 0x4a8aba },
	cheerful: { bg: 0x3a3a1e, border: 0xc8a840 },
	stoic: { bg: 0x2a2a2e, border: 0x7a7a8a },
	curious: { bg: 0x2a2a3a, border: 0x8a6aba },
};
const LABEL_FONT_SIZE = 13;
const SPEECH_FONT_SIZE = 13;
const TOOLTIP_PADDING = 6;
const TOOLTIP_BACKGROUND_COLOR = 0x222222;
const TOOLTIP_BACKGROUND_ALPHA = 0.95;
const TOOLTIP_BORDER_COLOR = 0x666666;
const TOOLTIP_FONT_SIZE = 12;
const TOOLTIP_MIN_WIDTH = 80;

/**
 * キャラクターカードレンダラー
 */
export class CharacterCardRenderer {
	private container: Container;
	private background: Graphics;
	private iconText: Text;
	private labelText: Text;
	private speechText: Text;
	private tooltipContainer: Container;
	private lastPersonality: Personality | null = null;

	constructor() {
		this.container = new Container();
		this.container.eventMode = "static";

		// 背景（デフォルト色で初期描画、render()で性格別に上書き）
		this.background = new Graphics();
		const defaultColors = PERSONALITY_CARD_COLORS[DEFAULT_PERSONALITY];
		drawRoundedRect(
			this.background,
			LOG_AREA_WIDTH,
			CHARACTER_CARD_HEIGHT,
			CARD_RADIUS,
			{ color: defaultColors.bg, alpha: CARD_BACKGROUND_ALPHA },
			{ color: defaultColors.border, width: CARD_BORDER_WIDTH },
		);
		this.container.addChild(this.background);

		// アイコン
		this.iconText = new Text({
			text: "",
			style: {
				fontSize: ICON_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: 0xffffff,
			},
		});
		this.iconText.x = CARD_PADDING;
		this.iconText.y = CARD_PADDING;
		this.container.addChild(this.iconText);

		// 性格名ラベル
		this.labelText = new Text({
			text: "",
			style: {
				fontSize: LABEL_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: PERSONALITY_CARD_COLORS[DEFAULT_PERSONALITY].border,
			},
		});
		this.labelText.x = CARD_PADDING + ICON_FONT_SIZE + 8;
		this.labelText.y = CARD_PADDING + 2;
		this.container.addChild(this.labelText);

		// 発話テキスト
		this.speechText = new Text({
			text: "",
			style: {
				fontSize: SPEECH_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: SPEECH_TEXT_COLOR,
				wordWrap: true,
				wordWrapWidth: LOG_AREA_WIDTH - CARD_PADDING * 2,
			},
		});
		this.speechText.x = CARD_PADDING;
		this.speechText.y = CARD_PADDING + ICON_FONT_SIZE + 8;
		this.container.addChild(this.speechText);

		// ツールチップ（カード上方に表示）
		this.tooltipContainer = new Container();
		this.tooltipContainer.visible = false;
		this.container.addChild(this.tooltipContainer);

		// ホバーイベント
		this.container.on("pointerover", () => {
			this.tooltipContainer.visible = true;
		});
		this.container.on("pointerout", () => {
			this.tooltipContainer.visible = false;
		});
	}

	getContainer(): Container {
		return this.container;
	}

	render(personality: Personality, speechLog: SpeechLogEntry | null): void {
		this.iconText.text = PERSONALITY_SYMBOL[personality];
		this.labelText.text = PERSONALITY_LABEL[personality];

		if (speechLog) {
			this.speechText.text = `「${speechLog.message}」`;
			this.speechText.visible = true;
		} else {
			this.speechText.text = "";
			this.speechText.visible = false;
		}

		if (personality !== this.lastPersonality) {
			const colors = PERSONALITY_CARD_COLORS[personality];
			this.background.clear();
			drawRoundedRect(
				this.background,
				LOG_AREA_WIDTH,
				CHARACTER_CARD_HEIGHT,
				CARD_RADIUS,
				{ color: colors.bg, alpha: CARD_BACKGROUND_ALPHA },
				{ color: colors.border, width: CARD_BORDER_WIDTH },
			);
			this.labelText.style.fill = colors.border;
			this.buildTooltip(personality);
			this.lastPersonality = personality;
		}
	}

	private buildTooltip(personality: Personality): void {
		const removedChildren = this.tooltipContainer.removeChildren();
		for (const child of removedChildren) {
			child.destroy();
		}

		const label = PERSONALITY_LABEL[personality];
		const description = PERSONALITY_DESCRIPTION[personality];
		const tooltipText = new Text({
			text: `${label}：${description}`,
			style: {
				fontSize: TOOLTIP_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: 0xdddddd,
			},
		});
		tooltipText.x = TOOLTIP_PADDING;
		tooltipText.y = TOOLTIP_PADDING;

		const safeWidth = (t: Text): number => {
			try {
				const bounds = t.getLocalBounds();
				return bounds?.width ?? 0;
			} catch {
				return 0;
			}
		};
		const safeHeight = (t: Text): number => {
			try {
				const bounds = t.getLocalBounds();
				return bounds?.height ?? 0;
			} catch {
				return 0;
			}
		};
		const bg = new Graphics();
		const textWidth = Math.max(TOOLTIP_MIN_WIDTH, safeWidth(tooltipText));
		const tooltipWidth = textWidth + TOOLTIP_PADDING * 2;
		const textHeight = Math.max(TOOLTIP_FONT_SIZE, safeHeight(tooltipText));
		const tooltipHeight = textHeight + TOOLTIP_PADDING * 2;
		bg.roundRect(0, 0, tooltipWidth, tooltipHeight, 3);
		bg.fill({
			color: TOOLTIP_BACKGROUND_COLOR,
			alpha: TOOLTIP_BACKGROUND_ALPHA,
		});
		bg.stroke({ color: TOOLTIP_BORDER_COLOR, width: 1 });

		this.tooltipContainer.addChild(bg);
		this.tooltipContainer.addChild(tooltipText);
		this.tooltipContainer.x = 0;
		this.tooltipContainer.y = -tooltipHeight - 4;
	}

	clear(): void {
		this.iconText.text = "";
		this.labelText.text = "";
		this.speechText.text = "";
		this.speechText.visible = false;

		const removedChildren = this.tooltipContainer.removeChildren();
		for (const child of removedChildren) {
			child.destroy();
		}

		this.tooltipContainer.visible = false;
		this.lastPersonality = null;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
		this.tooltipContainer.visible = false;
	}
}
