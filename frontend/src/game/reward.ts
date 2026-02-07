/**
 * 報酬システム
 * @see docs/spec/deckbuilding.md
 */

import {
	CARD_REMOVAL_CHANCE,
	DECK_MIN_SIZE,
	getEnemyCount,
} from "../constants";
import type { CardType, GameState, RewardState } from "../types";
import { generateRewardChoices } from "./cardPool";
import { createCard, getTotalDeckSize } from "./deck";

export { getTotalDeckSize };

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
 * カード除去イベント発生を判定する
 *
 * - 全敵撃破でない → triggered: false（RNG消費なし）
 * - デッキ枚数がDECK_MIN_SIZE以下 → triggered: false（RNG消費なし）
 * - 上記を通過 → CARD_REMOVAL_CHANCE で抽選（RNG消費あり）
 * @see docs/spec/deckbuilding.md「カード除去」
 */
export function shouldTriggerCardRemoval(state: GameState): {
	triggered: boolean;
	updatedState: GameState;
} {
	if (state.defeatedEnemyCount < getEnemyCount(state.floor)) {
		return { triggered: false, updatedState: state };
	}

	if (getTotalDeckSize(state.deck) <= DECK_MIN_SIZE) {
		return { triggered: false, updatedState: state };
	}

	const rng = state.rng.clone();
	const triggered = rng.random() < CARD_REMOVAL_CHANCE;
	return { triggered, updatedState: { ...state, rng } };
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
