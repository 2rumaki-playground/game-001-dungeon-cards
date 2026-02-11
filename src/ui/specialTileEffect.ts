import { Container, Graphics, Ticker } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { GameMap, SpecialTileType } from "../types/map";
import { gridToPixel } from "./coordinates";
import {
	calcPulseAlpha,
	getSpecialTileEffectConfig,
	type SpecialTileEffectConfig,
} from "./specialTileEffectLogic";

type TileEffect = {
	config: SpecialTileEffectConfig;
	px: number;
	py: number;
};

const SPECIAL_TILE_TYPES = new Set<string>(["trap", "treasure", "rest_area"]);

export class SpecialTileEffectManager {
	private container: Container;
	private graphics: Graphics;
	private effects: Map<string, TileEffect> = new Map();
	private tickerCallback: ((tick: Ticker) => void) | null = null;
	private elapsed = 0;

	constructor() {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
	}

	getContainer(): Container {
		return this.container;
	}

	getEffectCount(): number {
		return this.effects.size;
	}

	update(map: GameMap, visitedTiles?: Set<string>): void {
		const newEffects = new Map<string, TileEffect>();

		for (let y = 0; y < map.length; y++) {
			const row = map[y]!;
			for (let x = 0; x < row.length; x++) {
				const tile = row[x]!;
				if (!SPECIAL_TILE_TYPES.has(tile.type)) continue;

				const key = `${x},${y}`;
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
	}

	clear(): void {
		this.stop();
		this.effects.clear();
		this.elapsed = 0;
	}
}
