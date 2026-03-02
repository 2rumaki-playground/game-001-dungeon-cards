/**
 * リザルト画面の型定義
 * @see docs/spec/rules.md
 */

import type { Card, CardType } from "./card";
import type { EnemyType } from "./character";
import type { Personality, SpeechLogEntry } from "./game";

/**
 * ランイベント種別
 */
export type RunEventType =
	| "boss_defeated"
	| "miniboss_defeated"
	| "close_call_defeat"
	| "card_level_up"
	| "card_acquired";

/**
 * ランイベント（イベントログ用）
 */
export type RunEvent = {
	type: RunEventType;
	/** 発生した階層 */
	floor: number;
	/** 発生したターン */
	turn: number;
	/** イベント固有データ */
	detail:
		| { enemyType: EnemyType }
		| { cardType: CardType; newLevel: number }
		| { cardType: CardType }
		| { remainingHpRatio: number; enemyType: EnemyType };
};

/**
 * ハイライト表示用データ
 */
export type HighlightEntry = {
	event: RunEvent;
	/** 表示用テキスト */
	text: string;
	/** スコア（ソート用、外部非公開） */
	score: number;
};

/**
 * リザルト画面に渡すデータ
 */
export type ResultData = {
	/** ラン結果（クリア or 死亡） */
	result: "clear" | "death";
	/** 到達最大階層 */
	maxFloor: number;
	/** 総ターン数 */
	totalTurns: number;
	/** 与ダメージ合計 */
	totalDamageDealt: number;
	/** 被ダメージ合計 */
	totalDamageTaken: number;
	/** 最終手札 */
	hand: Card[];
	/** MVPカード（手札が空の場合null） */
	mvpCard: Card | null;
	/** ハイライト一覧 */
	highlights: HighlightEntry[];
	/** キャラクター性格 */
	personality: Personality;
	/** 最終発話ログ */
	speechLog: SpeechLogEntry | null;
};
