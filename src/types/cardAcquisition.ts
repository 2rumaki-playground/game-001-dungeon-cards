/**
 * 敵撃破による条件付きカード獲得システムの型定義
 * @see docs/spec/deckbuilding.md
 */

import type { CardType } from "./card";
import type { EnemyType } from "./character";

/**
 * 獲得条件の種類
 */
export type AcquisitionConditionType = "defeat_count" | "hit_count";

/**
 * 個別条件
 */
export type AcquisitionCondition = {
	type: AcquisitionConditionType;
	threshold: number;
};

/**
 * 敵種ごとの獲得条件設定
 */
export type EnemyCardAcquisitionConfig = {
	cardType: CardType;
	conditions: AcquisitionCondition[];
	conditionLogic: "and" | "or";
};

/**
 * プレイヤーの条件カウンター（ランごとに累計）
 */
export type AcquisitionCounters = {
	defeatCounts: Record<EnemyType, number>;
	hitCounts: Record<EnemyType, number>;
};

/**
 * カード交換の保留状態（敵撃破時に条件達成した場合にセット）
 */
export type CardExchangeState = {
	acquiredCardType: CardType;
	defeatedEnemyType: EnemyType;
} | null;
