/**
 * 敵撃破による確率制カード獲得システムの型定義
 * @see docs/spec/deckbuilding.md
 */

import type { CardType } from "./card";
import type { EnemyType } from "./character";

/**
 * 敵種ごとのドロップ設定
 */
export type CardDropConfig = {
	cardType: CardType;
	dropRate: number;
};

/**
 * プレイヤーの条件カウンター（ランごとに累計、UI/統計用）
 */
export type AcquisitionCounters = {
	defeatCounts: Record<EnemyType, number>;
	hitCounts: Record<EnemyType, number>;
};

/**
 * カード交換キューのエントリ
 */
export type CardExchangeEntry = {
	acquiredCardType: CardType;
	defeatedEnemyType: EnemyType;
};
