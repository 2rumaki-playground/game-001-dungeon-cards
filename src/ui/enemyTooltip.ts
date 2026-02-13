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
import type { EnemyAiAnalysis } from "../game/enemyAiAnalysis";
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

/** デバッグ情報の区切り線色 */
const DEBUG_SEPARATOR_COLOR = 0x555555;

/** デバッグ情報のテキスト色 */
const DEBUG_TEXT_COLOR = 0xbbbbbb;

/** デバッグ情報のフォントサイズ */
const DEBUG_FONT_SIZE = 10;

/**
 * 敵情報ツールチップ
 */
export class EnemyTooltip {
	private container: Container;
	private bg: Graphics;
	private typeText: Text;
	private hpText: Text;
	private atkText: Text;
	private debugTexts: Text[] = [];
	private debugSeparator: Graphics;
	private cachedBgWidth = 0;
	private cachedBgHeight = 0;

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

		this.debugSeparator = new Graphics();
		this.container.addChild(this.debugSeparator);
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
		debugInfo?: EnemyAiAnalysis,
	): void {
		const label = ENEMY_TYPE_LABEL[enemy.type];
		const params = ENEMY_PARAMS[enemy.type];
		const attackDamage = enemy.enraged
			? params.attackDamage + BOSS_SKILL.enrageBonusDamage
			: params.attackDamage;

		this.typeText.text = label;
		this.hpText.text = `HP: ${enemy.hp}/${enemy.maxHp}`;
		this.atkText.text = `ATK: ${attackDamage}`;

		// 既存のデバッグテキストを削除
		this.clearDebugTexts();

		// デバッグ情報を追加
		let debugLineCount = 0;
		const separatorY = TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT * 3 + 2;
		if (debugInfo) {
			const debugLines = [
				`移動:${params.moveDistance} 索敵:${params.senseRange}`,
				`判断: ${debugInfo.decision.reason}`,
			];
			const debugTextStyle = {
				fontSize: DEBUG_FONT_SIZE,
				fontFamily: "sans-serif",
				fill: DEBUG_TEXT_COLOR,
			};

			for (let i = 0; i < debugLines.length; i++) {
				const text = new Text({
					text: debugLines[i],
					style: debugTextStyle,
				});
				text.x = TOOLTIP_PADDING;
				text.y = separatorY + 4 + i * (TOOLTIP_LINE_HEIGHT - 2);
				this.container.addChild(text);
				this.debugTexts.push(text);
			}
			debugLineCount = debugLines.length;
		} else {
			this.debugSeparator.clear();
		}

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
		const allTexts = [
			this.typeText,
			this.hpText,
			this.atkText,
			...this.debugTexts,
		];
		const maxTextWidth = Math.max(
			TOOLTIP_MIN_WIDTH,
			...allTexts.map(safeWidth),
		);
		this.cachedBgWidth = maxTextWidth + TOOLTIP_PADDING * 2;

		// 区切り線を背景幅に合わせて描画（幅確定後）
		if (debugInfo) {
			this.debugSeparator.clear();
			this.debugSeparator.moveTo(TOOLTIP_PADDING, separatorY);
			this.debugSeparator.lineTo(
				this.cachedBgWidth - TOOLTIP_PADDING,
				separatorY,
			);
			this.debugSeparator.stroke({
				color: DEBUG_SEPARATOR_COLOR,
				width: 1,
			});
		}

		const baseLines = 3;
		const debugExtraHeight =
			debugLineCount > 0 ? 6 + debugLineCount * (TOOLTIP_LINE_HEIGHT - 2) : 0;
		this.cachedBgHeight =
			TOOLTIP_LINE_HEIGHT * baseLines + TOOLTIP_PADDING * 2 + debugExtraHeight;

		this.bg.clear();
		drawRoundedRect(
			this.bg,
			this.cachedBgWidth,
			this.cachedBgHeight,
			TOOLTIP_RADIUS,
			{ color: TOOLTIP_BG_COLOR, alpha: TOOLTIP_BG_ALPHA },
			{ color: TOOLTIP_BORDER_COLOR, width: TOOLTIP_BORDER_WIDTH },
		);

		this.applyPosition(pixelX, pixelY, viewport, containerTransform);
		this.container.visible = true;
	}

	private clearDebugTexts(): void {
		for (const text of this.debugTexts) {
			this.container.removeChild(text);
			text.destroy();
		}
		this.debugTexts = [];
	}

	/**
	 * 内容は据え置きで座標だけ再計算
	 * カメラドラッグ/ズーム中の高頻度呼び出し向け
	 */
	updatePosition(
		pixelX: number,
		pixelY: number,
		viewport: { width: number; height: number },
		containerTransform: { x: number; y: number; scale: number },
	): void {
		if (!this.container.visible) return;
		this.applyPosition(pixelX, pixelY, viewport, containerTransform);
	}

	private applyPosition(
		pixelX: number,
		pixelY: number,
		viewport: { width: number; height: number },
		containerTransform: { x: number; y: number; scale: number },
	): void {
		const { x: cx, y: cy, scale } = containerTransform;

		// X方向: スクリーン座標でビューポート左右にはみ出さないようにクランプ
		const screenX = pixelX * scale + cx;
		const screenBgWidth = this.cachedBgWidth * scale;
		const maxScreenX = viewport.width - screenBgWidth;
		const clampedScreenX = Math.max(0, Math.min(screenX, maxScreenX));
		const tooltipX = (clampedScreenX - cx) / scale;

		// Y方向: スクリーン座標で判定し、基本は敵の上側、はみ出す場合は下側に出す
		const screenY = pixelY * scale + cy;
		const screenBgHeight = this.cachedBgHeight * scale;
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
