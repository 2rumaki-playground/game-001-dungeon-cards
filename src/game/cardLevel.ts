/**
 * カードレベル・経験値システム
 * @see docs/spec/cards.md
 * @see docs/spec/constants.md
 */

import { CARD_MAX_LEVEL, CARD_XP_TABLE } from "../constants";
import type { Card, GameState } from "../types";
import { addActionLog } from "./state";

/**
 * 累計XPからレベルを算出
 */
export function calculateLevel(exp: number): number {
	for (let i = CARD_XP_TABLE.length - 1; i >= 0; i--) {
		if (exp >= CARD_XP_TABLE[i]) {
			return i + 1;
		}
	}
	return 1;
}

/**
 * カードにXPを加算し、レベルを再計算する
 */
export function addExpToCard(
	card: Card,
	amount: number,
): { card: Card; leveledUp: boolean } {
	const newExp = card.exp + amount;
	const newLevel = calculateLevel(newExp);
	const leveledUp = newLevel > card.level;
	return {
		card: { ...card, exp: newExp, level: newLevel },
		leveledUp,
	};
}

/**
 * 次レベルまでの進捗率を取得
 */
export function getExpProgress(card: Card): {
	current: number;
	required: number;
	ratio: number;
} {
	if (card.level >= CARD_MAX_LEVEL) {
		return { current: 0, required: 0, ratio: 1 };
	}

	const currentLevelXp = CARD_XP_TABLE[card.level - 1];
	const nextLevelXp = CARD_XP_TABLE[card.level];
	const current = card.exp - currentLevelXp;
	const required = nextLevelXp - currentLevelXp;
	const ratio = required > 0 ? current / required : 1;
	return { current, required, ratio };
}

/**
 * 最大レベル判定
 */
export function isMaxLevel(card: Card): boolean {
	return card.level >= CARD_MAX_LEVEL;
}

/**
 * 敵撃破時、攻撃カードにXP+1を付与する
 */
export function awardExpToCard(
	state: GameState,
	attackCardId: string,
): GameState {
	const cardIndex = state.deck.hand.findIndex((c) => c.id === attackCardId);
	if (cardIndex < 0) return state;

	const card = state.deck.hand[cardIndex];
	const { card: updatedCard, leveledUp } = addExpToCard(card, 1);

	const newHand = [...state.deck.hand];
	newHand[cardIndex] = updatedCard;

	let next: GameState = {
		...state,
		deck: { ...state.deck, hand: newHand },
	};

	if (leveledUp) {
		next = addActionLog(
			next,
			`カードがLv.${updatedCard.level}になった`,
			"system",
		);
	}

	return next;
}
