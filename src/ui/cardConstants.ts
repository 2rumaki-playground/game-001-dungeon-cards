/**
 * カード表示用の共通定数
 * 複数のUIコンポーネント（handRenderer, rewardScreen, deckViewer）で共有される
 */

import {
	JUMP_DISTANCE,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import { getLevelDamageBonus } from "../game/cardLevel";
import type { Card, CardType } from "../types";

/** カード背景色 */
export const CARD_COLORS: Record<CardType, { bg: number; border: number }> = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	attack: { bg: 0x8c2a2a, border: 0xca4a4a },
	strong_attack: { bg: 0x7a3a6a, border: 0xaa5a9a },
	jump: { bg: 0x2a6a3a, border: 0x4aaa5a },
	wait: { bg: 0x4a4a4a, border: 0x6a6a6a },
};

/** カードXPゲージ明色（レベル進捗表示用） */
export const CARD_BRIGHT_COLORS: Record<CardType, number> = {
	move: 0x4a8abe,
	attack: 0xbe4a4a,
	strong_attack: 0xaa5a9a,
	jump: 0x4aaa6a,
	wait: 0x6a6a6a,
};

/** カード種別シンボル */
export const CARD_TYPE_SYMBOL: Record<CardType, string> = {
	move: "👟",
	attack: "⚔",
	strong_attack: "🔥",
	jump: "🦘",
	wait: "⏳",
};

/** カード種別の日本語名 */
export const CARD_TYPE_NAME: Record<CardType, string> = {
	move: "移動",
	attack: "攻撃",
	strong_attack: "強攻撃",
	jump: "ジャンプ",
	wait: "待機",
};

/** カードタイプ別発光色（パーティクルエフェクト用） */
export const CARD_GLOW_COLORS: Record<CardType, number[]> = {
	move: [0x44ccff, 0x2288cc],
	attack: [0xff4444, 0xcc2222],
	strong_attack: [0xff66cc, 0xcc44aa],
	jump: [0x44ff66, 0x22cc44],
	wait: [0x888888, 0x666666],
};

/** 攻撃系カードの説明文を生成（テンプレート一元化） */
function attackDescription(damage: number, bonus?: number): string {
	const bonusText = bonus && bonus > 0 ? `(+${bonus})` : "";
	return `隣接1マス先の敵に${damage}ダメージ${bonusText}。\nマップ外・壁・敵不在の場合は空振り。`;
}

/** カード詳細説明（ツールチップ用） */
export const CARD_DESCRIPTION: Record<CardType, string> = {
	move: "選択した方向に1マス移動する。\nマップ外・壁・敵がいる場合は移動失敗。",
	attack: attackDescription(PLAYER_ATTACK_DAMAGE),
	strong_attack: attackDescription(PLAYER_STRONG_ATTACK_DAMAGE),
	jump: `選択した方向の${JUMP_DISTANCE}マス先に着地し、1マス先を飛び越える。\nマップ外・壁・敵がいる場合は失敗。`,
	wait: "何もせずターンを消費する。",
};

/** カード説明文を生成（Cardオブジェクト時はレベルボーナスを反映） */
export function getCardDescription(cardOrType: Card | CardType): string {
	if (typeof cardOrType === "string") {
		return CARD_DESCRIPTION[cardOrType];
	}

	const card = cardOrType;

	if (card.type === "attack") {
		const bonus = getLevelDamageBonus(card);
		return attackDescription(PLAYER_ATTACK_DAMAGE + bonus, bonus);
	}

	if (card.type === "strong_attack") {
		const bonus = getLevelDamageBonus(card);
		return attackDescription(PLAYER_STRONG_ATTACK_DAMAGE + bonus, bonus);
	}

	return CARD_DESCRIPTION[card.type];
}
