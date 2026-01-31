/**
 * 行動ログUI
 * 直近の行動履歴を表示する
 * @see docs/spec/mvp/rules.md 行動ログ
 */

import { Container, Graphics, Text } from "pixi.js";
import { LOG_AREA_WIDTH } from "../constants";
import type { ActionLogEntry } from "../types";

/** ログ表示エリアの設定 */
const LOG_AREA_PADDING = 8;
const LOG_FONT_SIZE = 12;
const LOG_LINE_HEIGHT = 18;
const LOG_BACKGROUND_COLOR = 0x2a2a2a;
const LOG_BACKGROUND_ALPHA = 0.9;
const LOG_BORDER_COLOR = 0x4a4a4a;

/** ログUIに表示する最大件数（画面に収まる範囲） */
const MAX_DISPLAY_ENTRIES = 15;

/**
 * 行動ログレンダラー
 */
export class ActionLogRenderer {
	private container: Container;
	private background: Graphics;
	private titleText: Text;
	private logTexts: Text[];
	private height: number;

	constructor(height: number) {
		this.height = height;
		this.container = new Container();
		this.logTexts = [];

		// 背景
		this.background = new Graphics();
		this.drawBackground();
		this.container.addChild(this.background);

		// タイトル
		this.titleText = new Text({
			text: "行動ログ",
			style: {
				fontSize: 14,
				fontFamily: "sans-serif",
				fill: 0xcccccc,
			},
		});
		this.titleText.x = LOG_AREA_PADDING;
		this.titleText.y = LOG_AREA_PADDING;
		this.container.addChild(this.titleText);

		// ログテキスト用のコンテナを事前に作成
		for (let i = 0; i < MAX_DISPLAY_ENTRIES; i++) {
			const text = new Text({
				text: "",
				style: {
					fontSize: LOG_FONT_SIZE,
					fontFamily: "sans-serif",
					fill: 0xaaaaaa,
					wordWrap: true,
					wordWrapWidth: LOG_AREA_WIDTH - LOG_AREA_PADDING * 2,
				},
			});
			text.x = LOG_AREA_PADDING;
			text.y = LOG_AREA_PADDING + 24 + i * LOG_LINE_HEIGHT;
			this.container.addChild(text);
			this.logTexts.push(text);
		}
	}

	/**
	 * 背景を描画
	 */
	private drawBackground(): void {
		this.background.clear();
		this.background.roundRect(0, 0, LOG_AREA_WIDTH, this.height, 4);
		this.background.fill({
			color: LOG_BACKGROUND_COLOR,
			alpha: LOG_BACKGROUND_ALPHA,
		});
		this.background.stroke({ color: LOG_BORDER_COLOR, width: 1 });
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * ログエリアの幅を取得
	 */
	getWidth(): number {
		return LOG_AREA_WIDTH;
	}

	/**
	 * 行動ログを描画
	 */
	render(actionLog: ActionLogEntry[]): void {
		// 最新のログを上から表示（表示件数制限）
		const displayEntries = actionLog.slice(0, MAX_DISPLAY_ENTRIES);

		for (let i = 0; i < MAX_DISPLAY_ENTRIES; i++) {
			const text = this.logTexts[i];
			if (i < displayEntries.length) {
				text.text = displayEntries[i].message;
				text.visible = true;
			} else {
				text.text = "";
				text.visible = false;
			}
		}
	}

	/**
	 * クリア
	 */
	clear(): void {
		for (const text of this.logTexts) {
			text.text = "";
			text.visible = false;
		}
	}

	/**
	 * 表示
	 */
	show(): void {
		this.container.visible = true;
	}

	/**
	 * 非表示
	 */
	hide(): void {
		this.container.visible = false;
	}
}
