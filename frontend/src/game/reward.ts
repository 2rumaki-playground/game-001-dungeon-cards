/**
 * 報酬システム
 * @see docs/spec/deckbuilding.md
 */

import type { CardType, DeckState, GameState, RewardState } from "../types";
import { generateRewardChoices } from "./cardPool";
import { createCard } from "./deck";

/**
 * デッキの総枚数を取得（山札＋手札＋捨て札）
 */
export function getTotalDeckSize(deck: DeckState): number {
	return deck.drawPile.length + deck.hand.length + deck.discardPile.length;
}

/**
 * 報酬状態を生成する
 *
 * - 撃破数0ならnullを返す（報酬なし）
 * - それ以外は撃破数分の選択肢を生成
 * - RNGの消費状態を反映した更新済みGameStateも返す
 */
export function createRewardState(
	state: GameState,
): { rewardState: RewardState; updatedState: GameState } | null {
	if (state.defeatedEnemyCount <= 0) return null;

	const rng = state.rng.clone();
	const choices = generateRewardChoices(rng, state.defeatedEnemyCount);

	return {
		rewardState: { choices },
		updatedState: { ...state, rng },
	};
}

/**
 * デッキにカード1枚を追加（山札に追加）
 */
export function addRewardCardToDeck(
	state: GameState,
	cardType: CardType,
): GameState {
	const newCard = createCard(cardType);
	return {
		...state,
		rng: state.rng.clone(),
		deck: {
			...state.deck,
			drawPile: [...state.deck.drawPile, newCard],
		},
	};
}

/**
 * デッキからカードを除去（3ゾーン全検索）
 */
export function removeCardFromDeck(
	state: GameState,
	cardId: string,
): GameState {
	return {
		...state,
		rng: state.rng.clone(),
		deck: {
			drawPile: state.deck.drawPile.filter((c) => c.id !== cardId),
			hand: state.deck.hand.filter((c) => c.id !== cardId),
			discardPile: state.deck.discardPile.filter((c) => c.id !== cardId),
		},
	};
}
