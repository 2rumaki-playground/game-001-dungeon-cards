/**
 * 戦闘パーティクル設定のテスト
 */

import { describe, expect, it } from "vitest";
import {
	calculateDefeatEffectScale,
	createAttackParticleConfig,
	createDefeatParticleConfig,
	createHealParticleConfig,
	createJumpParticleConfig,
	createStrongAttackParticleConfig,
	createTrapDamageParticleConfig,
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

describe("createJumpParticleConfig", () => {
	it("originが設定される", () => {
		const config = createJumpParticleConfig({ x: 100, y: 200 }, 0);
		expect(config.origin).toEqual({ x: 100, y: 200 });
	});

	it("紫系の色が使用される", () => {
		const config = createJumpParticleConfig({ x: 0, y: 0 }, 0);
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			// 紫系: 青成分が一定以上
			const b = c & 0xff;
			expect(b).toBeGreaterThan(0x40);
		}
	});

	it("directionalパターンが使用される", () => {
		const config = createJumpParticleConfig({ x: 0, y: 0 }, Math.PI / 2);
		expect(config.pattern.type).toBe("directional");
	});

	it("移動方向の逆向きにパーティクルが発射される", () => {
		const moveAngle = 0; // 右方向への移動
		const config = createJumpParticleConfig({ x: 0, y: 0 }, moveAngle);
		if (config.pattern.type === "directional") {
			// 逆方向（π）に発射
			expect(config.pattern.angle).toBeCloseTo(Math.PI);
		}
	});
});

describe("calculateDefeatEffectScale", () => {
	it("overkill=0でscale=1.0", () => {
		expect(calculateDefeatEffectScale(0)).toBe(1.0);
	});

	it("overkill=1でscale=1.3", () => {
		expect(calculateDefeatEffectScale(1)).toBeCloseTo(1.3);
	});

	it("overkill=3でscale=1.9", () => {
		expect(calculateDefeatEffectScale(3)).toBeCloseTo(1.9);
	});

	it("overkill=4でscale=2.0（上限到達）", () => {
		expect(calculateDefeatEffectScale(4)).toBe(2.0);
	});

	it("overkill=10でscale=2.0（上限キャップ）", () => {
		expect(calculateDefeatEffectScale(10)).toBe(2.0);
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

	it("overkill=0で従来と同一パラメータ（count=20）", () => {
		const config = createDefeatParticleConfig({ x: 0, y: 0 }, 0);
		expect(config.count).toBe(20);
		expect(config.speed.min).toBeCloseTo(0.1);
		expect(config.speed.max).toBeCloseTo(0.25);
		expect(config.life.min).toBe(300);
		expect(config.life.max).toBe(600);
		expect(config.size.min).toBe(2);
		expect(config.size.max).toBe(6);
	});

	it("overkill=2でスケール済みパラメータ", () => {
		const config = createDefeatParticleConfig({ x: 0, y: 0 }, 2);
		// scale = 1.0 + 2 * 0.3 = 1.6
		expect(config.count).toBe(Math.round(20 * 1.6));
		expect(config.size.min).toBeCloseTo(2 * 1.6);
		expect(config.size.max).toBeCloseTo(6 * 1.6);
	});

	it("overkill引数省略時はoverkill=0と同一", () => {
		const withoutArg = createDefeatParticleConfig({ x: 0, y: 0 });
		const withZero = createDefeatParticleConfig({ x: 0, y: 0 }, 0);
		expect(withoutArg.count).toBe(withZero.count);
		expect(withoutArg.speed).toEqual(withZero.speed);
		expect(withoutArg.life).toEqual(withZero.life);
		expect(withoutArg.size).toEqual(withZero.size);
	});
});

describe("createHealParticleConfig", () => {
	it("originが設定される", () => {
		const config = createHealParticleConfig({ x: 100, y: 200 });
		expect(config.origin).toEqual({ x: 100, y: 200 });
	});

	it("緑系の色が使用される", () => {
		const config = createHealParticleConfig({ x: 0, y: 0 });
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			// 緑系: 緑成分が高い
			const g = (c >> 8) & 0xff;
			expect(g).toBeGreaterThan(0x80);
		}
	});

	it("上向きのパーティクル設定になっている", () => {
		const config = createHealParticleConfig({ x: 0, y: 0 });
		// 負のgravityで上方向に浮かぶ
		expect(config.gravity).toBeDefined();
		expect(config.gravity).toBeLessThan(0);
		// directionalパターンの場合、角度が上向き（-π/2付近）
		if (config.pattern.type === "directional") {
			expect(config.pattern.angle).toBeCloseTo(-Math.PI / 2);
		}
	});
});

describe("createTrapDamageParticleConfig", () => {
	it("originが設定される", () => {
		const config = createTrapDamageParticleConfig({ x: 100, y: 200 });
		expect(config.origin).toEqual({ x: 100, y: 200 });
	});

	it("紫系の色が使用される", () => {
		const config = createTrapDamageParticleConfig({ x: 0, y: 0 });
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		for (const c of colors) {
			// 紫系: 赤成分と青成分がそれぞれ一定以上、かつ緑成分が一定以下
			const r = (c >> 16) & 0xff;
			const g = (c >> 8) & 0xff;
			const b = c & 0xff;
			expect(r).toBeGreaterThanOrEqual(0x60);
			expect(b).toBeGreaterThanOrEqual(0x60);
			expect(g).toBeLessThanOrEqual(0x80);
		}
	});

	it("radialパターンが使用される", () => {
		const config = createTrapDamageParticleConfig({ x: 0, y: 0 });
		expect(config.pattern.type).toBe("radial");
	});
});

describe("getAttackParticleConfig", () => {
	it("attackタイプでattack用設定を返す", () => {
		const config = getAttackParticleConfig("attack", { x: 0, y: 0 });
		const attackConfig = createAttackParticleConfig({ x: 0, y: 0 });
		expect(config.count).toBe(attackConfig.count);
	});

	it("strong_attackタイプでstrong_attack用設定を返す", () => {
		const config = getAttackParticleConfig("strong_attack", { x: 0, y: 0 });
		const strongConfig = createStrongAttackParticleConfig({ x: 0, y: 0 });
		expect(config.count).toBe(strongConfig.count);
	});
});
