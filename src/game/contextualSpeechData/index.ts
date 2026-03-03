/**
 * 状況依存セリフ（コンテキスト発話）データ
 * HP残量・階層・コンボ連続などの状況に応じた発話バリエーション
 */

import type { Personality, SpeechEventType } from "../../types";
import { contextualVariants as braveVariants } from "./brave";
import { contextualVariants as cautiousVariants } from "./cautious";
import { contextualVariants as cheerfulVariants } from "./cheerful";
import { contextualVariants as curiousVariants } from "./curious";
import { contextualVariants as stoicVariants } from "./stoic";

/**
 * 発話コンテキスト種別
 * - hp_critical: HP ≤ maxHp × 0.25（瀕死）
 * - hp_tension: HP < maxHp × 0.75（緊張）
 * - deep_floor: floor ≥ DEEP_FLOOR_THRESHOLD
 * - consecutive_combo: 直前の発話が combo_activated
 */
export type SpeechContext =
	| "hp_critical"
	| "hp_tension"
	| "deep_floor"
	| "consecutive_combo";

export type ContextualSpeechEntry = {
	context: SpeechContext;
	variants: readonly string[];
};

/**
 * コンテキスト別発話バリエーション
 *
 * 各エントリは優先度順（hp_critical > hp_tension > deep_floor > consecutive_combo）
 * に並べる。最初にマッチしたコンテキストのバリエーションが使用される。
 */
export const CONTEXTUAL_SPEECH_VARIANTS: Record<
	Personality,
	Partial<Record<SpeechEventType, readonly ContextualSpeechEntry[]>>
> = {
	brave: braveVariants,
	cautious: cautiousVariants,
	cheerful: cheerfulVariants,
	stoic: stoicVariants,
	curious: curiousVariants,
} as const;
