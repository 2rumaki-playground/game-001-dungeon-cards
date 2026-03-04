/**
 * コンボ判定ロジック
 * @see docs/spec/combos.md
 */

import { COMBO_BONUS } from "../constants";
import type { CardType, ComboHistory, ComboType, Direction } from "../types";

/**
 * 直前の使用履歴と現在のカード情報からコンボ種別を判定する
 *
 * - 連撃（chain）: fire → fire
 * - 奇襲（ambush）: jump → fire（同方向）
 * - 「攻撃」は fire のみ（thunder は含まない）
 */
export function detectCombo(
	history: ComboHistory | null,
	currentCardType: CardType,
	currentDirection: Direction | null,
): ComboType | null {
	if (history === null) {
		return null;
	}

	// 連撃: fire → fire
	if (history.lastCardType === "fire" && currentCardType === "fire") {
		return "chain";
	}

	// 奇襲: jump → fire（同方向）
	if (
		history.lastCardType === "jump" &&
		currentCardType === "fire" &&
		history.lastDirection !== null &&
		currentDirection !== null &&
		history.lastDirection === currentDirection
	) {
		return "ambush";
	}

	return null;
}

/**
 * コンボ種別に応じたボーナス値を返す
 */
export function getComboBonus(comboType: ComboType): number {
	return COMBO_BONUS[comboType];
}
