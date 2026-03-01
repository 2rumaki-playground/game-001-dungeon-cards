/**
 * 敵撃破による条件付きカード獲得システム
 * @see docs/spec/deckbuilding.md
 */

import { ENEMY_ACQUISITION_CONDITIONS } from "../constants";
import type {
	AcquisitionCounters,
	CardType,
	DeckState,
	EnemyType,
	GameState,
} from "../types";
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
			ranged: 0,
			miniboss: 0,
			boss: 0,
		},
		hitCounts: {
			normal: 0,
			heavy: 0,
			scout: 0,
			ranged: 0,
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
 * 条件達成判定
 */
export function checkAcquisitionCondition(
	counters: AcquisitionCounters,
	enemyType: EnemyType,
): boolean {
	const config = ENEMY_ACQUISITION_CONDITIONS[enemyType];
	const results = config.conditions.map((condition) => {
		switch (condition.type) {
			case "defeat_count":
				return counters.defeatCounts[enemyType] >= condition.threshold;
			case "hit_count":
				return counters.hitCounts[enemyType] >= condition.threshold;
			default:
				return false;
		}
	});

	if (config.conditionLogic === "and") {
		return results.every(Boolean);
	}
	return results.some(Boolean);
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
