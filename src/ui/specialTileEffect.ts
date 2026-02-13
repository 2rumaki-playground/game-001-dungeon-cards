import { Container, Graphics, Ticker } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { GameMap, SpecialTileType } from "../types/map";
import { gridToPixel } from "./coordinates";
import {
	calcPulseAlpha,
	getSpecialTileEffectConfig,
	getStairsEffectConfig,
	type SpecialTileEffectConfig,
} from "./specialTileEffectLogic";

type TileEffect = {
	config: SpecialTileEffectConfig;
	px: number;
	py: number;
};

const SPECIAL_TILE_TYPES = new Set<string>(["trap", "treasure", "rest_area"]);

/** 階段タイルの矢印サイズ（セルサイズに対する比率） */
const ARROW_SIZE_RATIO = 0.3;

/** 階段タイルの矢印色 */
const ARROW_COLOR = 0xffffff;

/** 階段タイルの矢印アルファ */
const ARROW_ALPHA = 0.6;

export class SpecialTileEffectManager {
	private container: Container;
	private graphics: Graphics;
	private arrowGraphics: Graphics;
	private effects: Map<string, TileEffect> = new Map();
	private stairsEffects: Map<string, TileEffect> = new Map();
	private tickerCallback: ((tick: Ticker) => void) | null = null;
	private elapsed = 0;
	private floorCleared = false;

	constructor() {
		this.container = new Container();
		this.graphics = new Graphics();
		this.arrowGraphics = new Graphics();
		this.container.addChild(this.graphics);
		this.container.addChild(this.arrowGraphics);
	}

	getContainer(): Container {
		return this.container;
	}

	getEffectCount(): number {
		return this.effects.size + this.stairsEffects.size;
	}

	getStairsEffect(key: string): TileEffect | undefined {
		return this.stairsEffects.get(key);
	}

	/**
	 * フロアクリア状態を設定
	 * 全敵撃破時に呼ばれ、階段のパルスを強調する
	 */
	setFloorCleared(cleared: boolean): void {
		if (this.floorCleared === cleared) return;
		this.floorCleared = cleared;
		this.updateStairsConfigs();
	}

	update(map: GameMap, visitedTiles?: Set<string>): void {
		const newEffects = new Map<string, TileEffect>();
		const newStairsEffects = new Map<string, TileEffect>();

		for (let y = 0; y < map.length; y++) {
			const row = map[y]!;
			for (let x = 0; x < row.length; x++) {
				const tile = row[x]!;
				const key = `${x},${y}`;

				if (tile.type === "stairs") {
					if (visitedTiles && !visitedTiles.has(key)) continue;
					const pixelPos = gridToPixel({ x, y });
					newStairsEffects.set(key, {
						config: getStairsEffectConfig(this.floorCleared),
						px: pixelPos.x + CELL_SIZE / 2,
						py: pixelPos.y + CELL_SIZE / 2,
					});
					continue;
				}

				if (!SPECIAL_TILE_TYPES.has(tile.type)) continue;
				if (visitedTiles && !visitedTiles.has(key)) continue;

				const pixelPos = gridToPixel({ x, y });
				newEffects.set(key, {
					config: getSpecialTileEffectConfig(tile.type as SpecialTileType),
					px: pixelPos.x + CELL_SIZE / 2,
					py: pixelPos.y + CELL_SIZE / 2,
				});
			}
		}

		this.effects = newEffects;
		this.stairsEffects = newStairsEffects;
		this.renderArrows();

		const totalEffects = this.effects.size + this.stairsEffects.size;
		if (totalEffects > 0 && !this.tickerCallback) {
			this.start();
		} else if (totalEffects === 0 && this.tickerCallback) {
			this.stop();
		}
	}

	private updateStairsConfigs(): void {
		for (const [key, effect] of this.stairsEffects) {
			this.stairsEffects.set(key, {
				...effect,
				config: getStairsEffectConfig(this.floorCleared),
			});
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
		this.graphics.clear();
	}

	private render(): void {
		this.graphics.clear();
		for (const effect of this.effects.values()) {
			const alpha = calcPulseAlpha(this.elapsed, effect.config);
			const radius = CELL_SIZE * effect.config.glowRadius;
			this.graphics.circle(effect.px, effect.py, radius);
			this.graphics.fill({ color: effect.config.glowColor, alpha });
		}
		for (const effect of this.stairsEffects.values()) {
			const alpha = calcPulseAlpha(this.elapsed, effect.config);
			const radius = CELL_SIZE * effect.config.glowRadius;
			this.graphics.circle(effect.px, effect.py, radius);
			this.graphics.fill({ color: effect.config.glowColor, alpha });
		}
	}

	/**
	 * 階段タイルに下向き矢印オーバーレイを描画
	 */
	private renderArrows(): void {
		this.arrowGraphics.clear();
		const size = CELL_SIZE * ARROW_SIZE_RATIO;
		for (const effect of this.stairsEffects.values()) {
			const cx = effect.px;
			const cy = effect.py;
			this.arrowGraphics.moveTo(cx - size, cy - size * 0.5);
			this.arrowGraphics.lineTo(cx, cy + size * 0.5);
			this.arrowGraphics.lineTo(cx + size, cy - size * 0.5);
			this.arrowGraphics.closePath();
			this.arrowGraphics.fill({ color: ARROW_COLOR, alpha: ARROW_ALPHA });
		}
	}

	clear(): void {
		this.stop();
		this.effects.clear();
		this.stairsEffects.clear();
		this.floorCleared = false;
		this.elapsed = 0;
		this.arrowGraphics.clear();
	}
}
