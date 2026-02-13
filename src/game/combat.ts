/**
 * 戦闘システム（ダメージ・死亡処理）
 * @see docs/spec/mvp/rules.md
 */

import type { GameState } from "../types";
import { getDebugCheats } from "./debugCheats";
import { recordDamageDealt, recordDamageTaken } from "./playStats";
import {
	addActionLog,
	addRemnant,
	changeScreen,
	removeEnemy,
	updateEnemy,
	updatePlayer,
} from "./state";
import { checkVictory } from "./victory";

/**
 * HP0以下で撃破判定
 */
export function isDefeated(hp: number): boolean {
	return hp <= 0;
}

/**
 * 敵にダメージを適用
 *
 * - 敵HPからダメージを減算
 * - HP0以下なら敵をマップから除去
 * - 行動ログを記録
 */
export function applyDamageToEnemy(
	state: GameState,
	enemyId: string,
	damage: number,
): GameState {
	// 対象の敵が存在しない場合は何もしない
	const enemy = state.enemies.find((e) => e.id === enemyId);
	if (!enemy) {
		return state;
	}

	recordDamageDealt(Math.min(damage, enemy.hp));

	let next = updateEnemy(state, enemyId, (e) => ({
		...e,
		hp: e.hp - damage,
	}));

	const target = next.enemies.find((e) => e.id === enemyId);
	if (target && isDefeated(target.hp)) {
		next = addRemnant(next, target.position);
		next = removeEnemy(next, enemyId);
		next = {
			...next,
			rng: next.rng.clone(),
			defeatedEnemyCount: next.defeatedEnemyCount + 1,
		};
		next = checkVictory(next, target.type);
		return addActionLog(next, "敵を倒した", "system");
	}

	return addActionLog(next, "敵にダメージを与えた", "system");
}

/**
 * プレイヤーにダメージを適用
 *
 * - プレイヤーHPからダメージを減算
 * - 行動ログを記録
 * - ゲームオーバー判定は別関数（checkGameOver）で行う
 */
export function applyDamageToPlayer(
	state: GameState,
	damage: number,
): GameState {
	if (import.meta.env.DEV && getDebugCheats().invincible) return state;

	const actualDamage = Math.min(damage, state.player.hp);
	recordDamageTaken(actualDamage);

	let next = updatePlayer(state, (p) => ({
		...p,
		hp: p.hp - damage,
	}));

	next = addActionLog(next, "プレイヤーがダメージを受けた", "system");

	return next;
}

/**
 * プレイヤー死亡判定とゲームオーバー遷移
 *
 * - HP0以下ならゲームオーバー画面に遷移
 * - HP1以上なら状態を変更せずそのまま返す
 */
export function checkGameOver(state: GameState): GameState {
	if (!isDefeated(state.player.hp)) {
		return state;
	}

	let next = changeScreen(state, "gameOver");
	next = addActionLog(next, "ゲームオーバー", "system");

	return next;
}
