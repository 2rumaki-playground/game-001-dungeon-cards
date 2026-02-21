/**
 * ターン別の共通配色定数
 * TurnBanner で使用
 */

import type { Turn } from "../types";

/** ターン別のテキスト色 */
export const TURN_TEXT_COLORS: Record<Turn, number> = {
	player: 0x88bbff,
	enemy: 0xff8888,
};

/** ターン別の背景色 */
export const TURN_BG_COLORS: Record<Turn, number> = {
	player: 0x1a3a6a,
	enemy: 0x6a1a1a,
};
