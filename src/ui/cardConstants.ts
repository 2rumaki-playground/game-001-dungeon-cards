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

/** カードレアリティ（UI表示用） */
export const CARD_RARITY: Record<CardType, Rarity> = {
	move: "common",
	attack: "common",
	wait: "common",
	strong_attack: "uncommon",
	jump: "rare",
};

/** レアリティ色 */
export const RARITY_COLORS: Record<Rarity, number> = {
	common: 0x888888,
	uncommon: 0x44aa44,
	rare: 0xddaa22,
};

/** カード詳細説明（ツールチップ用） */
export const CARD_DESCRIPTION: Record<CardType, string> = {
	move: "選択した方向に1マス移動する。\nマップ外・壁・敵がいる場合は移動失敗。",
	attack: `隣接1マス先の敵に${PLAYER_ATTACK_DAMAGE}ダメージ。\nマップ外・壁・敵不在の場合は空振り。`,
	strong_attack: `隣接1マス先の敵に${PLAYER_STRONG_ATTACK_DAMAGE}ダメージ。\nマップ外・壁・敵不在の場合は空振り。`,
	jump: `選択した方向の${JUMP_DISTANCE}マス先に着地し、1マス先を飛び越える。\nマップ外・壁・敵がいる場合は失敗。`,
	wait: "何もせずターンを消費する。",
};

/** レアリティ日本語名 */
export const RARITY_NAME: Record<Rarity, string> = {
	common: "コモン",
	uncommon: "アンコモン",
	rare: "レア",
};
