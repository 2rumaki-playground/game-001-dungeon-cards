/**
 * カードレベル・経験値システム
 * @see docs/spec/cards.md
 * @see docs/spec/constants.md
 */

import {
	CARD_LEVEL_DAMAGE_BONUS,
	CARD_LEVEL_KNOCKBACK,
	CARD_LEVEL_PIERCE,
	CARD_LEVEL_RANGE_EXTEND,
	CARD_LEVEL_SHOCKWAVE,
	CARD_MAX_LEVEL,
	CARD_XP_TABLE,
	EVENT_LEVEL_UP_THRESHOLD,
} from "../constants";
import type { Card, GameState } from "../types";
import { addRunEvent } from "./eventLog";
import { getCurrentSession } from "./playStats";
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
 * カードレベルを 1..CARD_MAX_LEVEL の範囲に正規化する。
 * 異常値（NaN, Infinity, 小数, 範囲外）は警告を出して補正する。
 */
export function normalizeCardLevel(card: Card): number {
	let level = card.level;

	if (!Number.isFinite(level) || !Number.isInteger(level)) {
		console.warn(
			`[cardLevel] 無効なカードレベルを検出: id=${card.id}, level=${String(level)}. 1..${CARD_MAX_LEVEL} の範囲に補正します。`,
		);
		level = 1;
	}

	if (level < 1 || level > CARD_MAX_LEVEL) {
		console.warn(
			`[cardLevel] 異常なカードレベルを検出: id=${card.id}, level=${level}. 1..${CARD_MAX_LEVEL} にクランプします。`,
		);
	}

	return Math.min(Math.max(level, 1), CARD_MAX_LEVEL);
}

/**
 * 次レベルまでの進捗率を取得
 */
export function getExpProgress(card: Card): {
	current: number;
	required: number;
	ratio: number;
} {
	const level = normalizeCardLevel(card);

	if (level >= CARD_MAX_LEVEL) {
		return { current: 0, required: 0, ratio: 1 };
	}

	const currentLevelXp = CARD_XP_TABLE[level - 1];
	const nextLevelXp = CARD_XP_TABLE[level];
	const current = card.exp - currentLevelXp;
	const required = nextLevelXp - currentLevelXp;
	const raw = required > 0 ? current / required : 1;
	const ratio = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
	return { current, required, ratio };
}

/**
 * カードレベルに応じたダメージボーナスを取得
 */
export function getLevelDamageBonus(card: Card): number {
	const level = normalizeCardLevel(card);
	return CARD_LEVEL_DAMAGE_BONUS[level - 1] ?? 0;
}

/**
 * 最大レベル判定
 */
export function isMaxLevel(card: Card): boolean {
	return normalizeCardLevel(card) >= CARD_MAX_LEVEL;
}

/**
 * 攻撃カードが貫通効果を持つか判定
 */
export function hasPierceEffect(card: Card): boolean {
	return (
		card.type === "attack" && normalizeCardLevel(card) >= CARD_LEVEL_PIERCE
	);
}

/**
 * 攻撃カードが射程延長効果を持つか判定
 */
export function hasRangeExtendEffect(card: Card): boolean {
	return (
		card.type === "attack" &&
		normalizeCardLevel(card) >= CARD_LEVEL_RANGE_EXTEND
	);
}

/**
 * 強攻撃カードがノックバック効果を持つか判定
 */
export function hasKnockbackEffect(card: Card): boolean {
	return (
		card.type === "strong_attack" &&
		normalizeCardLevel(card) >= CARD_LEVEL_KNOCKBACK
	);
}

/**
 * 強攻撃カードが衝撃波効果を持つか判定
 */
export function hasShockwaveEffect(card: Card): boolean {
	return (
		card.type === "strong_attack" &&
		normalizeCardLevel(card) >= CARD_LEVEL_SHOCKWAVE
	);
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
		if (updatedCard.level >= EVENT_LEVEL_UP_THRESHOLD) {
			next = addRunEvent(next, {
				type: "card_level_up",
				floor: next.floor,
				turn: getCurrentSession()?.playerTurnCount ?? 0,
				detail: { cardType: updatedCard.type, newLevel: updatedCard.level },
			});
		}
	}

	return next;
}
