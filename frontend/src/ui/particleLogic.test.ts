/**
 * パーティクルロジックのテスト
 */

import { describe, expect, it } from "vitest";
import {
	calcEmitVelocity,
	createParticles,
	type EmitPattern,
	isAllDead,
	type Particle,
	type ParticleConfig,
	updateParticles,
} from "./particleLogic";

/** 固定値を返す乱数関数を生成 */
function fixedRandom(value: number): () => number {
	return () => value;
}

/** 順番に値を返す乱数関数を生成 */
function sequenceRandom(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

describe("calcEmitVelocity", () => {
	describe("radial パターン", () => {
		it("random=0のとき角度0（右方向）に発射", () => {
			const pattern: EmitPattern = { type: "radial" };
			const speed = { min: 0.1, max: 0.1 };
			// 1回目: speed用(0.5 → 0.1), 2回目: angle用(0 → 0)
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0));
			expect(v.x).toBeCloseTo(0.1);
			expect(v.y).toBeCloseTo(0);
		});

		it("random=0.5のとき角度π（左方向）に発射", () => {
			const pattern: EmitPattern = { type: "radial" };
			const speed = { min: 0.2, max: 0.2 };
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0.5));
			expect(v.x).toBeCloseTo(-0.2);
			expect(v.y).toBeCloseTo(0, 5);
		});

		it("speed.minとmaxの間で補間される", () => {
			const pattern: EmitPattern = { type: "radial" };
			const speed = { min: 0.1, max: 0.3 };
			// random=0.5 → speed=0.2, angle=π
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0.5));
			const magnitude = Math.sqrt(v.x ** 2 + v.y ** 2);
			expect(magnitude).toBeCloseTo(0.2);
		});
	});

	describe("directional パターン", () => {
		it("spread=0のとき指定角度に正確に発射", () => {
			const pattern: EmitPattern = {
				type: "directional",
				angle: 0,
				spread: 0,
			};
			const speed = { min: 0.1, max: 0.1 };
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0.5));
			expect(v.x).toBeCloseTo(0.1);
			expect(v.y).toBeCloseTo(0);
		});

		it("spreadの範囲内で角度がばらつく", () => {
			const pattern: EmitPattern = {
				type: "directional",
				angle: 0,
				spread: Math.PI,
			};
			const speed = { min: 0.1, max: 0.1 };
			// random=0 → speed=0.1, angle = 0 + lerp(-π/2, π/2, 0) = -π/2
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0));
			expect(v.x).toBeCloseTo(0);
			expect(v.y).toBeCloseTo(-0.1);
		});
	});

	describe("random パターン", () => {
		it("random=0.5のとき速度0（中心）", () => {
			const pattern: EmitPattern = { type: "random" };
			const speed = { min: 0.1, max: 0.1 };
			const v = calcEmitVelocity(pattern, speed, fixedRandom(0.5));
			expect(v.x).toBeCloseTo(0);
			expect(v.y).toBeCloseTo(0);
		});

		it("random=1のとき最大速度で右下に発射", () => {
			const pattern: EmitPattern = { type: "random" };
			const speed = { min: 0.2, max: 0.2 };
			const v = calcEmitVelocity(pattern, speed, fixedRandom(1));
			expect(v.x).toBeCloseTo(0.2);
			expect(v.y).toBeCloseTo(0.2);
		});
	});
});

