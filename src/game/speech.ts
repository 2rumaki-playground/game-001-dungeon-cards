/**
 * キャラクター発話ログ
 * イベントに応じてランダムな発話をGameStateに反映する
 */

import {
	DEEP_FLOOR_THRESHOLD,
	HP_CRITICAL_RATIO,
	HP_TENSION_RATIO,
} from "../constants";
import type { GameState, SpeechEventType } from "../types";
import {
	CONTEXTUAL_SPEECH_VARIANTS,
	type SpeechContext,
} from "./contextualSpeechData";
import { SPEECH_VARIANTS } from "./speechData";
import { setSpeechLog } from "./state";

/**
 * ゲーム状態から該当するコンテキストを判定する
 *
 * 優先順位: hp_critical > hp_tension > deep_floor > consecutive_combo
 */
export function matchesContext(
	state: GameState,
	context: SpeechContext,
): boolean {
	const { hp, maxHp } = state.player;
	switch (context) {
		case "hp_critical":
			return hp > 0 && hp <= maxHp * HP_CRITICAL_RATIO;
		case "hp_tension":
			return hp > 0 && hp < maxHp * HP_TENSION_RATIO;
		case "deep_floor":
			return state.floor >= DEEP_FLOOR_THRESHOLD;
		case "consecutive_combo":
			return state.speechLog?.eventType === "combo_activated";
	}
}

/**
 * 発話ログを追加（コンテキスト別バリエーション優先、フォールバックはデフォルト）
 *
 * Math.random()を使用し、ゲームRNGには影響しない。
 */
export function addSpeechLog(
	state: GameState,
	eventType: SpeechEventType,
): GameState {
	const contextualEntries =
		CONTEXTUAL_SPEECH_VARIANTS[state.personality][eventType];

	if (contextualEntries) {
		for (const entry of contextualEntries) {
			if (matchesContext(state, entry.context)) {
				const index = Math.floor(Math.random() * entry.variants.length);
				const message = entry.variants[index];
				return setSpeechLog(state, eventType, message);
			}
		}
	}

	// フォールバック: デフォルトバリエーション
	const variants = SPEECH_VARIANTS[state.personality][eventType];
	const index = Math.floor(Math.random() * variants.length);
	const message = variants[index];
	return setSpeechLog(state, eventType, message);
}
