/**
 * キャラクター発話ログ
 * イベントに応じてランダムな発話をGameStateに反映する
 */

import type { GameState, SpeechEventType } from "../types";
import { SPEECH_VARIANTS } from "./speechData";
import { setSpeechLog } from "./state";

/**
 * 発話ログを追加（バリエーションからランダム選択）
 *
 * Math.random()を使用し、ゲームRNGには影響しない。
 */
export function addSpeechLog(
	state: GameState,
	eventType: SpeechEventType,
): GameState {
	const variants = SPEECH_VARIANTS[state.personality][eventType];
	const index = Math.floor(Math.random() * variants.length);
	const message = variants[index];
	return setSpeechLog(state, eventType, message);
}
