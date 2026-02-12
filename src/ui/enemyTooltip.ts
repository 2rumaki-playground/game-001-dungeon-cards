/**
 * 敵情報ツールチップ
 * 敵ホバー時にタイプ名・HP・攻撃力を表示
 */

import { Container, Graphics, Text } from "pixi.js";
import {
	BOSS_SKILL,
	CELL_SIZE,
	ENEMY_PARAMS,
	ENEMY_TYPE_LABEL,
} from "../constants";
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

/** ツールチップのテキスト領域の最小幅 */
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
	 * @param viewport ビューポートのピクセルサイズ
	 * @param containerTransform 親コンテナの変換情報（カメラオフセット・ズーム）
	 */
	show(
		enemy: Enemy,
		pixelX: number,
		pixelY: number,
		viewport: { width: number; height: number } = {
			width: Number.POSITIVE_INFINITY,
			height: Number.POSITIVE_INFINITY,
		},
		containerTransform: { x: number; y: number; scale: number } = {
			x: 0,
			y: 0,
			scale: 1,
		},
	): void {
		const label = ENEMY_TYPE_LABEL[enemy.type];
		const params = ENEMY_PARAMS[enemy.type];
		const attackDamage = enemy.enraged
			? params.attackDamage + BOSS_SKILL.enrageBonusDamage
			: params.attackDamage;

		this.typeText.text = label;
		this.hpText.text = `HP: ${enemy.hp}/${enemy.maxHp}`;
		this.atkText.text = `ATK: ${attackDamage}`;

		// Text.width が環境によって例外を投げるケースがあるため、
		// より安全な bounds ベースの計測を行う。
		// それでも失敗した場合は、開発時にのみ警告ログを出しつつ 0 を返す。
		const safeWidth = (t: Text): number => {
			try {
				const bounds = t.getLocalBounds();
				return bounds?.width ?? 0;
			} catch (e) {
				// 開発時に描画環境の不具合を検知できるよう、例外をサイレントに握りつぶさない。
				if (import.meta.env.DEV) {
					console.warn("[EnemyTooltip] Text width measurement failed", e);
				}
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

		const { x: cx, y: cy, scale } = containerTransform;

		// X方向: スクリーン座標でビューポート左右にはみ出さないようにクランプ
		const screenX = pixelX * scale + cx;
		const screenBgWidth = bgWidth * scale;
		const maxScreenX = viewport.width - screenBgWidth;
		const clampedScreenX = Math.max(0, Math.min(screenX, maxScreenX));
		const tooltipX = (clampedScreenX - cx) / scale;

		// Y方向: スクリーン座標で判定し、基本は敵の上側、はみ出す場合は下側に出す
		const screenY = pixelY * scale + cy;
		const screenBgHeight = bgHeight * scale;
		const screenCellSize = CELL_SIZE * scale;
		const screenGap = TOOLTIP_GAP * scale;
		const targetScreenYAbove = screenY - screenBgHeight - screenGap;
		let tooltipScreenY =
			targetScreenYAbove >= 0
				? targetScreenYAbove
				: screenY + screenCellSize + screenGap;

		// Y方向: ツールチップ全体がビューポート外にはみ出さないようにクランプ
		const maxTooltipScreenY = Math.max(0, viewport.height - screenBgHeight);
		if (tooltipScreenY < 0) {
			tooltipScreenY = 0;
		} else if (tooltipScreenY > maxTooltipScreenY) {
			tooltipScreenY = maxTooltipScreenY;
		}
		const tooltipY = (tooltipScreenY - cy) / scale;

		this.container.x = tooltipX;
		this.container.y = tooltipY;
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