describe("createParticles", () => {
	const baseConfig: ParticleConfig = {
		count: 3,
		origin: { x: 100, y: 200 },
		color: 0xff0000,
		speed: { min: 0.1, max: 0.1 },
		life: { min: 500, max: 500 },
		size: { min: 4, max: 4 },
		pattern: { type: "radial" },
	};

	it("指定した数のパーティクルを生成", () => {
		const particles = createParticles(baseConfig, fixedRandom(0.5));
		expect(particles).toHaveLength(3);
	});

	it("originの座標が設定される", () => {
		const particles = createParticles(baseConfig, fixedRandom(0.5));
		for (const p of particles) {
			expect(p.x).toBe(100);
			expect(p.y).toBe(200);
		}
	});

	it("lifeとmaxLifeが同じ値で初期化される", () => {
		const particles = createParticles(baseConfig, fixedRandom(0.5));
		for (const p of particles) {
			expect(p.life).toBe(500);
			expect(p.maxLife).toBe(500);
		}
	});

	it("sizeとinitialSizeが同じ値で初期化される", () => {
		const particles = createParticles(baseConfig, fixedRandom(0.5));
		for (const p of particles) {
			expect(p.size).toBe(4);
			expect(p.initialSize).toBe(4);
		}
	});

	it("単一色が全パーティクルに適用される", () => {
		const particles = createParticles(baseConfig, fixedRandom(0.5));
		for (const p of particles) {
			expect(p.color).toBe(0xff0000);
		}
	});

	it("配列色からランダムに選択される", () => {
		const config: ParticleConfig = {
			...baseConfig,
			color: [0xff0000, 0x00ff00],
		};
		// random sequence: speed(0), angle(0), life(0), size(0), color(0) → index 0
		// then: speed(1), angle(1), life(1), size(1), color(1) → index 1
		const rand = sequenceRandom([0, 0, 0, 0, 0, 1, 1, 1, 1, 0.9]);
		const particles = createParticles(config, rand);
		expect(particles[0].color).toBe(0xff0000);
		expect(particles[1].color).toBe(0x00ff00);
	});
});

describe("updateParticles", () => {
	const makeParticle = (overrides?: Partial<Particle>): Particle => ({
		x: 0,
		y: 0,
		vx: 0.1,
		vy: 0,
		life: 1000,
		maxLife: 1000,
		size: 4,
		initialSize: 4,
		color: 0xffffff,
		...overrides,
	});

	it("位置が速度×時間で更新される", () => {
		const particles = [makeParticle({ x: 10, y: 20, vx: 0.1, vy: 0.05 })];
		const updated = updateParticles(particles, 100);
		expect(updated[0].x).toBeCloseTo(20);
		expect(updated[0].y).toBeCloseTo(25);
	});

	it("寿命がdeltaMSだけ減少する", () => {
		const particles = [makeParticle({ life: 1000 })];
		const updated = updateParticles(particles, 200);
		expect(updated[0].life).toBe(800);
	});

	it("サイズが寿命の割合に比例して縮小する", () => {
		const particles = [
			makeParticle({ life: 1000, maxLife: 1000, size: 4, initialSize: 4 }),
		];
		const updated = updateParticles(particles, 500);
		expect(updated[0].size).toBeCloseTo(2);
	});

	it("寿命が0以下のパーティクルは除外される", () => {
		const particles = [
			makeParticle({ life: 100 }),
			makeParticle({ life: 500 }),
		];
		const updated = updateParticles(particles, 200);
		expect(updated).toHaveLength(1);
		expect(updated[0].life).toBe(300);
	});

	it("gravity が vy に加算される", () => {
		const particles = [makeParticle({ vy: 0 })];
		const updated = updateParticles(particles, 100, 0.001);
		expect(updated[0].vy).toBeCloseTo(0.1);
	});

	it("空配列に対して空配列を返す", () => {
		const updated = updateParticles([], 100);
		expect(updated).toEqual([]);
	});

	it("元の配列を変更しない（イミュータブル）", () => {
		const original = [makeParticle()];
		const originalX = original[0].x;
		updateParticles(original, 100);
		expect(original[0].x).toBe(originalX);
	});
});

describe("isAllDead", () => {
	it("空配列はtrue", () => {
		expect(isAllDead([])).toBe(true);
	});

	it("パーティクルが残っていればfalse", () => {
		const particle: Particle = {
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			life: 100,
			maxLife: 1000,
			size: 2,
			initialSize: 4,
			color: 0xffffff,
		};
		expect(isAllDead([particle])).toBe(false);
	});
});
