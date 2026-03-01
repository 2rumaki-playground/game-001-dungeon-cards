/**
 * キャラクター発話ログ
 * イベントに応じてランダムな発話をGameStateに反映する
 */

import {
	DEEP_FLOOR_THRESHOLD,
	HP_CRITICAL_RATIO,
	HP_TENSION_RATIO,
	RARE_SPEECH_RATE,
} from "../constants";
import type { GameState, MilestoneType, SpeechEventType } from "../types";
import {
	CONTEXTUAL_SPEECH_VARIANTS,
	type SpeechContext,
} from "./contextualSpeechData";
import { checkMilestone } from "./milestone";
import { MILESTONE_SPEECH_VARIANTS } from "./milestoneSpeechData";
import {
	RARE_SPEECH_VARIANTS,
	SPEECH_SEQUENCE_VARIANTS,
	SPEECH_VARIANTS,
} from "./speechData";
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
 * achievedMilestones にマイルストーンを追加した新しいSetを返す
 */
function addMilestone(
	milestones: Set<MilestoneType>,
	milestone: MilestoneType,
): Set<MilestoneType> {
	const next = new Set(milestones);
	next.add(milestone);
	return next;
}

/**
 * マイルストーン発話を生成し、pendingMilestoneをクリアした状態を返す
 */
function emitMilestoneSpeech(
	state: GameState,
	eventType: SpeechEventType,
	milestone: MilestoneType,
): GameState {
	const msVariants = MILESTONE_SPEECH_VARIANTS[state.personality][milestone];
	const msIndex = Math.floor(Math.random() * msVariants.length);
	const msState = setSpeechLog(state, eventType, msVariants[msIndex]);
	return { ...msState, pendingMilestone: null };
}

/**
 * 発話ログを追加（既存pending > 連続発話 > 新規マイルストーン > コンテキスト発話 > レア(デフォルト時) > 通常デフォルトの優先順位）
 *
 * マイルストーン到達は発話選択と独立して常に記録される。
 * 連続発話等でスキップされた場合はpendingMilestoneに保持し、次回最優先で発話する。
 * Math.random()を使用し、ゲームRNGには影響しない。
 */
export function addSpeechLog(
	state: GameState,
	eventType: SpeechEventType,
): GameState {
	// 0. マイルストーン到達の記録（発話選択とは独立して常に判定）
	let currentState = state;
	const prevPending = state.pendingMilestone;
	const newMilestone = checkMilestone(state, eventType);
	if (newMilestone) {
		currentState = {
			...currentState,
			achievedMilestones: addMilestone(
				currentState.achievedMilestones,
				newMilestone,
			),
		};
	}

	// 1. 既存の保留マイルストーン発話（最優先）
	if (prevPending) {
		const stateAfterEmit = emitMilestoneSpeech(
			currentState,
			eventType,
			prevPending,
		);
		// 既存pendingと同時に新規マイルストーン到達した場合、次回に繰り越す
		if (newMilestone && newMilestone !== prevPending) {
			return { ...stateAfterEmit, pendingMilestone: newMilestone };
		}
		return stateAfterEmit;
	}

	// 2. 連続発話パターン（直前イベント参照）
	const prevEventType = currentState.speechLog?.eventType;
	if (prevEventType) {
		const key = `${prevEventType}_${eventType}` as const;
		const seqVariants = SPEECH_SEQUENCE_VARIANTS[currentState.personality][key];
		if (seqVariants && seqVariants.length > 0) {
			const index = Math.floor(Math.random() * seqVariants.length);
			const seqState = setSpeechLog(
				currentState,
				eventType,
				seqVariants[index],
			);
			// 新規マイルストーン到達を連続発話がスキップした場合、pendingに保持
			if (newMilestone) {
				return { ...seqState, pendingMilestone: newMilestone };
			}
			return seqState;
		}
	}

	// 3. 新規マイルストーン発話（連続発話が該当しなかった場合）
	if (newMilestone) {
		return emitMilestoneSpeech(currentState, eventType, newMilestone);
	}

	// 3. コンテキスト発話
	const contextualEntries =
		CONTEXTUAL_SPEECH_VARIANTS[currentState.personality][eventType];

	if (contextualEntries) {
		for (const entry of contextualEntries) {
			if (matchesContext(currentState, entry.context)) {
				const index = Math.floor(Math.random() * entry.variants.length);
				const message = entry.variants[index];
				return setSpeechLog(currentState, eventType, message);
			}
		}
	}

	// 4. フォールバック: レア判定 → デフォルトバリエーション
	const rareVariants =
		RARE_SPEECH_VARIANTS[currentState.personality][eventType];
	if (
		rareVariants &&
		rareVariants.length > 0 &&
		Math.random() < RARE_SPEECH_RATE
	) {
		const rareIndex = Math.floor(Math.random() * rareVariants.length);
		return setSpeechLog(currentState, eventType, rareVariants[rareIndex]);
	}

	const variants = SPEECH_VARIANTS[currentState.personality][eventType];
	const index = Math.floor(Math.random() * variants.length);
	return setSpeechLog(currentState, eventType, variants[index]);
}
