/**
 * ランイベントログ管理
 */

import type { GameState, RunEvent } from "../types";

/**
 * ランイベントをイミュータブルに追加
 */
export function addRunEvent(state: GameState, event: RunEvent): GameState {
	return {
		...state,
		eventLog: [...state.eventLog, event],
	};
}
