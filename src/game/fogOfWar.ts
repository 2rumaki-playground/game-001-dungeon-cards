/**
 * Fog of War（未探索エリア管理）
 * @see docs/spec/rules.md - 視界（Fog of War）
 */

import type { GameMap, Position, Room } from "../types";
import { isWallTile } from "./map";
import { positionToKey } from "./positionUtils";
import { findRoomAt } from "./roomUtils";

/**
 * 空の訪問済みSetを作成
 */
export function createEmptyVisitedTiles(): Set<string> {
	return new Set<string>();
}

/**
 * 位置が訪問済みか判定
 */
export function isVisited(
	visitedTiles: Set<string>,
	position: Position,
): boolean {
	return visitedTiles.has(positionToKey(position));
}

/**
 * 通路タイルから繋がっている全通路タイルをBFSで探索
 *
 * 部屋に属さない、壁でないタイルを通路として扱い、
 * 4方向に隣接する通路タイルを全て返す。
 */
function getConnectedCorridorTiles(
	position: Position,
	rooms: Room[],
	map: GameMap,
): Position[] {
	const mapHeight = map.length;
	const mapWidth = map[0]?.length ?? 0;
	const seen = new Set<string>();
	const result: Position[] = [];
	const queue: Position[] = [position];
	let head = 0;

	while (head < queue.length) {
		const current = queue[head++] as Position;

		if (
			current.x < 0 ||
			current.x >= mapWidth ||
			current.y < 0 ||
			current.y >= mapHeight
		)
			continue;

		const key = positionToKey(current);
		if (seen.has(key)) continue;
		seen.add(key);

		if (isWallTile(map[current.y][current.x])) continue;

		if (findRoomAt(current, rooms)) continue;

		result.push(current);

		queue.push({ x: current.x + 1, y: current.y });
		queue.push({ x: current.x - 1, y: current.y });
		queue.push({ x: current.x, y: current.y + 1 });
		queue.push({ x: current.x, y: current.y - 1 });
	}

	return result;
}

/**
 * 部屋に隣接する通路入口タイルの座標を取得
 *
 * 部屋の各辺の外側1マスをスキャンし、壁でないタイルを通路入口として返す。
 */
function getCorridorEntrances(room: Room, map: GameMap): Position[] {
	const entrances: Position[] = [];
	const mapHeight = map.length;
	const mapWidth = map[0]?.length ?? 0;

	// 上辺の外側1マス
	const topY = room.y - 1;
	if (topY >= 0) {
		for (let x = room.x; x < room.x + room.width; x++) {
			if (x >= 0 && x < mapWidth && !isWallTile(map[topY][x])) {
				entrances.push({ x, y: topY });
			}
		}
	}

	// 下辺の外側1マス
	const bottomY = room.y + room.height;
	if (bottomY < mapHeight) {
		for (let x = room.x; x < room.x + room.width; x++) {
			if (x >= 0 && x < mapWidth && !isWallTile(map[bottomY][x])) {
				entrances.push({ x, y: bottomY });
			}
		}
	}

	// 左辺の外側1マス
	const leftX = room.x - 1;
	if (leftX >= 0) {
		for (let y = room.y; y < room.y + room.height; y++) {
			if (
				y >= 0 &&
				y < mapHeight &&
				leftX < mapWidth &&
				!isWallTile(map[y][leftX])
			) {
				entrances.push({ x: leftX, y });
			}
		}
	}

	// 右辺の外側1マス
	const rightX = room.x + room.width;
	if (rightX < mapWidth) {
		for (let y = room.y; y < room.y + room.height; y++) {
			if (y >= 0 && y < mapHeight && !isWallTile(map[y][rightX])) {
				entrances.push({ x: rightX, y });
			}
		}
	}

	return entrances;
}

/**
 * 指定位置を訪問済みにする（部屋全体・通路入口・通路全体を含む）
 *
 * - タイル自体を訪問済みに追加
 * - 部屋内にいる場合、その部屋の全タイル + 隣接する通路入口タイルを訪問済みに追加
 * - 通路にいる場合（BSPモード）、繋がった通路タイルを全て訪問済みに追加
 *
 * 新しいSetを返す（イミュータブル）
 */
export function revealAtPosition(
	visitedTiles: Set<string>,
	position: Position,
	rooms: Room[],
	map: GameMap,
): Set<string> {
	const newSet = new Set(visitedTiles);
	newSet.add(positionToKey(position));

	const room = findRoomAt(position, rooms);
	if (room) {
		for (let y = room.y; y < room.y + room.height; y++) {
			for (let x = room.x; x < room.x + room.width; x++) {
				newSet.add(positionToKey({ x, y }));
			}
		}

		if (map.length > 0) {
			for (const entrance of getCorridorEntrances(room, map)) {
				newSet.add(positionToKey(entrance));
			}
		}
	} else if (rooms.length > 0 && map.length > 0) {
		for (const tile of getConnectedCorridorTiles(position, rooms, map)) {
			newSet.add(positionToKey(tile));
		}
	}

	return newSet;
}
