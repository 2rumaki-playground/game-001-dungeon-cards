/**
 * 戦闘パーティクル設定のテスト
 */

import { describe, expect, it } from "vitest";
import {
	createAttackParticleConfig,
	createDefeatParticleConfig,
	createRushParticleConfig,
	createStrongAttackParticleConfig,
	getAttackParticleConfig,
} from "./battleParticles";

describe("createAttackParticleConfig", () => {
	it("originが設定される", () => {
		const config = createAttackParticleConfig({ x: 100, y: 200 });
		expect(config.origin).toEqual({ x: 100, y: 200 });
	});

	it("オレンジ系の色が使用される", () => {
		const config = createAttackParticleConfig({ x: 0, y: 0 });
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			// オレンジ系: 赤成分が高い
			const r = (c >> 16) & 0xff;
			expect(r).toBeGreaterThan(0x80);
		}
	});

	it("radialパターンが使用される", () => {
		const config = createAttackParticleConfig({ x: 0, y: 0 });
		expect(config.pattern.type).toBe("radial");
	});

	it("パーティクル数が適度（10〜30個）", () => {
		const config = createAttackParticleConfig({ x: 0, y: 0 });
		expect(config.count).toBeGreaterThanOrEqual(10);
		expect(config.count).toBeLessThanOrEqual(30);
	});
});

describe("createStrongAttackParticleConfig", () => {
	it("originが設定される", () => {
		const config = createStrongAttackParticleConfig({ x: 150, y: 250 });
		expect(config.origin).toEqual({ x: 150, y: 250 });
	});

	it("赤系の色が使用される", () => {
		const config = createStrongAttackParticleConfig({ x: 0, y: 0 });
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			const r = (c >> 16) & 0xff;
			expect(r).toBeGreaterThan(0x80);
		}
	});

	it("attackよりパーティクル数が多い", () => {
		const attackConfig = createAttackParticleConfig({ x: 0, y: 0 });
		const strongConfig = createStrongAttackParticleConfig({ x: 0, y: 0 });
		expect(strongConfig.count).toBeGreaterThan(attackConfig.count);
	});

	it("attackよりサイズが大きい", () => {
		const attackConfig = createAttackParticleConfig({ x: 0, y: 0 });
		const strongConfig = createStrongAttackParticleConfig({ x: 0, y: 0 });
		expect(strongConfig.size.max).toBeGreaterThan(attackConfig.size.max);
	});
});

describe("createRushParticleConfig", () => {
	it("originが設定される", () => {
		const config = createRushParticleConfig({ x: 100, y: 200 }, 0);
		expect(config.origin).toEqual({ x: 100, y: 200 });
	});

	it("紫系の色が使用される", () => {
		const config = createRushParticleConfig({ x: 0, y: 0 }, 0);
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			// 紫系: 青成分が一定以上
			const b = c & 0xff;
			expect(b).toBeGreaterThan(0x40);
		}
	});

	it("directionalパターンが使用される", () => {
		const config = createRushParticleConfig({ x: 0, y: 0 }, Math.PI / 2);
		expect(config.pattern.type).toBe("directional");
	});

	it("移動方向の逆向きにパーティクルが発射される", () => {
		const moveAngle = 0; // 右方向への移動
		const config = createRushParticleConfig({ x: 0, y: 0 }, moveAngle);
		if (config.pattern.type === "directional") {
			// 逆方向（π）に発射
			expect(config.pattern.angle).toBeCloseTo(Math.PI);
		}
	});
});

describe("createDefeatParticleConfig", () => {
	it("originが設定される", () => {
		const config = createDefeatParticleConfig({ x: 300, y: 400 });
		expect(config.origin).toEqual({ x: 300, y: 400 });
	});

	it("radialパターンが使用される", () => {
		const config = createDefeatParticleConfig({ x: 0, y: 0 });
		expect(config.pattern.type).toBe("radial");
	});

	it("パーティクル数が多め（15個以上）", () => {
		const config = createDefeatParticleConfig({ x: 0, y: 0 });
		expect(config.count).toBeGreaterThanOrEqual(15);
	});
});

describe("getAttackParticleConfig", () => {
	it("attackタイプでattack用設定を返す", () => {
		const config = getAttackParticleConfig("attack", { x: 0, y: 0 });
		expect(config).not.toBeNull();
		const attackConfig = createAttackParticleConfig({ x: 0, y: 0 });
		expect(config?.count).toBe(attackConfig.count);
	});

	it("strong_attackタイプでstrong_attack用設定を返す", () => {
		const config = getAttackParticleConfig("strong_attack", { x: 0, y: 0 });
		expect(config).not.toBeNull();
		const strongConfig = createStrongAttackParticleConfig({ x: 0, y: 0 });
		expect(config?.count).toBe(strongConfig.count);
	});

	it("moveタイプでnullを返す", () => {
		const config = getAttackParticleConfig("move", { x: 0, y: 0 });
		expect(config).toBeNull();
	});

	it("waitタイプでnullを返す", () => {
		const config = getAttackParticleConfig("wait", { x: 0, y: 0 });
		expect(config).toBeNull();
	});

	it("rushタイプでnullを返す（rushは専用関数を使用）", () => {
		const config = getAttackParticleConfig("rush", { x: 0, y: 0 });
		expect(config).toBeNull();
	});
});
