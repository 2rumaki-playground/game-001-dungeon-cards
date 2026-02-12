/**
 * 敵情報ツールチップ
 * 敵ホバー時にタイプ名・HP・攻撃力を表示
 */

import { Container, Graphics, Text } from "pixi.js";
import { BOSS_SKILL, ENEMY_PARAMS, ENEMY_TYPE_LABEL } from "../constants";
import type { Enemy } from "../types";
import { drawRoundedRect } from "./graphicsHelpers";

/** ツールチップの枠線色 */
const TOOLTIP_BORDER_COLOR = 0x666666;

/** ツールチップの枠線幅 */
const TOOLTIP_BORDER_WIDTH = 1;

/** ツールチップの角丸半径 */
const TOOLTIP_RADIUS = 4;

/** ツールチップの内側パディング */
const TOOLTIP_PADDING = 6;

/** ツールチップのフォントサイズ */
const TOOLTIP_FONT_SIZE = 12;

/** ツールチップの行間 */
const TOOLTIP_LINE_HEIGHT = 16;

/** ツールチップの最小幅 */
const TOOLTIP_MIN_WIDTH = 80;

/** ツールチップの背景透明度 */
const TOOLTIP_BG_ALPHA = 0.9;

/** ツールチップの背景色 */
const TOOLTIP_BG_COLOR = 0x1a1a1a;

/** ツールチップとセルの間隔 */
const TOOLTIP_GAP = 4;

/**
 * 敵情報ツールチップ
 */
export class EnemyTooltip {
	private container: Container;
	private bg: Graphics;
	private typeText: Text;
	private hpText: Text;
	private atkText: Text;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
		this.container.eventMode = "none";

		this.bg = new Graphics();
		this.container.addChild(this.bg);

		const textStyle = {
			fontSize: TOOLTIP_FONT_SIZE,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		};

		this.typeText = new Text({ text: "", style: textStyle });
		this.typeText.x = TOOLTIP_PADDING;
		this.typeText.y = TOOLTIP_PADDING;
		this.container.addChild(this.typeText);

		this.hpText = new Text({ text: "", style: textStyle });
		this.hpText.x = TOOLTIP_PADDING;
		this.hpText.y = TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT;
		this.container.addChild(this.hpText);

		this.atkText = new Text({ text: "", style: textStyle });
		this.atkText.x = TOOLTIP_PADDING;
		this.atkText.y = TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT * 2;
		this.container.addChild(this.atkText);
	}

	getContainer(): Container {
		return this.container;
	}

	/**
	 * ツールチップを表示
	 */
	show(enemy: Enemy, pixelX: number, pixelY: number): void {
		const label = ENEMY_TYPE_LABEL[enemy.type];
		const params = ENEMY_PARAMS[enemy.type];
		const attackDamage = enemy.enraged
			? params.attackDamage + BOSS_SKILL.enrageBonusDamage
			: params.attackDamage;

		this.typeText.text = label;
		this.hpText.text = `HP: ${enemy.hp}/${enemy.maxHp}`;
		this.atkText.text = `ATK: ${attackDamage}`;

		const safeWidth = (t: Text): number => {
			try {
				return t.width;
			} catch {
				return 0;
			}
		};
		const maxTextWidth = Math.max(
			TOOLTIP_MIN_WIDTH,
			safeWidth(this.typeText),
			safeWidth(this.hpText),
			safeWidth(this.atkText),
		);
		const bgWidth = maxTextWidth + TOOLTIP_PADDING * 2;
		const bgHeight = TOOLTIP_LINE_HEIGHT * 3 + TOOLTIP_PADDING * 2;

		this.bg.clear();
		drawRoundedRect(
			this.bg,
			bgWidth,
			bgHeight,
			TOOLTIP_RADIUS,
			{ color: TOOLTIP_BG_COLOR, alpha: TOOLTIP_BG_ALPHA },
			{ color: TOOLTIP_BORDER_COLOR, width: TOOLTIP_BORDER_WIDTH },
		);

		this.container.x = pixelX;
		this.container.y = pixelY - bgHeight - TOOLTIP_GAP;
		this.container.visible = true;
	}

	/**
	 * ツールチップを非表示
	 */
	hide(): void {
		this.container.visible = false;
	}

	/**
	 * 表示中かどうか
	 */
	isVisible(): boolean {
		return this.container.visible;
	}
}
