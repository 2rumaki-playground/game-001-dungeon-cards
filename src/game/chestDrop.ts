/**
 * 宝箱ドロップシステム
 * 敵撃破時に宝箱タイルを配置し、踏んで開封するシステム
 */

import {
	CHEST_CONTENT_HEAL_RATE,
	CHEST_DROP_TABLE,
	CHEST_HEAL_AMOUNT,
	CHEST_RARITY_WEIGHTS,
	ENEMY_CARD_TYPE_TABLE,
} from "../constants";
import type {
	ChestContent,
	ChestMeta,
	ChestRarity,
	EnemyType,
	GameState,
	Position,
	TileType,
} from "../types";
import { isChestTileType } from "../types";
import type { RNG } from "../utils/rng";
import { hasEnemyAt } from "./enemyUtils";
import { isInBounds } from "./map";
import { positionToKey } from "./positionUtils";

/**
 * 宝箱ドロップ判定
 * 当選時はレアリティを返し、落選時はnullを返す
 */
export function checkChestDrop(
	rng: RNG,
	enemyType: EnemyType,
): ChestRarity | null {
	const config = CHEST_DROP_TABLE[enemyType];
	const roll = rng.random();
	if (roll < config.dropRate) {
		return rollChestRarity(rng);
	}
	return null;
}

/**
 * 宝箱レアリティを重み付き抽選
 */
export function rollChestRarity(rng: RNG): ChestRarity {
	const roll = rng.random();
	let cumulative = 0;
	const entries = Object.entries(CHEST_RARITY_WEIGHTS) as [
		ChestRarity,
		number,
	][];
	for (const [rarity, weight] of entries) {
		cumulative += weight;
		if (roll < cumulative) {
			return rarity;
		}
	}
	return "common";
}

/**
 * 宝箱の中身を決定
 */
export function rollChestContent(
	rng: RNG,
	rarity: ChestRarity,
	enemyType: EnemyType,
): ChestContent {
	const roll = rng.random();
	if (roll < CHEST_CONTENT_HEAL_RATE[rarity]) {
		const healAmount = CHEST_HEAL_AMOUNT[rarity];
		return {
			type: "heal",
			rarity,
			healAmount: healAmount ?? undefined,
		};
	}
	return {
		type: "scroll",
		rarity,
		cardExchangeEntry: {
			acquiredCardType: ENEMY_CARD_TYPE_TABLE[enemyType],
			defeatedEnemyType: enemyType,
		},
	};
}

/**
 * ChestRarity → TileType の変換
 */
export function chestRarityToTileType(rarity: ChestRarity): TileType {
	switch (rarity) {
		case "common":
			return "chest_common";
		case "rare":
			return "chest_rare";
		case "epic":
			return "chest_epic";
	}
}

/**
 * 宝箱タイルを配置
 * 指定位置が既にチェストの場合は4近傍の床/罠/休憩所タイルを探索
 * 配置成功時はstateを返し、配置不可時はnullを返す
 */
export function placeChestTile(
	state: GameState,
	position: Position,
	rarity: ChestRarity,
	enemyType: EnemyType,
): GameState | null {
	const tileType = chestRarityToTileType(rarity);
	const targetPos = findPlacementPosition(state, position);
	if (!targetPos) return null;

	const key = positionToKey(targetPos);

	// タイルを宝箱に変更
	const newMap = state.map.map((row, ry) =>
		ry === targetPos.y
			? row.map((t, rx) => (rx === targetPos.x ? { type: tileType } : t))
			: row,
	);

	// 残骸をクリア（宝箱と重ならないように）
	const newRemnants: Record<string, number> = { ...state.remnants };
	delete newRemnants[key];

	// chestMetaにエントリ追加
	const newChestMeta: Record<string, ChestMeta> = {
		...state.chestMeta,
		[key]: { rarity, defeatedEnemyType: enemyType },
	};

	return {
		...state,
		map: newMap,
		remnants: newRemnants,
		chestMeta: newChestMeta,
		rng: state.rng.clone(),
	};
}

/**
 * 配置可能な位置を探索
 * 指定位置が配置可能（床/罠/休憩所）なら直接返す。それ以外なら4近傍の配置可能タイルから探す。
 */
function findPlacementPosition(
	state: GameState,
	position: Position,
): Position | null {
	if (canPlaceChest(state, position)) return position;

	// 4近傍を探索
	const deltas = [
		{ x: 0, y: -1 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: -1, y: 0 },
	];
	for (const d of deltas) {
		const candidate = { x: position.x + d.x, y: position.y + d.y };
		if (canPlaceChest(state, candidate)) return candidate;
	}

	return null;
}

/**
 * 指定位置に宝箱を配置できるか判定
 * 床タイルおよび通行可能な特殊タイル（罠・休憩所）に配置可能。
 * 既に宝箱が配置されている場合は不可。
 */
function canPlaceChest(state: GameState, pos: Position): boolean {
	if (!isInBounds(state.map, pos.x, pos.y)) return false;
	const tile = state.map[pos.y][pos.x];
	if (
		tile.type !== "floor" &&
		tile.type !== "trap" &&
		tile.type !== "rest_area"
	)
		return false;
	// プレイヤー位置には配置しない
	if (state.player.position.x === pos.x && state.player.position.y === pos.y)
		return false;
	// 敵がいる位置には配置しない
	if (hasEnemyAt(state.enemies, pos.x, pos.y)) return false;
	return true;
}

/**
 * TileTypeが宝箱タイルかどうかを判定
 */
export function isChestTile(type: TileType): boolean {
	return isChestTileType(type);
}
