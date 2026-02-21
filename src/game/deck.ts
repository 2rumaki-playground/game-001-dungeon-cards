/**
 * デッキシステム（固定手札方式）
 * @see docs/spec/rules.md
 * @see docs/spec/cards.md
 */

import { INITIAL_DECK, KEYWORDS } from "../constants";
import type { Card, CardType, DeckState, Keyword } from "../types";
import type { RNG } from "../utils/rng";

/**
 * 手札の全カードを取得
 */
export function getAllCards(deck: DeckState): Card[] {
	return [...deck.hand];
}

/**
 * 手札の枚数を取得
 */
export function getTotalDeckSize(deck: DeckState): number {
	return deck.hand.length;
}

let cardIdCounter = 0;

/**
 * カードIDカウンターをリセット（テスト用）
 */
export function resetCardIdCounter(): void {
	cardIdCounter = 0;
}

/**
 * デッキ内のカードIDからカウンターを初期化（セーブデータ復元用）
 */
export function initCardIdCounterFromDeck(deck: DeckState): void {
	const allCards = getAllCards(deck);
	let maxId = 0;
	for (const card of allCards) {
		const match = card.id.match(/^card-(\d+)$/);
		if (match) {
			maxId = Math.max(maxId, Number(match[1]));
		}
	}
	cardIdCounter = maxId;
}

/**
 * RNGを使ってランダムにキーワードを割り当てる
 */
export function assignRandomKeyword(rng: RNG): Keyword {
	return rng.pick<Keyword>(KEYWORDS);
}

/**
 * カードを1枚生成
 */
export function createCard(type: CardType, keyword: Keyword): Card {
	cardIdCounter++;
	return { id: `card-${cardIdCounter}`, type, keyword };
}

/**
 * 指定種別のカードを指定枚数生成
 */
function createCards(type: CardType, count: number, rng: RNG): Card[] {
	return Array.from({ length: count }, () =>
		createCard(type, assignRandomKeyword(rng)),
	);
}

/**
 * 初期手札を生成（固定順）
 */
export function createInitialDeck(rng: RNG): Card[] {
	return [
		...createCards("move", INITIAL_DECK.moveCards, rng),
		...createCards("attack", INITIAL_DECK.attackCards, rng),
		...createCards("wait", INITIAL_DECK.waitCards, rng),
	];
}

/**
 * 初期デッキ状態を生成（固定手札4枚 + 使用済みID空）
 */
export function createInitialDeckState(rng: RNG): DeckState {
	const cards = createInitialDeck(rng);
	return {
		hand: cards,
		usedCardIds: [],
	};
}

/**
 * カードを使用済みにする
 */
export function markCardUsed(deck: DeckState, cardId: string): DeckState {
	if (deck.usedCardIds.includes(cardId)) {
		return deck;
	}
	return {
		...deck,
		usedCardIds: [...deck.usedCardIds, cardId],
	};
}

/**
 * 使用済みカードIDリストをリセット（ターン開始時）
 */
export function resetUsedCards(deck: DeckState): DeckState {
	return {
		...deck,
		usedCardIds: [],
	};
}

/**
 * カードが使用済みかどうかを判定
 */
export function isCardUsed(deck: DeckState, cardId: string): boolean {
	return deck.usedCardIds.includes(cardId);
}

/**
 * 手札のカードを並べ替える
 * fromIndex のカードを toIndex の位置に移動し、間のカードをシフトする
 * 同一インデックスまたは範囲外の場合は元の deck をそのまま返す
 */
export function reorderHand(
	deck: DeckState,
	fromIndex: number,
	toIndex: number,
): DeckState {
	if (fromIndex === toIndex) return deck;
	if (
		fromIndex < 0 ||
		fromIndex >= deck.hand.length ||
		toIndex < 0 ||
		toIndex >= deck.hand.length
	) {
		return deck;
	}
	const newHand = [...deck.hand];
	const [card] = newHand.splice(fromIndex, 1);
	newHand.splice(toIndex, 0, card);
	return { ...deck, hand: newHand };
}
