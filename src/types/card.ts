/**
 * カード関連の型定義
 * @see docs/spec/mvp/cards.md
 */

/**
 * カード種別
 */
export type CardType = "move" | "attack" | "strong_attack" | "jump" | "wait";

/**
 * カード統計情報
 */
export type CardStats = {
	/** 使用回数 */
	useCount: number;
	/** 撃破数 */
	defeatCount: number;
	/** 最大単発ダメージ */
	maxSingleDamage: number;
};

/**
 * カード
 */
export type Card = {
	id: string;
	type: CardType;
	level: number;
	exp: number;
	stats: CardStats;
};

/**
 * デッキ状態（固定手札方式）
 */
export type DeckState = {
	/** 手札（固定4枚、交換のみで変化） */
	hand: Card[];
	/** ターン内使用済みカードID（ターン開始時にリセット） */
	usedCardIds: string[];
};
