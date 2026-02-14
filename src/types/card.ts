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
 * デッキ状態
 */
export type DeckState = {
	/** プレイヤーが設定した山札の順番 */
	deckOrder: Card[];
	/** 山札 */
	drawPile: Card[];
	/** 手札 */
	hand: Card[];
	/** 捨て札 */
	discardPile: Card[];
};
