/**
 * デバッグミドルウェア
 *
 * ゲームロジック関数をデバッグチートでラップする。
 * ゲームロジック層（combat.ts, enemyAi.ts）が debugCheats に依存しないようにするための中間レイヤー。
 */

import type { GameState } from "../types";
import { applyDamageToPlayer } from "./combat";
import { getDebugCheats } from "./debugCheats";
import { type EnemyTurnResult, executeEnemyTurn } from "./enemyAi";

/**
 * applyDamageToPlayer のデバッグラッパー
 *
 * 無敵チートON時はダメージをスキップする。
 */
export function applyDamageToPlayerWithDebug(
	state: GameState,
	damage: number,
): GameState {
	if (import.meta.env.DEV && getDebugCheats().invincible) return state;
	return applyDamageToPlayer(state, damage);
}

/**
 * executeEnemyTurn のデバッグラッパー
 *
 * - 敵行動スキップチートON時は敵ターンをスキップする。
 * - 敵AI可視化チートON時は詳細ログを出力する。
 */
export function executeEnemyTurnWithDebug(state: GameState): EnemyTurnResult {
	if (import.meta.env.DEV && getDebugCheats().skipEnemyTurn) {
		return { state, totalDamage: 0 };
	}
	const verbose = import.meta.env.DEV && getDebugCheats().showEnemyAi;
	return executeEnemyTurn(state, { verbose });
}
