/**
 * ターン管理
 * @see docs/spec/mvp/rules.md
 */

import { TURN_START_AP } from "../constants";
import type { GameState } from "../types";
import { discardHand, drawCards } from "./deck";
import { recordTurnEnd } from "./playStats";
import { changeTurn, setDeck, updatePlayer } from "./state";

/**
 * プレイヤーターン開始処理
 *
 * 1. APを最大値にリセット
 * 2. 手札を上限まで補充
 * 3. ターンをplayerに設定
 */
export function startPlayerTurn(state: GameState): GameState {
	// APリセット
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: TURN_START_AP,
	}));

	// 手札補充
	next = setDeck(next, drawCards(next.deck));

	// ターンをplayerに設定
	next = changeTurn(next, "player");

	return next;
}

/**
 * プレイヤーターン終了処理
 *
 * 1. 手札をすべて捨て札へ移動
 * 2. 敵ターンへ遷移
 */
export function endPlayerTurn(state: GameState): GameState {
	recordTurnEnd();

	// 手札を捨て札へ
	let next = setDeck(state, discardHand(state.deck));

	// 敵ターンへ遷移
	next = changeTurn(next, "enemy");

	return next;
}
