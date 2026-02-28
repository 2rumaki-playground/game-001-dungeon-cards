/**
 * 行動ログUI
 * 直近の行動履歴を表示する
 * @see docs/spec/mvp/rules.md 行動ログ
 */

import { Container, Graphics, Text } from "pixi.js";
import { COLORS, LOG_AREA_WIDTH } from "../constants";
import type { ActionLogEntry, LogActor } from "../types";
import { makeInteractive } from "./graphicsHelpers";

/** ログ表示エリアの設定 */
const LOG_AREA_PADDING = 8;
const LOG_FONT_SIZE = 12;
const LOG_LINE_HEIGHT = 18;
const LOG_BACKGROUND_COLOR = 0x2a2a2a;
const LOG_BACKGROUND_ALPHA = 0.9;
const LOG_BORDER_COLOR = 0x4a4a4a;

/** 主体カラム幅 */
const ACTOR_COLUMN_WIDTH = 24;

/** ログUIに表示する最大件数（画面に収まる範囲） */
const MAX_DISPLAY_ENTRIES = 15;

/** 最小化時のヘッダー高さ */
const HEADER_HEIGHT = 32;

/** 主体ラベルを取得 */
export function getActorLabel(actor: LogActor): string {
	switch (actor) {
		case "player":
			return "自";
		case "enemy":
			return "敵";
		default:
			return "他";
	}
}

/** 主体カラーを取得 */
function getActorColor(actor: LogActor): number {
	switch (actor) {
		case "player":
			return COLORS.player;
		case "enemy":
			return COLORS.enemy;
		default:
			return COLORS.system;
	}
}

/**
 * 行動ログレンダラー
 */
export class ActionLogRenderer {
	private container: Container;
	private background: Graphics;
	private titleText: Text;
	private actorLabels: Text[];
	private logTexts: Text[];
	private height: number;
	private minimized: boolean;
	private toggleButtonText: Text;
	private lastEntries: ActionLogEntry[];

	constructor(height: number) {
		this.height = height;
		this.container = new Container();
		this.actorLabels = [];
		this.logTexts = [];
		this.minimized = false;
		this.lastEntries = [];

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

		// ログテキスト用のコンテナを事前に作成（主体ラベル+メッセージ）
		for (let i = 0; i < MAX_DISPLAY_ENTRIES; i++) {
			const actorLabel = new Text({
				text: "",
				style: {
					fontSize: LOG_FONT_SIZE,
					fontFamily: "sans-serif",
					fill: COLORS.system,
				},
			});
			actorLabel.x = LOG_AREA_PADDING;
			actorLabel.y = LOG_AREA_PADDING + 24 + i * LOG_LINE_HEIGHT;
			this.container.addChild(actorLabel);
			this.actorLabels.push(actorLabel);

			const text = new Text({
				text: "",
				style: {
					fontSize: LOG_FONT_SIZE,
					fontFamily: "sans-serif",
					fill: 0xaaaaaa,
					wordWrap: true,
					wordWrapWidth:
						LOG_AREA_WIDTH - LOG_AREA_PADDING * 2 - ACTOR_COLUMN_WIDTH,
				},
			});
			text.x = LOG_AREA_PADDING + ACTOR_COLUMN_WIDTH;
			text.y = LOG_AREA_PADDING + 24 + i * LOG_LINE_HEIGHT;
			this.container.addChild(text);
			this.logTexts.push(text);
		}

		// トグルボタン
		const toggleButton = new Container();
		this.toggleButtonText = new Text({
			text: "▲",
			style: {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: 0xcccccc,
			},
		});
		toggleButton.addChild(this.toggleButtonText);
		toggleButton.x = LOG_AREA_WIDTH - LOG_AREA_PADDING - 16;
		toggleButton.y = LOG_AREA_PADDING;
		makeInteractive(toggleButton, () => this.toggle());
		this.container.addChild(toggleButton);
	}

	/**
	 * 背景を描画
	 */
	private drawBackground(): void {
		const bgHeight = this.minimized ? HEADER_HEIGHT : this.height;
		this.background.clear();
		this.background.roundRect(0, 0, LOG_AREA_WIDTH, bgHeight, 4);
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
		this.lastEntries = actionLog;

		if (this.minimized) {
			return;
		}

		// 最新のログを上から表示（表示件数制限）
		const displayEntries = actionLog.slice(0, MAX_DISPLAY_ENTRIES);

		for (let i = 0; i < MAX_DISPLAY_ENTRIES; i++) {
			const actorLabel = this.actorLabels[i];
			const text = this.logTexts[i];
			if (i < displayEntries.length) {
				const entry = displayEntries[i];
				const actor = entry.actor ?? "system";
				actorLabel.text = getActorLabel(actor);
				actorLabel.style.fill = getActorColor(actor);
				actorLabel.visible = true;
				text.text = entry.message;
				text.visible = true;
			} else {
				actorLabel.text = "";
				actorLabel.visible = false;
				text.text = "";
				text.visible = false;
			}
		}
	}

	/**
	 * クリア
	 */
	clear(): void {
		for (const label of this.actorLabels) {
			label.text = "";
			label.visible = false;
		}
		for (const text of this.logTexts) {
			text.text = "";
			text.visible = false;
		}
	}

	/**
	 * 高さ変更に対応
	 */
	resize(height: number): void {
		this.height = height;
		this.drawBackground();
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

	/**
	 * 最小化/展開を切り替え
	 */
	toggle(): void {
		this.minimized = !this.minimized;
		this.toggleButtonText.text = this.minimized ? "▼" : "▲";
		this.drawBackground();

		if (this.minimized) {
			for (const label of this.actorLabels) {
				label.visible = false;
			}
			for (const text of this.logTexts) {
				text.visible = false;
			}
		} else {
			this.render(this.lastEntries);
		}
	}

	/**
	 * 最小化状態を返す
	 */
	isMinimized(): boolean {
		return this.minimized;
	}
}
