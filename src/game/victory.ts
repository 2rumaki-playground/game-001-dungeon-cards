/**
 * 勝利条件の判定
 * @see docs/spec/rules.md — 勝利条件
 */

import { CLEAR_FLOOR } from "../constants";
import type { EnemyType, GameState } from "../types";

/**
 * 敵撃破時にクリア判定を行う
 *
 * 20Fでbossタイプを撃破した場合に isCleared = true にする。
 * 既にクリア済みの場合は状態を変更しない。
 */
export function checkVictory(
	state: GameState,
	defeatedEnemyType: EnemyType,
): GameState {
	if (state.isCleared) return state;
	if (state.floor !== CLEAR_FLOOR) return state;
	if (defeatedEnemyType !== "boss") return state;

	return { ...state, rng: state.rng.clone(), isCleared: true };
}

/**
 * 階段到達時に勝利画面を表示すべきか判定
 *
 * isCleared が true かつ現在のフロアが CLEAR_FLOOR の場合のみ true。
 * 21F以降（既に通過済み）では表示しない。
 */
export function shouldShowVictoryScreen(state: GameState): boolean {
	return state.isCleared && state.floor === CLEAR_FLOOR;
}
