/**
 * マップ生成
 * @see docs/spec/mvp/rules.md - マップ生成
 */

import { ENEMY_COUNT, MAP_HEIGHT, MAP_WIDTH, STAIRS_COUNT } from "../constants";
import type { GameMap, Position, Tile } from "../types";
import type { RNG } from "../utils/rng";

export type MapPlacement = {
	map: GameMap;
	player: Position;
	stairs: Position;
	enemies: Position[];
};

const createWallTile = (): Tile => ({ type: "wall" });
const createFloorTile = (): Tile => ({ type: "floor" });
const createStairsTile = (): Tile => ({ type: "stairs" });

/**
 * 固定レイアウトのマップを生成（外周が壁、内側が床）
 */
export function createFixedLayoutMap(): GameMap {
	const map: GameMap = [];
	for (let y = 0; y < MAP_HEIGHT; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < MAP_WIDTH; x++) {
			const isBoundary =
				x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
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
 * 固定レイアウトに対してプレイヤー/階段/敵をランダム配置
 */
export function generateMapPlacement(rng: RNG): MapPlacement {
	const map = createFixedLayoutMap();
	const floorPositions = getFloorPositions(map);
	const requiredCount = 1 + STAIRS_COUNT + ENEMY_COUNT;

	if (requiredCount > floorPositions.length) {
		throw new Error(
			`Not enough floor tiles: required ${requiredCount}, available ${floorPositions.length}`,
		);
	}

	const sampled = rng.sample(floorPositions, requiredCount);
	const player = sampled[0];
	const stairsPositions = sampled.slice(1, 1 + STAIRS_COUNT);
	const enemies = sampled.slice(1 + STAIRS_COUNT);

	const stairs = stairsPositions[0];
	map[stairs.y][stairs.x] = createStairsTile();

	return { map, player, stairs, enemies };
}
