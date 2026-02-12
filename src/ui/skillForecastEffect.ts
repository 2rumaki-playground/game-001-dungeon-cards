import { Container, Graphics, Ticker } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { Enemy } from "../types";
import { gridToPixel } from "./coordinates";
import {
	calcForecastPulseAlpha,
	getAffectedTiles,
	getSkillForecastConfig,
	type SkillForecastConfig,
} from "./skillForecastEffectLogic";

/** アイコンのサイズ（px） */
const ICON_SIZE = 10;

/** アイコンのY方向オフセット（セル上端からの距離） */
const ICON_OFFSET_Y = -4;

type ForecastEffect = {
	config: SkillForecastConfig;
	enemyPx: number;
	enemyPy: number;
	rangeTiles: Array<{ px: number; py: number }>;
	skillType: "power_strike" | "area_attack";
};

export class SkillForecastEffectManager {
	private rangeContainer: Container;
	private iconContainer: Container;
	private rangeGraphics: Graphics;
	private iconGraphics: Graphics;
	private effects: Map<string, ForecastEffect> = new Map();
	private tickerCallback: ((tick: Ticker) => void) | null = null;
	private elapsed = 0;

	constructor() {
		this.rangeContainer = new Container();
		this.iconContainer = new Container();
		this.rangeGraphics = new Graphics();
		this.iconGraphics = new Graphics();
		this.rangeContainer.addChild(this.rangeGraphics);
		this.iconContainer.addChild(this.iconGraphics);
	}

	getRangeContainer(): Container {
		return this.rangeContainer;
	}

	getIconContainer(): Container {
		return this.iconContainer;
	}

	getEffectCount(): number {
		return this.effects.size;
	}

	update(
		enemies: Enemy[],
		mapWidth: number,
		mapHeight: number,
		visitedTiles?: Set<string>,
	): void {
		const newEffects = new Map<string, ForecastEffect>();

		for (const enemy of enemies) {
			if (!enemy.pendingSkill) continue;
			if (
				visitedTiles &&
				!visitedTiles.has(`${enemy.position.x},${enemy.position.y}`)
			)
				continue;

			const config = getSkillForecastConfig(enemy.pendingSkill.type);
			const affected = getAffectedTiles(
				enemy.pendingSkill.type,
				enemy.position,
				mapWidth,
				mapHeight,
			);

			const rangeTiles = affected
				.filter((pos) => !visitedTiles || visitedTiles.has(`${pos.x},${pos.y}`))
				.map((pos) => {
					const px = gridToPixel(pos);
					return { px: px.x, py: px.y };
				});

			const enemyPixel = gridToPixel(enemy.position);

			newEffects.set(enemy.id, {
				config,
				enemyPx: enemyPixel.x,
				enemyPy: enemyPixel.y,
				rangeTiles,
				skillType: enemy.pendingSkill.type,
			});
		}

		this.effects = newEffects;

		if (this.effects.size > 0 && !this.tickerCallback) {
			this.start();
		} else if (this.effects.size === 0 && this.tickerCallback) {
			this.stop();
		}
	}

	private start(): void {
		this.tickerCallback = (tick: Ticker): void => {
			this.elapsed += tick.deltaMS;
			this.render();
		};
		Ticker.shared.add(this.tickerCallback);
	}

	private stop(): void {
		if (this.tickerCallback) {
			Ticker.shared.remove(this.tickerCallback);
			this.tickerCallback = null;
		}
		this.rangeGraphics.clear();
		this.iconGraphics.clear();
	}

	private render(): void {
		this.rangeGraphics.clear();
		this.iconGraphics.clear();

		for (const effect of this.effects.values()) {
			const alpha = calcForecastPulseAlpha(this.elapsed, effect.config);

			// 範囲ハイライト
			for (const tile of effect.rangeTiles) {
				this.rangeGraphics.rect(tile.px, tile.py, CELL_SIZE, CELL_SIZE);
				this.rangeGraphics.fill({
					color: effect.config.rangeColor,
					alpha,
				});
			}

			// アイコン描画
			const iconX = effect.enemyPx + CELL_SIZE / 2;
			const iconY = effect.enemyPy + ICON_OFFSET_Y;

			if (effect.skillType === "power_strike") {
				this.drawDiamondIcon(iconX, iconY, effect.config.iconColor);
			} else {
				this.drawDoubleCircleIcon(iconX, iconY, effect.config.iconColor);
			}
		}
	}

	/** 菱形アイコン（power_strike用） */
	private drawDiamondIcon(cx: number, cy: number, color: number): void {
		const s = ICON_SIZE / 2;
		this.iconGraphics
			.moveTo(cx, cy - s)
			.lineTo(cx + s, cy)
			.lineTo(cx, cy + s)
			.lineTo(cx - s, cy)
			.closePath();
		this.iconGraphics.fill(color);
	}

	/** 二重円アイコン（area_attack用） */
	private drawDoubleCircleIcon(cx: number, cy: number, color: number): void {
		// 外側の円はリングとして描画
		this.iconGraphics.circle(cx, cy, ICON_SIZE / 2);
		this.iconGraphics.stroke({ color, width: 1 });

		// 内側の円は塗りつぶしで描画
		this.iconGraphics.circle(cx, cy, ICON_SIZE / 4);
		this.iconGraphics.fill({ color });
	}

	clear(): void {
		this.stop();
		this.effects.clear();
		this.elapsed = 0;
	}
}
