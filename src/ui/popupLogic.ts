/**
 * ポップアップの動的パラメータ計算（PixiJS依存なし）
 */

/** ポップアップフォントサイズの基本値 */
const BASE_FONT_SIZE = 24;

/** ポップアップフォントサイズの最大値 */
const MAX_FONT_SIZE = 36;

/** 表示数値1あたりのフォントサイズ増加量 */
const FONT_SIZE_PER_AMOUNT = 3;

/**
 * 表示数値（amount）に応じたポップアップフォントサイズを計算
 * 数値が大きいほどフォントサイズが増加（上限あり）
 */
export function calcPopupFontSize(amount: number): number {
	const extra = Math.max(0, amount - 1) * FONT_SIZE_PER_AMOUNT;
	return Math.min(BASE_FONT_SIZE + extra, MAX_FONT_SIZE);
}
