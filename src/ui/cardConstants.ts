/**
 * カード表示用の共通定数
 * 複数のUIコンポーネントで共有されるカード表示の定数・ヘルパー
 */

import {
	JUMP_DISTANCE,
	PLAYER_FIRE_DAMAGE,
	PLAYER_THUNDER_DAMAGE,
} from "../constants";
import {
	getLevelDamageBonus,
	hasKnockbackEffect,
	hasPierceEffect,
	hasRangeExtendEffect,
	hasShockwaveEffect,
} from "../game/cardLevel";
import type { Card, CardType } from "../types";
import {
	UI_COLOR_COMBO_PREVIEW,
	UI_COLOR_GOLD,
	UI_COLORS_DISABLED,
} from "./uiColors";

/** カード背景色 */
export const CARD_COLORS: Record<CardType, { bg: number; border: number }> = {
	move: { bg: 0x2a5a8c, border: 0x4a8cca },
	fire: { bg: 0x8c2a2a, border: 0xca4a4a },
	thunder: { bg: 0x7a3a6a, border: 0xaa5a9a },
	jump: { bg: 0x2a6a3a, border: 0x4aaa5a },
	wait: { bg: 0x4a4a4a, border: 0x6a6a6a },
};

/** カード無効状態の色 */
export const CARD_COLOR_DISABLED = UI_COLORS_DISABLED;

/** カード選択時の枠線色 */
export const CARD_COLOR_SELECTED_BORDER = UI_COLOR_GOLD;

/** カードホバー時の枠線色 */
export const CARD_COLOR_HOVERED_BORDER = 0x88ccff;

/** コンボ予告の枠線色 */
export const CARD_COLOR_COMBO_BORDER = UI_COLOR_COMBO_PREVIEW;

/** カードXPゲージ明色（レベル進捗表示用） */
export const CARD_BRIGHT_COLORS: Record<CardType, number> = {
	move: 0x4a8abe,
	fire: 0xbe4a4a,
	thunder: 0xaa5a9a,
	jump: 0x4aaa6a,
	wait: 0x6a6a6a,
};

export { CARD_TYPE_NAME, CARD_TYPE_SYMBOL } from "../constants";

/** カードタイプ別発光色（パーティクルエフェクト用） */
export const CARD_GLOW_COLORS: Record<CardType, number[]> = {
	move: [0x44ccff, 0x2288cc],
	fire: [0xff4444, 0xcc2222],
	thunder: [0xff66cc, 0xcc44aa],
	jump: [0x44ff66, 0x22cc44],
	wait: [0x888888, 0x666666],
};

/** 魔法系カードの説明文を生成（テンプレート一元化） */
function magicDescription(damage: number, bonus?: number): string {
	const bonusText = bonus && bonus > 0 ? `(+${bonus})` : "";
	return `隣接1マス先の敵に${damage}ダメージ${bonusText}。\nマップ外・壁・敵不在の場合は空振り。`;
}

/** カード詳細説明（ツールチップ用） */
export const CARD_DESCRIPTION: Record<CardType, string> = {
	move: "選択した方向に1マス移動する。\nマップ外・壁・敵がいる場合は移動失敗。",
	fire: magicDescription(PLAYER_FIRE_DAMAGE),
	thunder: magicDescription(PLAYER_THUNDER_DAMAGE),
	jump: `選択した方向の${JUMP_DISTANCE}マス先に着地し、1マス先を飛び越える。\nマップ外・壁・敵がいる場合は失敗。`,
	wait: "何もせずターンを消費する。",
};

/** ファイアボルトのレベル別説明文を生成 */
function fireCardDescription(card: Card): string {
	const bonus = getLevelDamageBonus(card);
	const damage = PLAYER_FIRE_DAMAGE + bonus;
	const bonusText = bonus > 0 ? `(+${bonus})` : "";

	if (hasRangeExtendEffect(card)) {
		return `2マス先までの敵に${damage}ダメージ${bonusText}。\nマップ外・壁で走査停止、敵不在の場合は空振り。\n貫通: 余剰ダメージが奥の敵に伝播。`;
	}

	if (hasPierceEffect(card)) {
		return `隣接1マス先の敵に${damage}ダメージ${bonusText}。\nマップ外・壁・敵不在の場合は空振り。\n貫通: 余剰ダメージが奥の敵に伝播。`;
	}

	return magicDescription(damage, bonus);
}

/** サンダーのレベル別説明文を生成 */
function thunderCardDescription(card: Card): string {
	const bonus = getLevelDamageBonus(card);
	const damage = PLAYER_THUNDER_DAMAGE + bonus;
	const bonusText = bonus > 0 ? `(+${bonus})` : "";

	if (hasShockwaveEffect(card)) {
		return `正面+左右3マスの敵に${damage}ダメージ${bonusText}。\n正面に敵がいない場合は空振り。\nノックバック: 生存した敵を1マス後方に吹き飛ばす。`;
	}

	if (hasKnockbackEffect(card)) {
		return `隣接1マス先の敵に${damage}ダメージ${bonusText}。\nマップ外・壁・敵不在の場合は空振り。\nノックバック: 生存した敵を1マス後方に吹き飛ばす。`;
	}

	return magicDescription(damage, bonus);
}

/** カード説明文を生成（Cardオブジェクト時はレベルボーナスと特殊効果を反映） */
export function getCardDescription(cardOrType: Card | CardType): string {
	if (typeof cardOrType === "string") {
		return CARD_DESCRIPTION[cardOrType];
	}

	const card = cardOrType;

	if (card.type === "fire") {
		return fireCardDescription(card);
	}

	if (card.type === "thunder") {
		return thunderCardDescription(card);
	}

	return CARD_DESCRIPTION[card.type];
}
