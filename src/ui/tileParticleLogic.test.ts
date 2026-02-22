import { describe, expect, it } from "vitest";
import {
	calcTileParticleAlpha,
	calcTileParticlePosition,
	getTileParticleEmitterConfig,
	shouldSpawn,
	spawnTileParticle,
	type TileParticle,
	updateTileParticles,
} from "./tileParticleLogic";

const CELL_SIZE = 48;

function createFixedRandom(value: number): () => number {
	return () => value;
}

describe("getTileParticleEmitterConfig", () => {
	it("trapの設定を返す", () => {
		const config = getTileParticleEmitterConfig("trap");
		expect(config.movement).toBe("rise");
		expect(config.shape).toBe("circle");
		expect(config.maxParticles).toBe(5);
		expect(config.colors).toHaveLength(4);
	});

	it("treasureの設定を返す", () => {
		const config = getTileParticleEmitterConfig("treasure");
		expect(config.movement).toBe("orbit");
		expect(config.shape).toBe("diamond");
		expect(config.maxParticles).toBe(6);
		expect(config.colors).toHaveLength(4);
	});

	it("rest_areaの設定を返す", () => {
		const config = getTileParticleEmitterConfig("rest_area");
		expect(config.movement).toBe("float");
		expect(config.shape).toBe("circle");
		expect(config.maxParticles).toBe(4);
		expect(config.colors).toHaveLength(4);
	});
});

describe("spawnTileParticle", () => {
	it("age=0で生成される", () => {
		const config = getTileParticleEmitterConfig("trap");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(p.age).toBe(0);
	});

	it("設定のlifetime範囲内のmaxLifeを持つ", () => {
		const config = getTileParticleEmitterConfig("trap");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(p.maxLife).toBeGreaterThanOrEqual(config.lifetime.min);
		expect(p.maxLife).toBeLessThanOrEqual(config.lifetime.max);
	});

	it("設定のsize範囲内のsizeを持つ", () => {
		const config = getTileParticleEmitterConfig("treasure");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(p.size).toBeGreaterThanOrEqual(config.size.min);
		expect(p.size).toBeLessThanOrEqual(config.size.max);
	});

	it("設定のcolors配列から色が選択される", () => {
		const config = getTileParticleEmitterConfig("rest_area");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(config.colors).toContain(p.color);
	});

	it("rise movementでは初期Y座標が正の値（タイル下部）", () => {
		const config = getTileParticleEmitterConfig("trap");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(p.movement).toBe("rise");
		expect(p.initialY).toBeGreaterThan(0);
	});

	it("orbit movementでは初期座標が0", () => {
		const config = getTileParticleEmitterConfig("treasure");
		const p = spawnTileParticle(config, CELL_SIZE, createFixedRandom(0.5));
		expect(p.movement).toBe("orbit");
		expect(p.initialX).toBe(0);
		expect(p.initialY).toBe(0);
	});
});

describe("calcTileParticleAlpha", () => {
	const maxAlpha = 0.7;

	function makeParticle(age: number, maxLife: number): TileParticle {
		return {
			age,
			maxLife,
			size: 3,
			color: 0xffffff,
			movement: "rise",
			phase: 0,
			orbitAngle: 0,
			initialX: 0,
			initialY: 0,
		};
	}

	it("age=0のとき0を返す（フェードイン開始）", () => {
		expect(calcTileParticleAlpha(makeParticle(0, 1000), maxAlpha)).toBe(0);
	});

	it("寿命の20%の時点でmaxAlphaに達する", () => {
		const alpha = calcTileParticleAlpha(makeParticle(200, 1000), maxAlpha);
		expect(alpha).toBeCloseTo(maxAlpha);
	});

	it("寿命の50%の時点でmaxAlphaを返す", () => {
		const alpha = calcTileParticleAlpha(makeParticle(500, 1000), maxAlpha);
		expect(alpha).toBe(maxAlpha);
	});

	it("寿命の70%の時点からフェードアウト開始", () => {
		const alpha = calcTileParticleAlpha(makeParticle(700, 1000), maxAlpha);
		expect(alpha).toBeCloseTo(maxAlpha);
	});

	it("寿命末期ではalpha値が減少する", () => {
		const alpha = calcTileParticleAlpha(makeParticle(900, 1000), maxAlpha);
		expect(alpha).toBeLessThan(maxAlpha);
		expect(alpha).toBeGreaterThan(0);
	});
});

