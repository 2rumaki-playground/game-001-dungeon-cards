/**
 * ターン管理
 * @see docs/spec/rules.md
 */

import type { GameState } from "../types";
import { resetUsedCards } from "./deck";
import { recordTurnEnd } from "./playStats";
import { changeTurn, setDeck, updateComboHistory } from "./state";

/**
 * プレイヤーターン開始処理
 *
 * 1. 使用済みカードIDリストをリセット
 * 2. ターンをplayerに設定
 */
export function startPlayerTurn(state: GameState): GameState {
	// コンボ履歴リセット
	let next = updateComboHistory(state, null);

	// 使用済みカードIDリストをリセット
	next = setDeck(next, resetUsedCards(next.deck));

	// ターンをplayerに設定
	next = changeTurn(next, "player");

	return next;
}

/**
 * プレイヤーターン終了処理
 *
 * 1. 敵ターンへ遷移（手札はそのまま保持）
 */
export function endPlayerTurn(state: GameState): GameState {
	recordTurnEnd();

	// 敵ターンへ遷移
	const next = changeTurn(state, "enemy");

	return next;
}
