/**
 * キャラクター発話バナーUI
 * 行動ログパネル下部に最新1件の発話を表示する
 */

import { Container, Graphics, Text } from "pixi.js";
import { LOG_AREA_WIDTH, SPEECH_BANNER_HEIGHT } from "../constants";
import type { SpeechLogEntry } from "../types";

const BANNER_PADDING = 8;
const BANNER_BACKGROUND_COLOR = 0x2a3a2a;
const BANNER_BACKGROUND_ALPHA = 0.9;
const BANNER_BORDER_COLOR = 0x4a6a4a;
const BANNER_FONT_SIZE = 13;

/**
 * 発話バナーレンダラー
 */
export class SpeechBannerRenderer {
	private container: Container;
	private background: Graphics;
	private messageText: Text;

	constructor() {
		this.container = new Container();

		// 背景
		this.background = new Graphics();
		this.background.roundRect(0, 0, LOG_AREA_WIDTH, SPEECH_BANNER_HEIGHT, 4);
		this.background.fill({
			color: BANNER_BACKGROUND_COLOR,
			alpha: BANNER_BACKGROUND_ALPHA,
		});
		this.background.stroke({ color: BANNER_BORDER_COLOR, width: 1 });
		this.container.addChild(this.background);

		// メッセージテキスト
		this.messageText = new Text({
			text: "",
			style: {
				fontSize: BANNER_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: 0xccddcc,
				wordWrap: true,
				wordWrapWidth: LOG_AREA_WIDTH - BANNER_PADDING * 2,
			},
		});
		this.messageText.x = BANNER_PADDING;
		this.messageText.y = (SPEECH_BANNER_HEIGHT - BANNER_FONT_SIZE) / 2;
		this.container.addChild(this.messageText);
	}

	getContainer(): Container {
		return this.container;
	}

	render(speechLog: SpeechLogEntry | null): void {
		if (speechLog) {
			this.messageText.text = `「${speechLog.message}」`;
			this.messageText.visible = true;
		} else {
			this.messageText.text = "";
			this.messageText.visible = false;
		}
	}

	clear(): void {
		this.messageText.text = "";
		this.messageText.visible = false;
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}
}
