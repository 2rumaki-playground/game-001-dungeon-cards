/**
 * デッキシステム
 * @see docs/spec/mvp/rules.md
 * @see docs/spec/mvp/cards.md
 */

import { HAND_LIMIT, INITIAL_DECK, KEYWORDS } from "../constants";
import type { Card, CardType, DeckState, Keyword } from "../types";
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
 * RNGを使ってランダムにキーワードを割り当てる
 */
export function assignRandomKeyword(rng: RNG): Keyword {
	return rng.pick(KEYWORDS as unknown as Keyword[]);
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
 * 初期デッキを生成（固定順）
 */
export function createInitialDeck(rng: RNG): Card[] {
	return [
		...createCards("move", INITIAL_DECK.moveCards, rng),
		...createCards("attack", INITIAL_DECK.attackCards, rng),
		...createCards("wait", INITIAL_DECK.waitCards, rng),
	];
}

/**
 * 初期デッキ状態を生成（deckOrder = 固定順のデッキ）
 */
export function createInitialDeckState(rng: RNG): DeckState {
	const cards = createInitialDeck(rng);
	return {
		deckOrder: [...cards],
		drawPile: [...cards],
		hand: [],
		discardPile: [],
	};
}

/**
 * ドロー時に捨て札→山札のリサイクルが発生するかを判定
 * アニメーション制御用
 */
export function willRecycle(deck: DeckState, count?: number): boolean {
	const drawCount = count ?? Math.max(0, HAND_LIMIT - deck.hand.length);
	return (
		drawCount > 0 &&
		deck.drawPile.length < drawCount &&
		deck.discardPile.length > 0
	);
}

/**
 * 捨て札をdeckOrderの順番で復元して山札に戻す
 */
function recycleDiscardPile(deck: DeckState): Card[] {
	const discardIds = new Set(deck.discardPile.map((c) => c.id));
	return deck.deckOrder.filter((c) => discardIds.has(c.id));
}

/**
 * 山札からカードを引いて手札に加える
 * 山札が不足する場合は捨て札をdeckOrderの順番で復元して山札に戻す
 */
export function drawCards(deck: DeckState, count?: number): DeckState {
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
			drawPile = recycleDiscardPile({
				...deck,
				discardPile,
			});
			discardPile = [];
		}
		const card = drawPile.shift();
		if (card !== undefined) {
			hand.push(card);
		}
	}

	return { deckOrder: deck.deckOrder, drawPile, hand, discardPile };
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
		deckOrder: deck.deckOrder,
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
		deckOrder: deck.deckOrder,
		drawPile: [...deck.drawPile],
		hand: [],
		discardPile: [...deck.discardPile, ...deck.hand],
	};
}

/**
 * デッキをリセット（全カードをdeckOrderの順番で山札に復元）
 */
export function resetDeck(deck: DeckState): DeckState {
	return {
		deckOrder: deck.deckOrder,
		drawPile: [...deck.deckOrder],
		hand: [],
		discardPile: [],
	};
}

/**
 * deckOrderと3ゾーン（山札・手札・捨て札）のカード集合が一致するか検証
 * デバッグ・テスト用
 */
export function validateDeckConsistency(deck: DeckState): boolean {
	const orderIds = new Set(deck.deckOrder.map((c) => c.id));
	const zoneIds = new Set(getAllCards(deck).map((c) => c.id));
	if (orderIds.size !== zoneIds.size) return false;
	for (const id of orderIds) {
		if (!zoneIds.has(id)) return false;
	}
	return true;
}

/**
 * プレイヤーが設定した並び順をdeckOrderとdrawPileにセット
 * 階層開始時の並び替えUI用
 */
export function setDeckOrder(
	_deck: DeckState,
	orderedCards: Card[],
): DeckState {
	return {
		deckOrder: [...orderedCards],
		drawPile: [...orderedCards],
		hand: [],
		discardPile: [],
	};
}
