import { BOSS_SKILL, COLORS } from "../constants";
import type { PendingSkillType, Position } from "../types";

export type SkillForecastConfig = {
	pulsePeriod: number;
	pulseAlphaMin: number;
	pulseAlphaMax: number;
	rangeColor: number;
	iconColor: number;
};

const CONFIGS: Record<PendingSkillType, SkillForecastConfig> = {
	power_strike: {
		pulsePeriod: 1200,
		pulseAlphaMin: 0.1,
		pulseAlphaMax: 0.3,
		rangeColor: COLORS.skillPowerStrike,
		iconColor: COLORS.skillPowerStrike,
	},
	area_attack: {
		pulsePeriod: 1000,
		pulseAlphaMin: 0.1,
		pulseAlphaMax: 0.3,
		rangeColor: COLORS.skillAreaAttack,
		iconColor: COLORS.skillAreaAttack,
	},
};

export function getSkillForecastConfig(
	skillType: PendingSkillType,
): SkillForecastConfig {
	return CONFIGS[skillType];
}

export function getAffectedTiles(
	skillType: PendingSkillType,
	enemyPos: Position,
	mapWidth: number,
	mapHeight: number,
): Position[] {
	const range = skillType === "power_strike" ? 1 : BOSS_SKILL.areaAttackRange;
	const tiles: Position[] = [];

	for (let dx = -range; dx <= range; dx++) {
		for (let dy = -range; dy <= range; dy++) {
			if (dx === 0 && dy === 0) continue;
			if (Math.abs(dx) + Math.abs(dy) > range) continue;

			const x = enemyPos.x + dx;
			const y = enemyPos.y + dy;
			if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;

			tiles.push({ x, y });
		}
	}

	return tiles;
}

export function calcForecastPulseAlpha(
	elapsed: number,
	config: SkillForecastConfig,
): number {
	const mid = (config.pulseAlphaMin + config.pulseAlphaMax) / 2;
	const amp = (config.pulseAlphaMax - config.pulseAlphaMin) / 2;
	return mid + amp * Math.sin((2 * Math.PI * elapsed) / config.pulsePeriod);
}
