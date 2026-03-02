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
 * ランイベント共通フィールド
 */
type BaseRunEvent<TType extends RunEventType, TDetail> = {
	type: TType;
	/** 発生した階層 */
	floor: number;
	/** 発生したターン */
	turn: number;
	/** イベント固有データ */
	detail: TDetail;
};

export type BossDefeatedRunEvent = BaseRunEvent<
	"boss_defeated",
	{ enemyType: EnemyType }
>;

export type MinibossDefeatedRunEvent = BaseRunEvent<
	"miniboss_defeated",
	{ enemyType: "miniboss" }
>;

export type CloseCallDefeatRunEvent = BaseRunEvent<
	"close_call_defeat",
	{ remainingHpRatio: number; enemyType: EnemyType }
>;

export type CardLevelUpRunEvent = BaseRunEvent<
	"card_level_up",
	{ cardType: CardType; newLevel: number }
>;

export type CardAcquiredRunEvent = BaseRunEvent<
	"card_acquired",
	{ cardType: CardType }
>;

/**
 * ランイベント（イベントログ用）
 */
export type RunEvent =
	| BossDefeatedRunEvent
	| MinibossDefeatedRunEvent
	| CloseCallDefeatRunEvent
	| CardLevelUpRunEvent
	| CardAcquiredRunEvent;

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
