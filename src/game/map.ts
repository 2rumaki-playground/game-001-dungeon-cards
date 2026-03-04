/**
 * マップ生成
 * @see docs/spec/rules.md - マップ生成
 * @see docs/spec/mapgen.md - BSP分割アルゴリズム
 */

import {
	BSP_MAX_RETRIES,
	getCrackedWallCount,
	getEnemyCount,
	getMapSize,
	getSpecialTileComposition,
	getSpecialTileCount,
	INITIAL_FLOOR,
	MAP_HEIGHT,
	MAP_WIDTH,
	STAIRS_COUNT,
} from "../constants";
import type {
	GameMap,
	Position,
	Room,
	SpecialTileType,
	Tile,
	TileType,
} from "../types";
import type { RNG } from "../utils/rng";
import { generateBSPMap } from "./bsp";
import { positionToKey } from "./positionUtils";
import { findRoomAt } from "./roomUtils";

/**
 * 座標がマップ範囲内かを判定
 */
export function isInBounds(map: GameMap, x: number, y: number): boolean {
	return y >= 0 && y < map.length && x >= 0 && x < (map[y]?.length ?? 0);
}

/**
 * タイルが壁（wall / cracked_wall）かを判定
 */
export function isWallTile(tile: Tile): boolean {
	return tile.type === "wall" || tile.type === "cracked_wall";
}

export type MapPlacement = {
	map: GameMap;
	rooms: Room[];
	player: Position;
	stairs: Position;
	enemies: Position[];
	specialTiles: { position: Position; type: TileType }[];
};

/** マップ生成モード */
export const MAP_GENERATION_MODE: "fixed" | "bsp" = "bsp";

const createWallTile = (): Tile => ({ type: "wall" });
const createFloorTile = (): Tile => ({ type: "floor" });
const createStairsTile = (): Tile => ({ type: "stairs" });

/**
 * 固定レイアウトのマップを生成（外周が壁、内側が床）
 */
export function createFixedLayoutMap(
	width: number = MAP_WIDTH,
	height: number = MAP_HEIGHT,
): GameMap {
	const map: GameMap = [];
	for (let y = 0; y < height; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < width; x++) {
			const isBoundary =
				x === 0 || y === 0 || x === width - 1 || y === height - 1;
			row.push(isBoundary ? createWallTile() : createFloorTile());
		}
		map.push(row);
	}
	return map;
}

const getFloorPositions = (map: GameMap): Position[] => {
	const positions: Position[] = [];
	for (let y = 0; y < map.length; y++) {
		for (let x = 0; x < map[y].length; x++) {
			if (map[y][x]?.type === "floor") {
				positions.push({ x, y });
			}
		}
	}
	return positions;
};

/**
 * 部屋内の床タイル位置を取得（特殊タイル配置用）
 */
const getRoomFloorPositions = (
	map: GameMap,
	rooms: Room[],
	excludePositions: Set<string>,
): Position[] => {
	const positions: Position[] = [];
	for (const room of rooms) {
		for (let y = room.y; y < room.y + room.height; y++) {
			for (let x = room.x; x < room.x + room.width; x++) {
				const key = positionToKey({ x, y });
				if (map[y][x]?.type === "floor" && !excludePositions.has(key)) {
					positions.push({ x, y });
				}
			}
		}
	}
	return positions;
};

/**
 * 特殊タイル種別リストを階層に応じて生成
 */
function getSpecialTileTypes(floor: number): SpecialTileType[] {
	const comp = getSpecialTileComposition(floor);
	const types: SpecialTileType[] = [];
	for (let i = 0; i < comp.trap; i++) types.push("trap");
	for (let i = 0; i < comp.rest_area; i++) types.push("rest_area");
	return types;
}

/**
 * BSPマップ生成（リトライ付き）
 */
