/**
 * 敵AI可視化オーバーレイ（DEV環境限定）
 * 移動候補タイルと攻撃範囲をハイライト表示する。
 * SpecialTileEffectManagerと同様のパターンで実装。
 */

import { Container, Graphics, Ticker } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { EnemyAiAnalysis } from "../game/enemyAiAnalysis";
import { gridToPixel } from "./coordinates";
import {
	calcAiOverlayPulseAlpha,
	getAiOverlayConfig,
} from "./enemyAiOverlayLogic";

type OverlayTile = {
	px: number;
	py: number;
	type: "moveCandidate" | "moveBest" | "attackRange";
};

export class EnemyAiOverlayManager {
	private container: Container;
	private graphics: Graphics;
	private tiles: OverlayTile[] = [];
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

	update(analyses: EnemyAiAnalysis[], visitedTiles?: Set<string>): void {
		const newTiles: OverlayTile[] = [];

		for (const analysis of analyses) {
			// 移動候補タイル
			for (const candidate of analysis.moveCandidates) {
				const key = `${candidate.position.x},${candidate.position.y}`;
				if (visitedTiles && !visitedTiles.has(key)) continue;

				const pixel = gridToPixel(candidate.position);
				newTiles.push({
					px: pixel.x,
					py: pixel.y,
					type: candidate.isBestChoice ? "moveBest" : "moveCandidate",
				});
			}

			// 攻撃範囲タイル
			for (const pos of analysis.attackRange) {
				const key = `${pos.x},${pos.y}`;
				if (visitedTiles && !visitedTiles.has(key)) continue;

				const pixel = gridToPixel(pos);
				newTiles.push({
					px: pixel.x,
					py: pixel.y,
					type: "attackRange",
				});
			}
		}

		this.tiles = newTiles;

		if (this.tiles.length > 0 && !this.tickerCallback) {
			this.start();
		} else if (this.tiles.length === 0 && this.tickerCallback) {
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

		for (const tile of this.tiles) {
			const config = getAiOverlayConfig(tile.type);
			const alpha = calcAiOverlayPulseAlpha(this.elapsed, config);

			this.graphics.rect(tile.px, tile.py, CELL_SIZE, CELL_SIZE);
			this.graphics.fill({ color: config.color, alpha });
		}
	}

	clear(): void {
		this.stop();
		this.tiles = [];
		this.elapsed = 0;
	}
}
