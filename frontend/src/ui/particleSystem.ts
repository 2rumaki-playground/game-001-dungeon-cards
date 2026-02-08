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

export class ParticleSystem {
	private container: Container;

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
			const graphics = new Graphics();
			this.container.addChild(graphics);

			const ticker = Ticker.shared;

			const update = (tick: Ticker): void => {
				particles = updateParticles(particles, tick.deltaMS, config.gravity);

				graphics.clear();
				for (const p of particles) {
					graphics.circle(p.x, p.y, p.size);
					graphics.fill({ color: p.color, alpha: p.life / p.maxLife });
				}

				if (isAllDead(particles)) {
					ticker.remove(update);
					this.container.removeChild(graphics);
					graphics.destroy();
					resolve();
				}
			};

			ticker.add(update);
		});
	}

	/**
	 * 全エフェクトを即時破棄
	 */
	clear(): void {
		for (const child of [...this.container.children]) {
			this.container.removeChild(child);
			child.destroy();
		}
	}
}
