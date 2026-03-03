/**
 * キャラクター発話データ辞書
 * 性格タイプ × イベント種別ごとの発話バリエーションを定義
 */

import type { Personality, SpeechEventType } from "../../types";
import * as brave from "./brave";
import * as cautious from "./cautious";
import * as cheerful from "./cheerful";
import * as curious from "./curious";
import * as stoic from "./stoic";

export const SPEECH_VARIANTS: Record<
	Personality,
	Record<SpeechEventType, readonly string[]>
> = {
	brave: brave.speechVariants,
	cautious: cautious.speechVariants,
	cheerful: cheerful.speechVariants,
	stoic: stoic.speechVariants,
	curious: curious.speechVariants,
} as const;

/**
 * レア発話データ辞書
 * 各性格の"素"が出るギャップ表現（低確率で出現）
 * デフォルト発話選択時のみ判定される
 */
export const RARE_SPEECH_VARIANTS: Record<
	Personality,
	Partial<Record<SpeechEventType, readonly string[]>>
> = {
	brave: brave.rareSpeechVariants,
	cautious: cautious.rareSpeechVariants,
	cheerful: cheerful.rareSpeechVariants,
	stoic: stoic.rareSpeechVariants,
	curious: curious.rareSpeechVariants,
} as const;

/**
 * 連続発話データ辞書
 * キーは "直前イベント_現在イベント" 形式
 * 未定義パターンは通常発話にフォールバック
 */
export const SPEECH_SEQUENCE_VARIANTS: Record<
	Personality,
	Partial<Record<`${SpeechEventType}_${SpeechEventType}`, readonly string[]>>
> = {
	brave: brave.sequenceVariants,
	cautious: cautious.sequenceVariants,
	cheerful: cheerful.sequenceVariants,
	stoic: stoic.sequenceVariants,
	curious: curious.sequenceVariants,
} as const;
