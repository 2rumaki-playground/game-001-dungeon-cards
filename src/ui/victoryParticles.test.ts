/**
 * 勝利パーティクル設定のテスト
 */

import { describe, expect, it } from "vitest";
import { createConfettiConfig, createGlowConfig } from "./victoryParticles";

describe("createConfettiConfig", () => {
	it("originが画面上部中央に設定される", () => {
		const config = createConfettiConfig(400, 600);
		expect(config.origin.x).toBe(200);
		expect(config.origin.y).toBe(0);
	});

	it("randomパターンが使用される", () => {
		const config = createConfettiConfig(400, 600);
		expect(config.pattern.type).toBe("random");
	});

	it("パーティクル数が30個", () => {
		const config = createConfettiConfig(400, 600);
		expect(config.count).toBe(30);
	});

	it("重力が設定される（ゆっくり落下）", () => {
		const config = createConfettiConfig(400, 600);
		expect(config.gravity).toBeDefined();
		expect(config.gravity).toBeGreaterThan(0);
	});

	it("複数色が使用される（金,赤,青,緑,白）", () => {
		const config = createConfettiConfig(400, 600);
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		expect(colors.length).toBeGreaterThanOrEqual(5);
	});

	it("寿命が長め（2000ms以上）", () => {
		const config = createConfettiConfig(400, 600);
		expect(config.life.min).toBeGreaterThanOrEqual(2000);
		expect(config.life.max).toBeGreaterThanOrEqual(3000);
	});
});

describe("createGlowConfig", () => {
	it("originが画面中央に設定される", () => {
		const config = createGlowConfig(400, 600);
		expect(config.origin.x).toBe(200);
		expect(config.origin.y).toBe(300);
	});

	it("radialパターンが使用される", () => {
		const config = createGlowConfig(400, 600);
		expect(config.pattern.type).toBe("radial");
	});

	it("パーティクル数が20個", () => {
		const config = createGlowConfig(400, 600);
		expect(config.count).toBe(20);
	});

	it("金・黄・白系の色が使用される", () => {
		const config = createGlowConfig(400, 600);
		const colors = Array.isArray(config.color) ? config.color : [config.color];
		expect(colors.length).toBeGreaterThanOrEqual(3);
	});

	it("寿命が1000〜2000ms", () => {
		const config = createGlowConfig(400, 600);
		expect(config.life.min).toBeGreaterThanOrEqual(1000);
		expect(config.life.max).toBeLessThanOrEqual(2000);
	});

	it("速度が遅め", () => {
		const config = createGlowConfig(400, 600);
		expect(config.speed.max).toBeLessThanOrEqual(0.1);
	});
});
