/**
 * ダメージポップアップの動的パラメータ計算（PixiJS依存なし）
 */

/** ポップアップフォントサイズの基本値 */
const BASE_FONT_SIZE = 24;

/** ポップアップフォントサイズの最大値 */
const MAX_FONT_SIZE = 36;

/** ダメージ1あたりのフォントサイズ増加量 */
const FONT_SIZE_PER_DAMAGE = 3;

/** 画面シェイク強度の基本値 */
export const BASE_SHAKE_INTENSITY = 4;

/** 画面シェイク強度の最大値 */
const MAX_SHAKE_INTENSITY = 10;

/** ダメージ1あたりのシェイク強度増加量 */
const SHAKE_INTENSITY_PER_DAMAGE = 1.5;

/**
 * ダメージ量に応じたポップアップフォントサイズを計算
 * ダメージが大きいほどフォントサイズが増加（上限あり）
 */
export function calcPopupFontSize(amount: number): number {
	const extra = Math.max(0, amount - 1) * FONT_SIZE_PER_DAMAGE;
	return Math.min(BASE_FONT_SIZE + extra, MAX_FONT_SIZE);
}

/**
 * ダメージ量に応じた画面シェイク強度を計算
 * ダメージが大きいほどシェイクが強い（上限あり）
 */
export function calcScreenShakeIntensity(amount: number): number {
	const extra = Math.max(0, amount - 1) * SHAKE_INTENSITY_PER_DAMAGE;
	return Math.min(BASE_SHAKE_INTENSITY + extra, MAX_SHAKE_INTENSITY);
}
