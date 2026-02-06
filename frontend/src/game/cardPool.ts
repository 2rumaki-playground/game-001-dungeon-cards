/**
 * カードプール・レアリティシステム
 * @see docs/spec/deckbuilding.md
 * @see docs/spec/constants.md
 */

import { CARD_RARITY, RARITY_WEIGHTS } from "../constants";
import type { CardType, Rarity } from "../types";
import type { RNG } from "../utils/rng";

/**
 * 指定レアリティに属するカード種別一覧を返す
 */
export function getCardTypesByRarity(rarity: Rarity): CardType[] {
	return (Object.entries(CARD_RARITY) as [CardType, Rarity][])
		.filter(([, r]) => r === rarity)
		.map(([type]) => type);
}

/**
 * レアリティ出現率に基づく重み付き抽選
 */
export function rollRarity(rng: RNG): Rarity {
	const entries = Object.entries(RARITY_WEIGHTS) as [Rarity, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	const roll = rng.random() * total;

	let cumulative = 0;
	for (const [rarity, weight] of entries) {
		cumulative += weight;
		if (roll < cumulative) {
			return rarity;
		}
	}

	// 浮動小数点の丸め誤差対策：最後のエントリを返す
	return entries[entries.length - 1][0];
}

/**
 * 報酬カード1枚を抽選する
 */
export function drawRewardCard(rng: RNG): CardType {
	const rarity = rollRarity(rng);
	const candidates = getCardTypesByRarity(rarity);
	if (candidates.length === 0) {
		throw new Error(
			`drawRewardCard: rarity "${rarity}" で選択可能なカードがありません`,
		);
	}
	return rng.pick(candidates);
}

/**
 * 報酬カードの選択肢を生成する（重複許容）
 */
export function generateRewardChoices(rng: RNG, count: number): CardType[] {
	if (!Number.isInteger(count) || count < 0) {
		throw new Error(`count must be a non-negative integer: ${count}`);
	}
	const choices: CardType[] = [];
	for (let i = 0; i < count; i++) {
		choices.push(drawRewardCard(rng));
	}
	return choices;
}
