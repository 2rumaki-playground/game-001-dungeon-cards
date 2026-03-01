/**
 * コンボ判定ロジック
 * @see docs/spec/combos.md
 */

import { COMBO_BONUS } from "../constants";
import type { CardType, ComboHistory, ComboType, Direction } from "../types";

/**
 * 直前の使用履歴と現在のカード情報からコンボ種別を判定する
 *
 * - 突撃（charge）: move → attack（同方向）
 * - 連撃（chain）: attack → attack
 * - 奇襲（ambush）: jump → attack（同方向）
 * - 集中攻撃（focus）: wait → attack
 * - 「攻撃」は attack のみ（strong_attack は含まない）
 */
export function detectCombo(
	history: ComboHistory | null,
	currentCardType: CardType,
	currentDirection: Direction | null,
): ComboType | null {
	if (history === null) {
		return null;
	}

	// 突撃: move → attack（同方向）
	if (
		history.lastCardType === "move" &&
		currentCardType === "attack" &&
		history.lastDirection !== null &&
		currentDirection !== null &&
		history.lastDirection === currentDirection
	) {
		return "charge";
	}

	// 連撃: attack → attack
	if (history.lastCardType === "attack" && currentCardType === "attack") {
		return "chain";
	}

	// 奇襲: jump → attack（同方向）
	if (
		history.lastCardType === "jump" &&
		currentCardType === "attack" &&
		history.lastDirection !== null &&
		currentDirection !== null &&
		history.lastDirection === currentDirection
	) {
		return "ambush";
	}

	// 集中攻撃: wait → attack
	if (history.lastCardType === "wait" && currentCardType === "attack") {
		return "focus";
	}

	return null;
}

/**
 * コンボ種別に応じたボーナス値を返す
 */
export function getComboBonus(comboType: ComboType): number {
	return COMBO_BONUS[comboType];
}
