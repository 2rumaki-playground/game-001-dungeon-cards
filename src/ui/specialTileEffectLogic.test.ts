import { describe, expect, it } from "vitest";
import { COLORS } from "../constants";
import type { SpecialTileType } from "../types/map";
import {
	calcPulseAlpha,
	getSpecialTileEffectConfig,
	getStairsEffectConfig,
} from "./specialTileEffectLogic";

describe("getSpecialTileEffectConfig", () => {
	it("trapの設定が正しい色と周期を持つ", () => {
		const config = getSpecialTileEffectConfig("trap");
		expect(config.glowColor).toBe(COLORS.trap);
		expect(config.pulsePeriod).toBe(1500);
		expect(config.pulseAlphaMin).toBe(0.15);
		expect(config.pulseAlphaMax).toBe(0.4);
	});

	it("chest_commonの設定が正しい色と周期を持つ", () => {
		const config = getSpecialTileEffectConfig("chest_common");
		expect(config.glowColor).toBe(COLORS.chestCommon);
		expect(config.pulsePeriod).toBe(2500);
		expect(config.pulseAlphaMin).toBe(0.1);
		expect(config.pulseAlphaMax).toBe(0.35);
	});

	it("chest_rareの設定が正しい色と周期を持つ", () => {
		const config = getSpecialTileEffectConfig("chest_rare");
		expect(config.glowColor).toBe(COLORS.chestRare);
		expect(config.pulsePeriod).toBe(2200);
		expect(config.pulseAlphaMin).toBe(0.12);
		expect(config.pulseAlphaMax).toBe(0.4);
	});

	it("chest_epicの設定が正しい色と周期を持つ", () => {
		const config = getSpecialTileEffectConfig("chest_epic");
		expect(config.glowColor).toBe(COLORS.chestEpic);
		expect(config.pulsePeriod).toBe(1800);
		expect(config.pulseAlphaMin).toBe(0.15);
		expect(config.pulseAlphaMax).toBe(0.45);
	});

	it("全タイルタイプで有効なグロー半径を持つ", () => {
		const types: SpecialTileType[] = [
			"trap",
			"chest_common",
			"chest_rare",
			"chest_epic",
		];
		for (const type of types) {
			const config = getSpecialTileEffectConfig(type);
			expect(config.glowRadius).toBeGreaterThan(0);
			expect(config.glowRadius).toBeLessThanOrEqual(0.5);
		}
	});
});

describe("getStairsEffectConfig", () => {
	it("通常時は階段色のグロー設定を返す", () => {
		const config = getStairsEffectConfig(false);
		expect(config.glowColor).toBe(COLORS.stairs);
		expect(config.glowRadius).toBeGreaterThan(0);
	});

	it("フロアクリア時はパルスが速くなる", () => {
		const normal = getStairsEffectConfig(false);
		const cleared = getStairsEffectConfig(true);
		expect(cleared.pulsePeriod).toBeLessThan(normal.pulsePeriod);
	});

	it("フロアクリア時はalphaが大きくなる", () => {
		const normal = getStairsEffectConfig(false);
		const cleared = getStairsEffectConfig(true);
		expect(cleared.pulseAlphaMax).toBeGreaterThan(normal.pulseAlphaMax);
	});

	it("フロアクリア時はグロー半径が大きくなる", () => {
		const normal = getStairsEffectConfig(false);
		const cleared = getStairsEffectConfig(true);
		expect(cleared.glowRadius).toBeGreaterThan(normal.glowRadius);
	});
});

describe("calcPulseAlpha", () => {
	const config = getSpecialTileEffectConfig("trap");
	const mid = (config.pulseAlphaMin + config.pulseAlphaMax) / 2;

	it("t=0でalpha中央値を返す（sin(0)=0）", () => {
		const alpha = calcPulseAlpha(0, config);
		expect(alpha).toBeCloseTo(mid, 5);
	});

	it("周期の1/4でalphaMaxを返す（sin(π/2)=1）", () => {
		const alpha = calcPulseAlpha(config.pulsePeriod / 4, config);
		expect(alpha).toBeCloseTo(config.pulseAlphaMax, 5);
	});

	it("周期の3/4でalphaMinを返す（sin(3π/2)=-1）", () => {
		const alpha = calcPulseAlpha((config.pulsePeriod * 3) / 4, config);
		expect(alpha).toBeCloseTo(config.pulseAlphaMin, 5);
	});

	it("1周期後に元の値に戻る", () => {
		const alpha0 = calcPulseAlpha(0, config);
		const alpha1 = calcPulseAlpha(config.pulsePeriod, config);
		expect(alpha1).toBeCloseTo(alpha0, 5);
	});

	it("alphaMin/alphaMaxの範囲内に常に収まる", () => {
		for (let t = 0; t < config.pulsePeriod; t += 10) {
			const alpha = calcPulseAlpha(t, config);
			expect(alpha).toBeGreaterThanOrEqual(config.pulseAlphaMin - 1e-10);
			expect(alpha).toBeLessThanOrEqual(config.pulseAlphaMax + 1e-10);
		}
	});
});
