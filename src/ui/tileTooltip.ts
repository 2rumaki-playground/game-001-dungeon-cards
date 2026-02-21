/**
 * 特殊タイル情報ツールチップ
 * タイルホバー時にタイル名と効果を表示
 */

import { Container, Graphics, Text } from "pixi.js";
import { CELL_SIZE, TRAP_DAMAGE, TREASURE_HEAL } from "../constants";
import type { TileType } from "../types";
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

/** タイル種別ごとのツールチップ内容 */
const TILE_TOOLTIP_CONTENT: Partial<
	Record<TileType, { name: string; effect: string }>
> = {
	stairs: { name: "階段", effect: "次の階層へ進む" },
	trap: { name: "罠タイル", effect: `${TRAP_DAMAGE}ダメージを受ける` },
	treasure: { name: "宝箱タイル", effect: `HPを${TREASURE_HEAL}回復` },
	rest_area: { name: "休憩所タイル", effect: "HPを全回復" },
};

/**
 * 特殊タイル情報ツールチップ
 */
export class TileTooltip {
	private container: Container;
	private bg: Graphics;
	private nameText: Text;
	private effectText: Text;
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

		this.nameText = new Text({ text: "", style: textStyle });
		this.nameText.x = TOOLTIP_PADDING;
		this.nameText.y = TOOLTIP_PADDING;
		this.container.addChild(this.nameText);

		this.effectText = new Text({
			text: "",
			style: { ...textStyle, fill: 0xaaaaaa },
		});
		this.effectText.x = TOOLTIP_PADDING;
		this.effectText.y = TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT;
		this.container.addChild(this.effectText);
	}

	getContainer(): Container {
		return this.container;
	}

	/**
	 * ツールチップを表示
	 * @param tileType タイル種別
	 * @param pixelX タイルのピクセルX座標
	 * @param pixelY タイルのピクセルY座標
	 * @param viewport ビューポートのピクセルサイズ
	 * @param containerTransform 親コンテナの変換情報（カメラオフセット・ズーム）
	 */
	show(
		tileType: TileType,
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
		const content = TILE_TOOLTIP_CONTENT[tileType];
		if (!content) return;

		this.nameText.text = content.name;
		this.effectText.text = content.effect;

		const safeWidth = (t: Text): number => {
			try {
				const bounds = t.getLocalBounds();
				return bounds?.width ?? 0;
			} catch {
				return 0;
			}
		};
		const maxTextWidth = Math.max(
			TOOLTIP_MIN_WIDTH,
			safeWidth(this.nameText),
			safeWidth(this.effectText),
		);
		this.cachedBgWidth = maxTextWidth + TOOLTIP_PADDING * 2;

		const baseLines = 2;
		this.cachedBgHeight = TOOLTIP_LINE_HEIGHT * baseLines + TOOLTIP_PADDING * 2;

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

		// Y方向: スクリーン座標で判定し、基本はタイルの上側、はみ出す場合は下側に出す
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
