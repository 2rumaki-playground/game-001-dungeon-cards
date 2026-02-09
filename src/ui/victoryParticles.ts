/**
 * 勝利画面専用パーティクル設定
 * 紙吹雪と光の粒子で祝福的な演出を実現する
 */

import type { ParticleConfig } from "./particleLogic";

/**
 * 紙吹雪パーティクル設定を生成
 * 画面上部中央から降り注ぐカラフルな紙吹雪
 */
export function createConfettiConfig(
	screenWidth: number,
	_screenHeight: number,
): ParticleConfig {
	return {
		count: 30,
		origin: { x: screenWidth / 2, y: 0 },
		color: [0xffd700, 0xff4444, 0x4488ff, 0x44cc44, 0xffffff],
		speed: { min: 0.02, max: 0.08 },
		life: { min: 2000, max: 4000 },
		size: { min: 2, max: 5 },
		pattern: { type: "random" },
		gravity: 0.0002,
	};
}

/**
 * 光の粒子パーティクル設定を生成
 * 画面中央から放射状に広がる金色の光
 */
export function createGlowConfig(
	screenWidth: number,
	screenHeight: number,
): ParticleConfig {
	return {
		count: 20,
		origin: { x: screenWidth / 2, y: screenHeight / 2 },
		color: [0xffd700, 0xffff44, 0xffffff],
		speed: { min: 0.02, max: 0.06 },
		life: { min: 1000, max: 2000 },
		size: { min: 1, max: 3 },
		pattern: { type: "radial" },
	};
}
