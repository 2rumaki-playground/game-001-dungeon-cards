/**
 * カード関連の型定義
 * @see docs/spec/mvp/cards.md
 */

/**
 * カード種別
 */
export type CardType = "move" | "attack" | "strong_attack" | "jump" | "wait";

/**
 * カードキーワード（属性）
 */
export type Keyword = "flame" | "water";

/**
 * カードレアリティ
 */
export type Rarity = "common" | "uncommon" | "rare";

/**
 * カード
 */
export type Card = {
	id: string;
	type: CardType;
	keyword: Keyword;
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
