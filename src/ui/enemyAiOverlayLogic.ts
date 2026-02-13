/**
 * 敵AI可視化オーバーレイのロジック層
 * 色・alpha設定とパルス計算。PixiJS無依存でテスト可能。
 */

import { COLORS } from "../constants";

export type AiOverlayType = "moveCandidate" | "moveBest" | "attackRange";

export type AiOverlayConfig = {
	color: number;
	alphaMin: number;
	alphaMax: number;
	pulsePeriod: number;
};

const CONFIGS: Record<AiOverlayType, AiOverlayConfig> = {
	moveCandidate: {
		color: COLORS.debugMoveCandidate,
		alphaMin: 0.08,
		alphaMax: 0.2,
		pulsePeriod: 1500,
	},
	moveBest: {
		color: COLORS.debugMoveBest,
		alphaMin: 0.15,
		alphaMax: 0.35,
		pulsePeriod: 1500,
	},
	attackRange: {
		color: COLORS.debugAttackRange,
		alphaMin: 0.08,
		alphaMax: 0.2,
		pulsePeriod: 1200,
	},
};

export function getAiOverlayConfig(type: AiOverlayType): AiOverlayConfig {
	return CONFIGS[type];
}

export function calcAiOverlayPulseAlpha(
	elapsed: number,
	config: AiOverlayConfig,
): number {
	const mid = (config.alphaMin + config.alphaMax) / 2;
	const amp = (config.alphaMax - config.alphaMin) / 2;
	return mid + amp * Math.sin((2 * Math.PI * elapsed) / config.pulsePeriod);
}
