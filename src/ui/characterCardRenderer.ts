/**
 * キャラクターカードUI
 * 行動ログパネル下部に性格アイコン・性格名・発話テキストを表示する
 */

import { Container, Graphics, Text } from "pixi.js";
import {
	CHARACTER_CARD_HEIGHT,
	LOG_AREA_WIDTH,
	PERSONALITY_DESCRIPTION,
	PERSONALITY_LABEL,
	PERSONALITY_SYMBOL,
} from "../constants";
import type { Personality, SpeechLogEntry } from "../types";

const CARD_PADDING = 8;
const CARD_BACKGROUND_COLOR = 0x2a3a2a;
const CARD_BACKGROUND_ALPHA = 0.9;
const CARD_BORDER_COLOR = 0x4a6a4a;
const ICON_FONT_SIZE = 18;
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

	constructor() {
		this.container = new Container();
		this.container.eventMode = "static";

		// 背景
		this.background = new Graphics();
		this.background.roundRect(0, 0, LOG_AREA_WIDTH, CHARACTER_CARD_HEIGHT, 4);
		this.background.fill({
			color: CARD_BACKGROUND_COLOR,
			alpha: CARD_BACKGROUND_ALPHA,
		});
		this.background.stroke({ color: CARD_BORDER_COLOR, width: 1 });
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
				fill: 0xaaccaa,
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
				fill: 0xccddcc,
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

		this.buildTooltip(personality);
	}

	private buildTooltip(personality: Personality): void {
		this.tooltipContainer.removeChildren();

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
		const bg = new Graphics();
		const textWidth = Math.max(TOOLTIP_MIN_WIDTH, safeWidth(tooltipText));
		const tooltipWidth = textWidth + TOOLTIP_PADDING * 2;
		const tooltipHeight = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING * 2;
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
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}
}
