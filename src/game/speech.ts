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
 * 発話ログを追加（連続発話 > マイルストーン発話 > コンテキスト発話 > レア(デフォルト時) > 通常デフォルトの優先順位）
 *
 * 直前イベントとの組み合わせで連続発話パターンがあればそちらを最優先。
 * Math.random()を使用し、ゲームRNGには影響しない。
 */
export function addSpeechLog(
	state: GameState,
	eventType: SpeechEventType,
): GameState {
	// 1. 連続発話パターン（直前イベント参照）
	const prevEventType = state.speechLog?.eventType;
	if (prevEventType) {
		const key = `${prevEventType}_${eventType}` as const;
		const seqVariants = SPEECH_SEQUENCE_VARIANTS[state.personality][key];
		if (seqVariants && seqVariants.length > 0) {
			const index = Math.floor(Math.random() * seqVariants.length);
			return setSpeechLog(state, eventType, seqVariants[index]);
		}
	}

	// 2. マイルストーン発話（判定→発話→フラグ更新をアトミックに実行）
	const milestone = checkMilestone(state, eventType);
	if (milestone) {
		const msVariants = MILESTONE_SPEECH_VARIANTS[state.personality][milestone];
		const msIndex = Math.floor(Math.random() * msVariants.length);
		const msState = setSpeechLog(state, eventType, msVariants[msIndex]);
		return {
			...msState,
			achievedMilestones: addMilestone(msState.achievedMilestones, milestone),
		};
	}

	// 3. コンテキスト発話
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

	// 4. フォールバック: レア判定 → デフォルトバリエーション
	const rareVariants = RARE_SPEECH_VARIANTS[state.personality][eventType];
	if (
		rareVariants &&
		rareVariants.length > 0 &&
		Math.random() < RARE_SPEECH_RATE
	) {
		const rareIndex = Math.floor(Math.random() * rareVariants.length);
		return setSpeechLog(state, eventType, rareVariants[rareIndex]);
	}

	const variants = SPEECH_VARIANTS[state.personality][eventType];
	const index = Math.floor(Math.random() * variants.length);
	return setSpeechLog(state, eventType, variants[index]);
}
