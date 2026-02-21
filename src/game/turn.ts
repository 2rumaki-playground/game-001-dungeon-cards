/**
 * ターン管理
 * @see docs/spec/rules.md
 */

import { TURN_START_AP } from "../constants";
import type { GameState } from "../types";
import { resetUsedCards } from "./deck";
import { recordTurnEnd } from "./playStats";
import { changeTurn, setDeck, updateComboHistory, updatePlayer } from "./state";

/**
 * プレイヤーターン開始処理
 *
 * 1. APを最大値にリセット
 * 2. 使用済みカードIDリストをリセット
 * 3. ターンをplayerに設定
 */
export function startPlayerTurn(state: GameState): GameState {
	// APリセット
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: TURN_START_AP,
	}));

	// コンボ履歴リセット
	next = updateComboHistory(next, null);

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
