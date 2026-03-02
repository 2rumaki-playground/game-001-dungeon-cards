/**
 * ランイベントログ管理
 */

import type { GameState, RunEvent } from "../types";

/** ランイベントログの最大保持件数 */
const MAX_EVENT_LOG_LENGTH = 200;

/**
 * ランイベントをイミュータブルに追加
 */
export function addRunEvent(state: GameState, event: RunEvent): GameState {
	return {
		...state,
		eventLog: [...state.eventLog, event].slice(-MAX_EVENT_LOG_LENGTH),
	};
}
