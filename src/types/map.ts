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
	| "cracked_wall"
	| "stairs"
	| "trap"
	| "chest_common"
	| "chest_rare"
	| "chest_epic"
	| "rest_area";

/**
 * 宝箱タイル種別
 */
export type ChestTileType = Extract<
	TileType,
	"chest_common" | "chest_rare" | "chest_epic"
>;

/**
 * 宝箱タイルかどうかを判定
 */
export function isChestTileType(type: TileType): type is ChestTileType {
	return (
		type === "chest_common" || type === "chest_rare" || type === "chest_epic"
	);
}

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
	"trap" | "chest_common" | "chest_rare" | "chest_epic" | "rest_area"
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
