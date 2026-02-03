/**
 * カード関連の型定義
 * @see docs/spec/mvp/cards.md
 */

/**
 * カード種別
 */
export type CardType = "move" | "attack" | "strong_attack" | "rush" | "wait";

/**
 * カード
 */
export type Card = {
	id: string;
	type: CardType;
};

/**
 * デッキ状態
 */
export type DeckState = {
	/** 山札 */
	drawPile: Card[];
	/** 手札 */
	hand: Card[];
	/** 捨て札 */
	discardPile: Card[];
};