describe("calcTileParticlePosition", () => {
	function makeParticle(overrides: Partial<TileParticle> = {}): TileParticle {
		return {
			age: 0,
			maxLife: 2000,
			size: 3,
			color: 0xffffff,
			movement: "rise",
			phase: 0,
			orbitAngle: 0,
			initialX: 0,
			initialY: 10,
			...overrides,
		};
	}

	it("riseパーティクルは時間経過でY座標が減少する（上昇）", () => {
		const p = makeParticle({ movement: "rise", initialY: 10 });
		const pos0 = calcTileParticlePosition({ ...p, age: 0 }, CELL_SIZE);
		const pos1 = calcTileParticlePosition({ ...p, age: 1000 }, CELL_SIZE);
		expect(pos1.y).toBeLessThan(pos0.y);
	});

	it("orbitパーティクルは中心の周りを回る", () => {
		const p = makeParticle({ movement: "orbit", orbitAngle: 0 });
		const pos = calcTileParticlePosition(p, CELL_SIZE);
		const radius = CELL_SIZE * 0.5 * 0.35;
		const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
		expect(dist).toBeCloseTo(radius);
	});

	it("orbitパーティクルは時間経過で角度が変化する", () => {
		const p = makeParticle({ movement: "orbit", orbitAngle: 0 });
		const pos0 = calcTileParticlePosition({ ...p, age: 0 }, CELL_SIZE);
		const pos1 = calcTileParticlePosition({ ...p, age: 500 }, CELL_SIZE);
		expect(pos0.x).not.toBeCloseTo(pos1.x);
	});

	it("floatパーティクルはセルサイズの範囲内に位置する", () => {
		const p = makeParticle({
			movement: "float",
			phase: 1,
			initialX: 5,
			initialY: -3,
		});
		const pos = calcTileParticlePosition({ ...p, age: 1000 }, CELL_SIZE);
		const half = CELL_SIZE * 0.5;
		expect(Math.abs(pos.x)).toBeLessThan(half);
		expect(Math.abs(pos.y)).toBeLessThan(half);
	});
});

describe("updateTileParticles", () => {
	function makeParticle(age: number, maxLife: number): TileParticle {
		return {
			age,
			maxLife,
			size: 3,
			color: 0xffffff,
			movement: "rise",
			phase: 0,
			orbitAngle: 0,
			initialX: 0,
			initialY: 0,
		};
	}

	it("deltaMS分だけageが加算される", () => {
		const particles = [makeParticle(0, 2000)];
		const result = updateTileParticles(particles, 100);
		expect(result).toHaveLength(1);
		expect(result[0].age).toBe(100);
	});

	it("maxLifeに達したパーティクルは除去される", () => {
		const particles = [makeParticle(1900, 2000)];
		const result = updateTileParticles(particles, 200);
		expect(result).toHaveLength(0);
	});

	it("生存中のパーティクルは維持される", () => {
		const particles = [
			makeParticle(0, 2000),
			makeParticle(1800, 2000),
			makeParticle(500, 2000),
		];
		const result = updateTileParticles(particles, 100);
		expect(result).toHaveLength(3);
	});

	it("一部が寿命を迎え、残りが生存するケース", () => {
		const particles = [makeParticle(0, 2000), makeParticle(1950, 2000)];
		const result = updateTileParticles(particles, 100);
		expect(result).toHaveLength(1);
		expect(result[0].age).toBe(100);
	});
});

describe("shouldSpawn", () => {
	it("パーティクル数が上限未満かつinterval経過でtrueを返す", () => {
		const config = getTileParticleEmitterConfig("trap");
		const particles: TileParticle[] = [];
		expect(shouldSpawn(particles, config, config.spawnInterval)).toBe(true);
	});

	it("パーティクル数が上限に達している場合falseを返す", () => {
		const config = getTileParticleEmitterConfig("trap");
		const particles = Array.from({ length: config.maxParticles }, () => ({
			age: 0,
			maxLife: 2000,
			size: 3,
			color: 0xffffff,
			movement: "rise" as const,
			phase: 0,
			orbitAngle: 0,
			initialX: 0,
			initialY: 0,
		}));
		expect(shouldSpawn(particles, config, config.spawnInterval)).toBe(false);
	});

	it("interval未満の経過時間ではfalseを返す", () => {
		const config = getTileParticleEmitterConfig("trap");
		expect(shouldSpawn([], config, config.spawnInterval - 1)).toBe(false);
	});
});
