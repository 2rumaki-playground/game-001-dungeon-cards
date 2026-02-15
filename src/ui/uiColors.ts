/**
 * UI共通色定数
 * カード色(cardConstants.ts)やマップ色(constants.ts COLORS)以外の
 * UIコンポーネント間で共有される色値を一元管理する
 */

/** ゴールド色（タイトル・選択強調） */
export const UI_COLOR_GOLD = 0xffd700;

/** コンボ予告表示の枠線色（オレンジ） */
export const UI_COLOR_COMBO_PREVIEW = 0xff8c00;

/** 無効状態の色 */
export const UI_COLORS_DISABLED = {
	bg: 0x2a2a2a,
	border: 0x4a4a4a,
	text: 0x666666,
} as const;

/** アクティブボタンの色（プライマリ操作用） */
export const UI_COLORS_BUTTON_PRIMARY = {
	bg: 0x2a5a8c,
	border: 0x4a8cca,
} as const;

/** セカンダリボタンの色（スキップ・閉じる等） */
export const UI_COLORS_BUTTON_SECONDARY = {
	bg: 0x555555,
	border: 0x777777,
} as const;
