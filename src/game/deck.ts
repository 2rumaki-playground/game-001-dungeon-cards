/**
 * デッキシステム
 * @see docs/spec/mvp/rules.md
 * @see docs/spec/mvp/cards.md
 */

import { HAND_LIMIT, INITIAL_DECK } from "../constants";
import type { Card, CardType, DeckState } from "../types";
import type { RNG } from "../utils/rng";

/**
 * デッキの3ゾーン（山札・手札・捨て札）を結合した全カード配列を取得
 */
export function getAllCards(deck: DeckState): Card[] {
	return [...deck.drawPile, ...deck.hand, ...deck.discardPile];
}

/**
 * デッキの総枚数を取得（山札＋手札＋捨て札）
 */
export function getTotalDeckSize(deck: DeckState): number {
	return deck.drawPile.length + deck.hand.length + deck.discardPile.length;
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
 * カードを1枚生成
 */
export function createCard(type: CardType): Card {
	cardIdCounter++;
	return { id: `card-${cardIdCounter}`, type };
}

/**
 * 指定種別のカードを指定枚数生成
 */
function createCards(type: CardType, count: number): Card[] {
	return Array.from({ length: count }, () => createCard(type));
}

/**
 * 初期デッキを生成（シャッフル済み）
 */
export function createInitialDeck(rng: RNG): Card[] {
	const cards: Card[] = [
		...createCards("move", INITIAL_DECK.moveCards),
		...createCards("attack", INITIAL_DECK.attackCards),
		...createCards("strong_attack", INITIAL_DECK.strongAttackCards),
		...createCards("rush", INITIAL_DECK.rushCards),
		...createCards("wait", INITIAL_DECK.waitCards),
	];
	return rng.shuffle(cards);
}

/**
 * 初期デッキ状態を生成（山札にシャッフル済みデッキをセット）
 */
export function createInitialDeckState(rng: RNG): DeckState {
	return {
		drawPile: createInitialDeck(rng),
		hand: [],
		discardPile: [],
	};
}

/**
 * ドロー時に捨て札→山札のリシャッフルが発生するかを判定
 * アニメーション制御用
 */
export function willReshuffle(deck: DeckState, count?: number): boolean {
	const drawCount = count ?? Math.max(0, HAND_LIMIT - deck.hand.length);
	return (
		drawCount > 0 &&
		deck.drawPile.length < drawCount &&
		deck.discardPile.length > 0
	);
}

/**
 * 山札からカードを引いて手札に加える
 * 山札が不足する場合は捨て札をシャッフルして山札に戻す
 */
export function drawCards(
	deck: DeckState,
	rng: RNG,
	count?: number,
): DeckState {
	const drawCount = count ?? Math.max(0, HAND_LIMIT - deck.hand.length);
	if (drawCount <= 0) return deck;

	let drawPile = [...deck.drawPile];
	let discardPile = [...deck.discardPile];
	const hand = [...deck.hand];

	for (let i = 0; i < drawCount; i++) {
		if (drawPile.length === 0 && discardPile.length === 0) {
			break;
		}
		if (drawPile.length === 0) {
			drawPile = rng.shuffle(discardPile);
			discardPile = [];
		}
		const card = drawPile.shift();
		if (card !== undefined) {
			hand.push(card);
		}
	}

	return { drawPile, hand, discardPile };
}

/**
 * 手札からカードを使用（捨て札へ移動）
 */
export function playCard(deck: DeckState, cardId: string): DeckState {
	const cardIndex = deck.hand.findIndex((c) => c.id === cardId);
	if (cardIndex === -1) {
		return deck;
	}

	const hand = [...deck.hand];
	const [card] = hand.splice(cardIndex, 1);
	return {
		drawPile: [...deck.drawPile],
		hand,
		discardPile: [...deck.discardPile, card],
	};
}

/**
 * 手札をすべて捨て札に移動
 */
export function discardHand(deck: DeckState): DeckState {
	return {
		drawPile: [...deck.drawPile],
		hand: [],
		discardPile: [...deck.discardPile, ...deck.hand],
	};
}

/**
 * デッキをリセット（全カードを山札に戻してシャッフル）
 */
export function reshuffleDeck(deck: DeckState, rng: RNG): DeckState {
	const allCards = getAllCards(deck);
	return {
		drawPile: rng.shuffle(allCards),
		hand: [],
		discardPile: [],
	};
}
