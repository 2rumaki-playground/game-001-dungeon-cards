/**
 * カード表示用の共通定数
 * 複数のUIコンポーネント（handRenderer, rewardScreen, deckViewer）で共有される
 */

import {
	JUMP_DISTANCE,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import type { CardType, Rarity } from "../types";

/** カード背景色 */
export const CARD_COLORS: Record<CardType, { bg: number; border: number }> = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	attack: { bg: 0x8c2a2a, border: 0xca4a4a },
	strong_attack: { bg: 0x7a3a6a, border: 0xaa5a9a },
	jump: { bg: 0x2a6a3a, border: 0x4aaa5a },
	wait: { bg: 0x4a4a4a, border: 0x6a6a6a },
};

/** カード種別シンボル */
export const CARD_TYPE_SYMBOL: Record<CardType, string> = {
	move: "👟",
	attack: "⚔",
	strong_attack: "🔥",
	jump: "🦘",
	wait: "⏳",
};

/** カード効果テキスト */
export const CARD_EFFECT_TEXT: Record<CardType, string> = {
	move: "1マス移動",
	attack: `${PLAYER_ATTACK_DAMAGE}ダメージ`,
	strong_attack: `${PLAYER_STRONG_ATTACK_DAMAGE}ダメージ`,
	jump: `${JUMP_DISTANCE}マス先に着地`,
	wait: "-",
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

/** レアリティ色 */
export const RARITY_COLORS: Record<Rarity, number> = {
	common: 0x888888,
	uncommon: 0x44aa44,
	rare: 0xddaa22,
};
