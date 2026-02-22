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
import {
	calcTileParticleAlpha,
	calcTileParticlePosition,
	getTileParticleEmitterConfig,
	shouldSpawn,
	spawnTileParticle,
	type TileParticle,
	type TileParticleEmitterConfig,
	updateTileParticles,
} from "./tileParticleLogic";

type TileEffect = {
	config: SpecialTileEffectConfig;
	px: number;
	py: number;
	particles?: TileParticle[];
	emitterConfig?: TileParticleEmitterConfig;
	timeSinceLastSpawn?: number;
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
	private particleGraphics: Graphics;
	private arrowGraphics: Graphics;
	private effects: Map<string, TileEffect> = new Map();
	private stairsEffects: Map<string, TileEffect> = new Map();
	private tickerCallback: ((tick: Ticker) => void) | null = null;
	private elapsed = 0;
	private floorCleared = false;

	constructor() {
		this.container = new Container();
		this.graphics = new Graphics();
		this.particleGraphics = new Graphics();
		this.arrowGraphics = new Graphics();
		this.container.addChild(this.graphics);
		this.container.addChild(this.particleGraphics);
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
			const row = map[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const tile = row[x];
				if (!tile) continue;
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
				const tileType = tile.type as SpecialTileType;
				const existing = this.effects.get(key);
				newEffects.set(key, {
					config: getSpecialTileEffectConfig(tileType),
					px: pixelPos.x + CELL_SIZE / 2,
					py: pixelPos.y + CELL_SIZE / 2,
					particles: existing?.particles ?? [],
					emitterConfig: getTileParticleEmitterConfig(tileType),
					timeSinceLastSpawn: existing?.timeSinceLastSpawn ?? 0,
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
			this.render(tick.deltaMS);
		};
		Ticker.shared.add(this.tickerCallback);
	}

	private stop(): void {
		if (this.tickerCallback) {
			Ticker.shared.remove(this.tickerCallback);
			this.tickerCallback = null;
		}
		this.graphics.clear();
		this.particleGraphics.clear();
	}

	private render(deltaMS: number): void {
		this.graphics.clear();
		this.particleGraphics.clear();

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

		this.renderParticles(deltaMS);
	}

	private renderParticles(deltaMS: number): void {
		for (const effect of this.effects.values()) {
			if (!effect.particles || !effect.emitterConfig) continue;

			effect.particles = updateTileParticles(effect.particles, deltaMS);

			effect.timeSinceLastSpawn = (effect.timeSinceLastSpawn ?? 0) + deltaMS;
			if (
				shouldSpawn(
					effect.particles,
					effect.emitterConfig,
					effect.timeSinceLastSpawn,
				)
			) {
				effect.particles.push(
					spawnTileParticle(effect.emitterConfig, CELL_SIZE),
				);
				effect.timeSinceLastSpawn = 0;
			}

			for (const p of effect.particles) {
				const pos = calcTileParticlePosition(p, CELL_SIZE);
				const alpha = calcTileParticleAlpha(p, effect.emitterConfig.maxAlpha);
				const x = effect.px + pos.x;
				const y = effect.py + pos.y;

				if (effect.emitterConfig.shape === "diamond") {
					this.drawDiamond(x, y, p.size, p.color, alpha);
				} else {
					this.particleGraphics.circle(x, y, p.size);
					this.particleGraphics.fill({ color: p.color, alpha });
				}
			}
		}
	}

	private drawDiamond(
		x: number,
		y: number,
		size: number,
		color: number,
		alpha: number,
	): void {
		this.particleGraphics
			.moveTo(x, y - size)
			.lineTo(x + size, y)
			.lineTo(x, y + size)
			.lineTo(x - size, y)
			.closePath();
		this.particleGraphics.fill({ color, alpha });
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
