import { describe, expect, it } from "vitest";
import {
	createBgParticleConfig,
	getButtonDelay,
	INTRO_TIMING,
} from "./titleAnimation";

describe("titleAnimation", () => {
	describe("getButtonDelay", () => {
		it("最初のボタンはbuttonDelayと同値", () => {
			expect(getButtonDelay(0)).toBe(INTRO_TIMING.buttonDelay);
		});

		it("2番目のボタンはbuttonDelay + buttonStagger", () => {
			expect(getButtonDelay(1)).toBe(
				INTRO_TIMING.buttonDelay + INTRO_TIMING.buttonStagger,
			);
		});

		it("インデックスに比例してスタガーが増加", () => {
			const delay0 = getButtonDelay(0);
			const delay1 = getButtonDelay(1);
			const delay2 = getButtonDelay(2);
			expect(delay1 - delay0).toBe(INTRO_TIMING.buttonStagger);
			expect(delay2 - delay1).toBe(INTRO_TIMING.buttonStagger);
		});
	});

	describe("createBgParticleConfig", () => {
		it("originが画面中央になる", () => {
			const config = createBgParticleConfig(800, 600);
			expect(config.origin).toEqual({ x: 400, y: 300 });
		});

		it("パーティクル数が正の値", () => {
			const config = createBgParticleConfig(800, 600);
			expect(config.count).toBeGreaterThan(0);
		});

		it("色配列が空でない", () => {
			const config = createBgParticleConfig(800, 600);
			expect(Array.isArray(config.color)).toBe(true);
			expect((config.color as number[]).length).toBeGreaterThan(0);
		});

		it("パターンがrandom", () => {
			const config = createBgParticleConfig(800, 600);
			expect(config.pattern.type).toBe("random");
		});
	});
});
