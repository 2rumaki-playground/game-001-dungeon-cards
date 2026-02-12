import { describe, expect, it } from "vitest";
import { BOSS_SKILL } from "../constants";
import {
	calcForecastPulseAlpha,
	getAffectedTiles,
	getSkillForecastConfig,
} from "./skillForecastEffectLogic";

describe("getSkillForecastConfig", () => {
	it("power_strikeの設定値が取得できる", () => {
		const config = getSkillForecastConfig("power_strike");
		expect(config.pulsePeriod).toBeGreaterThan(0);
		expect(config.pulseAlphaMin).toBeLessThan(config.pulseAlphaMax);
		expect(config.rangeColor).toBeTypeOf("number");
		expect(config.iconColor).toBeTypeOf("number");
	});

	it("area_attackの設定値が取得できる", () => {
		const config = getSkillForecastConfig("area_attack");
		expect(config.pulsePeriod).toBeGreaterThan(0);
		expect(config.pulseAlphaMin).toBeLessThan(config.pulseAlphaMax);
		expect(config.rangeColor).toBeTypeOf("number");
		expect(config.iconColor).toBeTypeOf("number");
	});
});

describe("getAffectedTiles", () => {
	it("power_strike: 隣接4タイルが返される", () => {
		const tiles = getAffectedTiles("power_strike", { x: 3, y: 3 }, 7, 7);
		expect(tiles).toHaveLength(4);
		expect(tiles).toContainEqual({ x: 2, y: 3 });
		expect(tiles).toContainEqual({ x: 4, y: 3 });
		expect(tiles).toContainEqual({ x: 3, y: 2 });
		expect(tiles).toContainEqual({ x: 3, y: 4 });
	});

	it("power_strike: マップ端では範囲外タイルが除外される", () => {
		const tiles = getAffectedTiles("power_strike", { x: 0, y: 0 }, 7, 7);
		expect(tiles).toHaveLength(2);
		expect(tiles).toContainEqual({ x: 1, y: 0 });
		expect(tiles).toContainEqual({ x: 0, y: 1 });
	});

	it("power_strike: 敵自身の位置は含まない", () => {
		const tiles = getAffectedTiles("power_strike", { x: 3, y: 3 }, 7, 7);
		expect(tiles).not.toContainEqual({ x: 3, y: 3 });
	});

	it("area_attack: マンハッタン距離2以内のタイルが返される", () => {
		const tiles = getAffectedTiles("area_attack", { x: 5, y: 5 }, 11, 11);
		// 距離1: 4タイル、距離2: 8タイル = 合計12タイル（敵自身含まない）
		expect(tiles).toHaveLength(12);
		// 距離1
		expect(tiles).toContainEqual({ x: 4, y: 5 });
		expect(tiles).toContainEqual({ x: 6, y: 5 });
		expect(tiles).toContainEqual({ x: 5, y: 4 });
		expect(tiles).toContainEqual({ x: 5, y: 6 });
		// 距離2
		expect(tiles).toContainEqual({ x: 3, y: 5 });
		expect(tiles).toContainEqual({ x: 7, y: 5 });
		expect(tiles).toContainEqual({ x: 5, y: 3 });
		expect(tiles).toContainEqual({ x: 5, y: 7 });
		expect(tiles).toContainEqual({ x: 4, y: 4 });
		expect(tiles).toContainEqual({ x: 6, y: 4 });
		expect(tiles).toContainEqual({ x: 4, y: 6 });
		expect(tiles).toContainEqual({ x: 6, y: 6 });
	});

	it("area_attack: マップ端では範囲外タイルが除外される", () => {
		const tiles = getAffectedTiles("area_attack", { x: 0, y: 0 }, 7, 7);
		// (0,0)から距離2以内: (1,0),(0,1),(2,0),(0,2),(1,1) = 5タイル
		expect(tiles).toHaveLength(5);
	});

	it("area_attack: 敵自身の位置は含まない", () => {
		const tiles = getAffectedTiles("area_attack", { x: 5, y: 5 }, 11, 11);
		expect(tiles).not.toContainEqual({ x: 5, y: 5 });
	});

	it("area_attack: 射程はBOSS_SKILL.areaAttackRangeに基づく", () => {
		const tiles = getAffectedTiles("area_attack", { x: 5, y: 5 }, 11, 11);
		for (const tile of tiles) {
			const dist = Math.abs(tile.x - 5) + Math.abs(tile.y - 5);
			expect(dist).toBeLessThanOrEqual(BOSS_SKILL.areaAttackRange);
			expect(dist).toBeGreaterThan(0);
		}
	});
});

describe("calcForecastPulseAlpha", () => {
	it("elapsed=0でmid値を返す", () => {
		const config = getSkillForecastConfig("power_strike");
		const alpha = calcForecastPulseAlpha(0, config);
		const mid = (config.pulseAlphaMin + config.pulseAlphaMax) / 2;
		expect(alpha).toBeCloseTo(mid, 5);
	});

	it("周期の1/4でmax値を返す", () => {
		const config = getSkillForecastConfig("power_strike");
		const alpha = calcForecastPulseAlpha(config.pulsePeriod / 4, config);
		expect(alpha).toBeCloseTo(config.pulseAlphaMax, 5);
	});

	it("周期の3/4でmin値を返す", () => {
		const config = getSkillForecastConfig("power_strike");
		const alpha = calcForecastPulseAlpha((config.pulsePeriod * 3) / 4, config);
		expect(alpha).toBeCloseTo(config.pulseAlphaMin, 5);
	});

	it("常にmin〜maxの範囲内に収まる", () => {
		const config = getSkillForecastConfig("area_attack");
		for (let t = 0; t < config.pulsePeriod; t += 50) {
			const alpha = calcForecastPulseAlpha(t, config);
			expect(alpha).toBeGreaterThanOrEqual(config.pulseAlphaMin - 0.0001);
			expect(alpha).toBeLessThanOrEqual(config.pulseAlphaMax + 0.0001);
		}
	});
});
