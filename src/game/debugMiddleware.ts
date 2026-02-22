/**
 * デバッグミドルウェア
 *
 * ゲームロジック関数をデバッグチートでラップする。
 * ゲームロジック層（combat.ts, enemyAi.ts）が debugCheats に依存しないようにするための中間レイヤー。
 */

import type { EnemyType, GameState } from "../types";
import { applyDamageToPlayer, applyEnemyDamageToPlayer } from "./combat";
import { getDebugCheats } from "./debugCheats";
import { type EnemyTurnResult, executeEnemyTurn } from "./enemyAi";

/**
 * applyDamageToPlayer のデバッグラッパー
 *
 * 無敵チートの判定は applyDamageToPlayer 内で行われる。
 */
export function applyDamageToPlayerWithDebug(
	state: GameState,
	damage: number,
): GameState {
	return applyDamageToPlayer(state, damage);
}

/**
 * applyEnemyDamageToPlayer のデバッグラッパー
 *
 * 無敵チートON時はダメージをスキップする。
 */
function applyEnemyDamageToPlayerWithDebug(
	state: GameState,
	damage: number,
	enemyType: EnemyType,
): GameState {
	if (import.meta.env.DEV && getDebugCheats().invincible) {
		return {
			...state,
			lastAttackerEnemyType: enemyType,
		};
	}
	return applyEnemyDamageToPlayer(state, damage, enemyType);
}

/**
 * executeEnemyTurn のデバッグラッパー
 *
 * - 敵行動スキップチートON時は敵ターンをスキップする。
 * - 無敵チートON時は敵攻撃ダメージをスキップする。
 * - 敵AI可視化チートON時は詳細ログを出力する。
 */
export function executeEnemyTurnWithDebug(state: GameState): EnemyTurnResult {
	if (import.meta.env.DEV && getDebugCheats().skipEnemyTurn) {
		return { state, totalDamage: 0 };
	}
	const verbose = import.meta.env.DEV && getDebugCheats().showEnemyAi;
	const invincible = import.meta.env.DEV && getDebugCheats().invincible;
	return executeEnemyTurn(state, {
		verbose,
		...(invincible && {
			applyPlayerDamage: applyEnemyDamageToPlayerWithDebug,
		}),
	});
}
