/**
 * ボス特殊スキル
 * @see docs/spec/rules.md
 * @see docs/spec/constants.md
 */

import { BOSS_SKILL, ENEMY_PARAMS } from "../constants";
import type { Enemy, GameState } from "../types";
import type { RNG } from "../utils/rng";
import { applyDamageToPlayer } from "./combat";
import { isAdjacent, manhattanDistance } from "./positionUtils";
import { addActionLog, updateEnemy } from "./state";

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

/**
 * ミニボスのスキル決定
 *
 * 移動後に確率でpower_strikeを予告する
 */
export function decideMinibossSkill(enemy: Enemy, rng: RNG): Enemy {
	if (enemy.pendingSkill) return enemy;

	const roll = rng.random();
	if (roll < BOSS_SKILL.powerStrikeChance) {
		return { ...enemy, pendingSkill: { type: "power_strike" } };
	}
	return enemy;
}

/**
 * ボスのスキル決定
 *
 * 移動後に確率でarea_attackを予告する
 */
export function decideBossSkill(enemy: Enemy, rng: RNG): Enemy {
	if (enemy.pendingSkill) return enemy;

	const roll = rng.random();
	if (roll < BOSS_SKILL.areaAttackChance) {
		return { ...enemy, pendingSkill: { type: "area_attack" } };
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
 * 予告済みスキルの発動
 *
 * pendingSkillが設定されている敵のスキルを実行し、pendingSkillをクリアする
 */
export function executePendingSkill(
	state: GameState,
	enemy: Enemy,
): SkillResult {
	if (!enemy.pendingSkill) {
		return { state, damage: 0, executed: false };
	}

	const skill = enemy.pendingSkill;

	switch (skill.type) {
		case "power_strike":
			if (enemy.type !== "miniboss") {
				const next = updateEnemy(state, enemy.id, (e) => ({
					...e,
					pendingSkill: undefined,
				}));
				return { state: next, damage: 0, executed: false };
			}
			return executePowerStrike(state, enemy);
		case "area_attack":
			if (enemy.type !== "boss") {
				const next = updateEnemy(state, enemy.id, (e) => ({
					...e,
					pendingSkill: undefined,
				}));
				return { state: next, damage: 0, executed: false };
			}
			return executeAreaAttack(state, enemy);
		default: {
			// 想定外のスキルtypeの場合はpendingSkillをクリアして未実行扱い
			const next = updateEnemy(state, enemy.id, (e) => ({
				...e,
				pendingSkill: undefined,
			}));
			return { state: next, damage: 0, executed: false };
		}
	}
}

/**
 * 強化攻撃の実行
 *
 * 隣接プレイヤーに通常攻撃の2倍ダメージを与える
 */
function executePowerStrike(state: GameState, enemy: Enemy): SkillResult {
	// pendingSkillをクリア
	let next = updateEnemy(state, enemy.id, (e) => ({
		...e,
		pendingSkill: undefined,
	}));

	if (!isAdjacent(enemy.position, state.player.position)) {
		return { state: next, damage: 0, executed: false };
	}

	const params = ENEMY_PARAMS[enemy.type];
	const damage = params.attackDamage * BOSS_SKILL.powerStrikeMultiplier;
	next = applyDamageToPlayer(next, damage);
	next = addActionLog(next, "ミニボスが強化攻撃を放った");

	return { state: next, damage, executed: true };
}

/**
 * 範囲攻撃の実行
 *
 * マンハッタン距離2以内のプレイヤーにダメージを与える
 */
function executeAreaAttack(state: GameState, enemy: Enemy): SkillResult {
	// pendingSkillをクリア
	let next = updateEnemy(state, enemy.id, (e) => ({
		...e,
		pendingSkill: undefined,
	}));

	const dist = manhattanDistance(enemy.position, state.player.position);
	if (dist > BOSS_SKILL.areaAttackRange) {
		return { state: next, damage: 0, executed: false };
	}

	const damage = BOSS_SKILL.areaAttackDamage;
	next = applyDamageToPlayer(next, damage);
	next = addActionLog(next, "ボスが範囲攻撃を放った");

	return { state: next, damage, executed: true };
}
