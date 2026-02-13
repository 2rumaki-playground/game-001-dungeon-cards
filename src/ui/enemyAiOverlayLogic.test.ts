import { describe, expect, it } from "vitest";
import { COLORS } from "../constants";
import {
	calcAiOverlayPulseAlpha,
	getAiOverlayConfig,
} from "./enemyAiOverlayLogic";

describe("getAiOverlayConfig", () => {
	it("moveCandidate設定が返される", () => {
		const config = getAiOverlayConfig("moveCandidate");
		expect(config.color).toBe(COLORS.debugMoveCandidate);
		expect(config.alphaMin).toBeLessThan(config.alphaMax);
	});

	it("moveBest設定が返される", () => {
		const config = getAiOverlayConfig("moveBest");
		expect(config.color).toBe(COLORS.debugMoveBest);
		expect(config.alphaMin).toBeLessThan(config.alphaMax);
	});

	it("attackRange設定が返される", () => {
		const config = getAiOverlayConfig("attackRange");
		expect(config.color).toBe(COLORS.debugAttackRange);
		expect(config.alphaMin).toBeLessThan(config.alphaMax);
	});
});

describe("calcAiOverlayPulseAlpha", () => {
	it("alphaMin～alphaMaxの範囲内で変動する", () => {
		const config = getAiOverlayConfig("moveCandidate");
		for (let t = 0; t < 2000; t += 100) {
			const alpha = calcAiOverlayPulseAlpha(t, config);
			expect(alpha).toBeGreaterThanOrEqual(config.alphaMin - 0.001);
			expect(alpha).toBeLessThanOrEqual(config.alphaMax + 0.001);
		}
	});

	it("t=0のときalphaがmidになる", () => {
		const config = getAiOverlayConfig("moveBest");
		const alpha = calcAiOverlayPulseAlpha(0, config);
		const mid = (config.alphaMin + config.alphaMax) / 2;
		expect(alpha).toBeCloseTo(mid, 3);
	});
});
