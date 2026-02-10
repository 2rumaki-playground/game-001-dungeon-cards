/**
 * マップ関連の型定義
 * @see docs/spec/mvp/rules.md - マップ
 */

/**
 * タイル種別
 */
export type TileType =
	| "floor"
	| "wall"
	| "stairs"
	| "trap"
	| "treasure"
	| "rest_area";

/**
 * タイル
 */
export type Tile = {
	type: TileType;
};

/**
 * マップ
 * 2次元配列（map[y][x]でアクセス）
 */
export type GameMap = Tile[][];

/**
 * 特殊タイル種別
 */
export type SpecialTileType = Extract<
	TileType,
	"trap" | "treasure" | "rest_area"
>;

/**
 * 部屋（マップ座標基準、内部床サイズ）
 */
export type Room = {
	x: number;
	y: number;
	width: number;
	height: number;
};
