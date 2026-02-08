/**
 * パーティクルエフェクトシステム
 * PixiJS Container/Graphics管理 + Ticker統合
 */

import { Container, Graphics, Ticker } from "pixi.js";
import {
	createParticles,
	isAllDead,
	type Particle,
	type ParticleConfig,
	updateParticles,
} from "./particleLogic";

/** アクティブなエミッションの追跡情報 */
type ActiveEmission = {
	graphics: Graphics;
	update: (tick: Ticker) => void;
	resolve: () => void;
};

export class ParticleSystem {
	private container: Container;
	private activeEmissions: Set<ActiveEmission> = new Set();

	constructor() {
		this.container = new Container();
	}

	getContainer(): Container {
		return this.container;
	}

	/**
	 * ワンショットでパーティクルを発射し、全消滅でresolveする
	 */
	emit(config: ParticleConfig): Promise<void> {
		return new Promise((resolve) => {
			let particles: Particle[] = createParticles(config);

			if (isAllDead(particles)) {
				resolve();
				return;
			}

			const graphics = new Graphics();
			this.container.addChild(graphics);

			const ticker = Ticker.shared;

			const cleanup = (): void => {
				ticker.remove(update);
				this.container.removeChild(graphics);
				graphics.destroy();
				this.activeEmissions.delete(emission);
				resolve();
			};

			const update = (tick: Ticker): void => {
				try {
					particles = updateParticles(particles, tick.deltaMS, config.gravity);

					graphics.clear();
					for (const p of particles) {
						graphics.circle(p.x, p.y, p.size);
						graphics.fill({ color: p.color, alpha: p.life / p.maxLife });
					}

					if (isAllDead(particles)) {
						cleanup();
					}
				} catch {
					cleanup();
				}
			};

			const emission: ActiveEmission = { graphics, update, resolve };
			this.activeEmissions.add(emission);

			ticker.add(update);
		});
	}

	/**
	 * 全エフェクトを即時破棄し、未完了のPromiseをresolveする
	 */
	clear(): void {
		const ticker = Ticker.shared;
		for (const emission of [...this.activeEmissions]) {
			ticker.remove(emission.update);
			this.container.removeChild(emission.graphics);
			emission.graphics.destroy();
			emission.resolve();
		}
		this.activeEmissions.clear();
	}
}
