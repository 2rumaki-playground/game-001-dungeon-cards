/**
 * コンボシステムの型定義
 * @see docs/spec/combos.md
 */

import type { CardType } from "./card";
import type { Direction } from "./direction";

/**
 * コンボ種別
 */
export type ComboType = "chain" | "ambush" | "focus";

/**
 * ターン内カード使用履歴（直前1枚分）
 */
export type ComboHistory = {
	lastCardType: CardType;
	lastDirection: Direction | null;
};
