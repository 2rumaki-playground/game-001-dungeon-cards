import { COLORS } from "../constants";
import type { SpecialTileType } from "../types/map";

export type SpecialTileEffectConfig = {
	/** パルスアニメーションの周期（ms） */
	pulsePeriod: number;
	/** パルスのalpha最小値 */
	pulseAlphaMin: number;
	/** パルスのalpha最大値 */
	pulseAlphaMax: number;
	/** グロー色 */
	glowColor: number;
	/** グローの半径（セルサイズに対する比率） */
	glowRadius: number;
};

const CONFIGS: Record<SpecialTileType, SpecialTileEffectConfig> = {
	trap: {
		pulsePeriod: 1500,
		pulseAlphaMin: 0.15,
		pulseAlphaMax: 0.4,
		glowColor: COLORS.trap,
		glowRadius: 0.35,
	},
	treasure: {
		pulsePeriod: 2500,
		pulseAlphaMin: 0.1,
		pulseAlphaMax: 0.35,
		glowColor: COLORS.treasure,
		glowRadius: 0.4,
	},
	rest_area: {
		pulsePeriod: 3000,
		pulseAlphaMin: 0.1,
		pulseAlphaMax: 0.3,
		glowColor: COLORS.restArea,
		glowRadius: 0.35,
	},
};

const STAIRS_NORMAL: SpecialTileEffectConfig = {
	pulsePeriod: 3000,
	pulseAlphaMin: 0.08,
	pulseAlphaMax: 0.25,
	glowColor: COLORS.stairs,
	glowRadius: 0.35,
};

const STAIRS_CLEARED: SpecialTileEffectConfig = {
	pulsePeriod: 1200,
	pulseAlphaMin: 0.2,
	pulseAlphaMax: 0.55,
	glowColor: COLORS.stairs,
	glowRadius: 0.45,
};

/**
 * 階段タイルのエフェクト設定を取得
 * @param floorCleared フロアクリア状態（全敵撃破済み）
 */
export function getStairsEffectConfig(
	floorCleared: boolean,
): SpecialTileEffectConfig {
	return floorCleared ? STAIRS_CLEARED : STAIRS_NORMAL;
}

export function getSpecialTileEffectConfig(
	tileType: SpecialTileType,
): SpecialTileEffectConfig {
	return CONFIGS[tileType];
}

export function calcPulseAlpha(
	elapsed: number,
	config: SpecialTileEffectConfig,
): number {
	const mid = (config.pulseAlphaMin + config.pulseAlphaMax) / 2;
	const amp = (config.pulseAlphaMax - config.pulseAlphaMin) / 2;
	return mid + amp * Math.sin((2 * Math.PI * elapsed) / config.pulsePeriod);
}
