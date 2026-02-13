/**
 * プレイ統計の型定義
 */

import type { CardType } from "./card";

/**
 * プレイ結果
 */
export type PlayResult = "clear" | "death";

/**
 * 死因
 */
export type DeathCause = "enemy_attack" | "trap" | "unknown";

/**
 * 1ランのプレイセッション共通フィールド
 */
type PlaySessionBase = {
	/** セッションID */
	id: string;
	/** 開始時刻（Unix ms） */
	startedAt: number;
	/** 終了時刻（Unix ms） */
	endedAt: number;
	/** 到達最大階層 */
	maxFloor: number;
	/** カード使用回数（CardType別） */
	cardUsage: Record<CardType, number>;
	/** 与ダメージ合計 */
	totalDamageDealt: number;
	/** 被ダメージ合計 */
	totalDamageTaken: number;
	/** ターン数 */
	playerTurnCount: number;
};

/**
 * 1ランのプレイセッション統計（discriminated union）
 */
export type PlaySession =
	| (PlaySessionBase & { result: "clear"; deathCause: null })
	| (PlaySessionBase & { result: "death"; deathCause: DeathCause });