export function generateBSPMapPlacement(
	rng: RNG,
	width: number,
	height: number,
	floor: number = INITIAL_FLOOR,
): MapPlacement {
	const enemyCount = getEnemyCount(floor);
	const specialTileCount = getSpecialTileCount(floor);
	const requiredCount = 1 + STAIRS_COUNT + enemyCount + specialTileCount;

	for (let attempt = 0; attempt < BSP_MAX_RETRIES; attempt++) {
		const result = generateBSPMap(width, height, rng, requiredCount);
		if (!result) continue;

		const { map, rooms } = result;

		// ひび割れ壁配置: 異なる2部屋を隔てる壁タイルから候補を選出
		const crackedWallTarget = getCrackedWallCount(floor);
		if (crackedWallTarget > 0) {
			const candidates: Position[] = [];
			for (let y = 1; y < height - 1; y++) {
				for (let x = 1; x < width - 1; x++) {
					if (map[y][x].type !== "wall") continue;
					const roomL = findRoomAt({ x: x - 1, y }, rooms);
					const roomR = findRoomAt({ x: x + 1, y }, rooms);
					const roomT = findRoomAt({ x, y: y - 1 }, rooms);
					const roomB = findRoomAt({ x, y: y + 1 }, rooms);
					if (
						(roomL && roomR && roomL !== roomR) ||
						(roomT && roomB && roomT !== roomB)
					) {
						candidates.push({ x, y });
					}
				}
			}
			const count = Math.min(crackedWallTarget, candidates.length);
			if (count > 0) {
				const selected = rng.sample(candidates, count);
				for (const pos of selected) {
					map[pos.y][pos.x] = { type: "cracked_wall" };
				}
			}
		}

		const floorPositions = getFloorPositions(map);
		if (floorPositions.length < requiredCount) continue;

		// プレイヤー/敵はすべての床タイルからサンプリング
		const playerEnemyCount = 1 + enemyCount;
		const playerEnemySampled = rng.sample(floorPositions, playerEnemyCount);
		const player = playerEnemySampled[0];
		if (!player) continue;
		const enemies = playerEnemySampled.slice(1);

		// 階段は部屋内の床タイルからサンプリング（通路に配置しない）
		const baseExcludeSet = new Set(
			playerEnemySampled.map((p) => positionToKey(p)),
		);
		const roomFloorForStairs = getRoomFloorPositions(
			map,
			rooms,
			baseExcludeSet,
		);
		if (roomFloorForStairs.length < STAIRS_COUNT) continue;
		const stairsSampled = rng.sample(roomFloorForStairs, STAIRS_COUNT);
		const stairs = stairsSampled[0];
		if (!stairs) continue;
		map[stairs.y][stairs.x] = createStairsTile();

		// 特殊タイルは部屋内の床タイルからサンプリング（既配置位置を除外）
		const excludeSet = new Set([
			...playerEnemySampled.map((p) => positionToKey(p)),
			...stairsSampled.map((p) => positionToKey(p)),
		]);
		const roomFloorPositions = getRoomFloorPositions(map, rooms, excludeSet);

		if (roomFloorPositions.length < specialTileCount) continue;

		const specialSampled = rng.sample(roomFloorPositions, specialTileCount);
		const specialTileTypes = getSpecialTileTypes(floor);
		const specialTiles: { position: Position; type: TileType }[] = [];

		for (let i = 0; i < specialTileCount; i++) {
			const pos = specialSampled[i];
			const type = specialTileTypes[i];
			map[pos.y][pos.x] = { type };
			specialTiles.push({ position: pos, type });
		}

		return { map, rooms, player, stairs, enemies, specialTiles };
	}

	// リトライ上限到達時は固定レイアウトにフォールバック
	return generateFixedMapPlacement(rng, floor, width, height);
}

/**
 * 固定レイアウトマップでの配置生成
 */
function generateFixedMapPlacement(
	rng: RNG,
	floor: number = INITIAL_FLOOR,
	width: number = MAP_WIDTH,
	height: number = MAP_HEIGHT,
): MapPlacement {
	const map = createFixedLayoutMap(width, height);
	const floorPositions = getFloorPositions(map);
	const enemyCount = getEnemyCount(floor);
	const specialTileCount = getSpecialTileCount(floor);
	const requiredCount = 1 + STAIRS_COUNT + enemyCount + specialTileCount;

	if (requiredCount > floorPositions.length) {
		throw new Error(
			`Not enough floor tiles: required ${requiredCount}, available ${floorPositions.length}`,
		);
	}

	const sampled = rng.sample(floorPositions, requiredCount);
	const player = sampled[0];
	const stairsPositions = sampled.slice(1, 1 + STAIRS_COUNT);
	const enemies = sampled.slice(
		1 + STAIRS_COUNT,
		1 + STAIRS_COUNT + enemyCount,
	);

	const stairs = stairsPositions[0];
	map[stairs.y][stairs.x] = createStairsTile();

	// 特殊タイル（固定レイアウトでは部屋/通路の区別なし、全床タイルからサンプリング）
	const specialPositions = sampled.slice(1 + STAIRS_COUNT + enemyCount);
	const specialTileTypes = getSpecialTileTypes(floor);
	const specialTiles: { position: Position; type: TileType }[] = [];

	for (let i = 0; i < specialTileCount; i++) {
		const pos = specialPositions[i];
		const type = specialTileTypes[i];
		map[pos.y][pos.x] = { type };
		specialTiles.push({ position: pos, type });
	}

	return { map, rooms: [], player, stairs, enemies, specialTiles };
}

/**
 * マップ生成（モードに応じて固定/BSPを切り替え）
 */
export function generateMapPlacement(
	rng: RNG,
	floor: number = INITIAL_FLOOR,
): MapPlacement {
	const { width, height } = getMapSize(floor);
	if (MAP_GENERATION_MODE === "bsp") {
		return generateBSPMapPlacement(rng, width, height, floor);
	}

	return generateFixedMapPlacement(rng, floor, width, height);
}
