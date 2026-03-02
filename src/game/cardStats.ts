/**
 * カード統計の更新ヘルパー
 * @see docs/spec/cards.md - カード統計
 */

import type { CardStats, GameState } from "../types";

/**
 * hand配列からcardIdで検索し、statsをイミュータブルに更新する共通処理
 */
function updateCardStats(
	state: GameState,
	cardId: string,
	updater: (stats: CardStats) => CardStats | null,
): GameState {
	const cardIndex = state.deck.hand.findIndex((c) => c.id === cardId);
	if (cardIndex < 0) return state;

	const card = state.deck.hand[cardIndex];
	const newStats = updater(card.stats);
	if (newStats === null) return state;

	const newHand = [...state.deck.hand];
	newHand[cardIndex] = { ...card, stats: newStats };

	return {
		...state,
		deck: { ...state.deck, hand: newHand },
		rng: state.rng.clone(),
	};
}

/**
 * カードの使用回数を1増加させる
 */
export function incrementUseCount(state: GameState, cardId: string): GameState {
	return updateCardStats(state, cardId, (stats) => ({
		...stats,
		useCount: stats.useCount + 1,
	}));
}

/**
 * カードの撃破数を1増加させる
 */
export function recordDefeat(state: GameState, cardId: string): GameState {
	return updateCardStats(state, cardId, (stats) => ({
		...stats,
		defeatCount: stats.defeatCount + 1,
	}));
}

/**
 * カードの最大単発ダメージを更新する（既存値より大きい場合のみ）
 */
export function updateMaxDamage(
	state: GameState,
	cardId: string,
	damage: number,
): GameState {
	return updateCardStats(state, cardId, (stats) => {
		if (damage <= stats.maxSingleDamage) return null;
		return { ...stats, maxSingleDamage: damage };
	});
}
