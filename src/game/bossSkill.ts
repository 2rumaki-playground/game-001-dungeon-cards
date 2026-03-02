/**
 * ボス特殊スキル
 * @see docs/spec/rules.md
 * @see docs/spec/constants.md
 */

import { BOSS_SKILL, ENEMY_PARAMS } from "../constants";
import type { Enemy, GameState } from "../types";
import type { RNG } from "../utils/rng";
import { applyEnemyDamageToPlayer } from "./combat";
import { isAdjacent, manhattanDistance } from "./positionUtils";
import { addActionLog } from "./state";

/**
 * ボスの激昂チェック
 *
 * HP閾値以下のボス敵に激昂状態を付与する（1回限り）
 */
export function checkEnrage(enemy: Enemy): Enemy {
	if (enemy.type !== "boss") return enemy;
	if (enemy.enraged) return enemy;

	const threshold = enemy.maxHp * BOSS_SKILL.enrageThreshold;
	if (enemy.hp <= threshold) {
		return { ...enemy, enraged: true };
	}
	return enemy;
}

/** スキル発動結果 */
export type SkillResult = {
	state: GameState;
	damage: number;
	executed: boolean;
};

/**
 * ミニボスのスキル即発動判定
 *
 * RNG判定→隣接チェック→即ダメージ
 */
export function tryMinibossSkill(
	state: GameState,
	enemy: Enemy,
	rng: RNG,
	applyPlayerDamage: typeof applyEnemyDamageToPlayer = applyEnemyDamageToPlayer,
): SkillResult {
	if (enemy.type !== "miniboss") {
		return { state, damage: 0, executed: false };
	}

	const roll = rng.random();
	if (roll >= BOSS_SKILL.powerStrikeChance) {
		return { state, damage: 0, executed: false };
	}

	if (!isAdjacent(enemy.position, state.player.position)) {
		return { state, damage: 0, executed: false };
	}

	const params = ENEMY_PARAMS[enemy.type];
	const damage = Math.floor(
		params.attackDamage * BOSS_SKILL.powerStrikeMultiplier,
	);
	let next = applyPlayerDamage(state, damage, enemy.type);
	next = addActionLog(next, "ミニボスが強化攻撃を放った", "enemy");

	return { state: next, damage, executed: true };
}

/**
 * ボスのスキル即発動判定
 *
 * RNG判定→射程チェック→即ダメージ
 */
export function tryBossSkill(
	state: GameState,
	enemy: Enemy,
	rng: RNG,
	applyPlayerDamage: typeof applyEnemyDamageToPlayer = applyEnemyDamageToPlayer,
): SkillResult {
	if (enemy.type !== "boss") {
		return { state, damage: 0, executed: false };
	}

	const roll = rng.random();
	if (roll >= BOSS_SKILL.areaAttackChance) {
		return { state, damage: 0, executed: false };
	}

	const dist = manhattanDistance(enemy.position, state.player.position);
	if (dist > BOSS_SKILL.areaAttackRange) {
		return { state, damage: 0, executed: false };
	}

	const damage = BOSS_SKILL.areaAttackDamage;
	let next = applyPlayerDamage(state, damage, enemy.type);
	next = addActionLog(next, "ボスが範囲攻撃を放った", "enemy");

	return { state: next, damage, executed: true };
}
