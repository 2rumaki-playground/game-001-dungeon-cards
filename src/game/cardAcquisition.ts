/**
 * 敵撃破による確率制カード獲得システム
 * @see docs/spec/deckbuilding.md
 */

import { CARD_DROP_TABLE } from "../constants";
import type {
	AcquisitionCounters,
	CardExchangeEntry,
	CardType,
	DeckState,
	EnemyType,
	GameState,
} from "../types";
import type { RNG } from "../utils/rng";
import { createCard } from "./deck";

/**
 * カウンター初期値（全0）を返す
 */
export function createInitialCounters(): AcquisitionCounters {
	return {
		defeatCounts: {
			normal: 0,
			heavy: 0,
			scout: 0,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
		hitCounts: {
			normal: 0,
			heavy: 0,
			scout: 0,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	};
}

/**
 * 撃破カウンターを+1（イミュータブル）
 */
export function updateDefeatCounter(
	counters: AcquisitionCounters,
	enemyType: EnemyType,
): AcquisitionCounters {
	return {
		...counters,
		defeatCounts: {
			...counters.defeatCounts,
			[enemyType]: counters.defeatCounts[enemyType] + 1,
		},
	};
}

/**
 * 被弾カウンターを+1（イミュータブル）
 */
export function updateHitCounter(
	counters: AcquisitionCounters,
	enemyType: EnemyType,
): AcquisitionCounters {
	return {
		...counters,
		hitCounts: {
			...counters.hitCounts,
			[enemyType]: counters.hitCounts[enemyType] + 1,
		},
	};
}

/**
 * ドロップ判定（確率制）
 * 当選時はCardExchangeEntryを返し、落選時はnullを返す
 */
export function checkCardDrop(
	rng: RNG,
	enemyType: EnemyType,
): CardExchangeEntry | null {
	const config = CARD_DROP_TABLE[enemyType];
	const roll = rng.random();
	if (roll < config.dropRate) {
		return {
			acquiredCardType: config.cardType,
			defeatedEnemyType: enemyType,
		};
	}
	return null;
}

/**
 * 手札内のカード交換
 * 指定カードを除去し、新カードを同位置に挿入
 */
export function exchangeCardInDeck(
	state: GameState,
	removeCardId: string,
	newCardType: CardType,
): GameState {
	const newCard = createCard(newCardType);

	// 手札から除去対象のインデックスを取得
	const handIndex = state.deck.hand.findIndex((c) => c.id === removeCardId);
	if (handIndex < 0) {
		throw new Error(
			`exchangeCardInDeck: removeCardId "${removeCardId}" not found in hand`,
		);
	}
	const newHand = [...state.deck.hand];
	newHand.splice(handIndex, 1, newCard);

	const newDeck: DeckState = {
		hand: newHand,
		usedCardIds: state.deck.usedCardIds.filter((id) => id !== removeCardId),
	};

	return {
		...state,
		deck: newDeck,
	};
}
