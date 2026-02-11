/**
 * Fog of War（未探索エリア管理）
 * @see docs/spec/rules.md - 視界（Fog of War）
 */

import type { GameMap, Position, Room } from "../types";
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

	while (queue.length > 0) {
		const current = queue.shift()!;
		const key = positionToKey(current);
		if (seen.has(key)) continue;

		if (
			current.x < 0 ||
			current.x >= mapWidth ||
			current.y < 0 ||
			current.y >= mapHeight
		)
			continue;

		if (map[current.y][current.x].type === "wall") continue;

		if (findRoomAt(current, rooms)) continue;

		seen.add(key);
		result.push(current);

		queue.push({ x: current.x + 1, y: current.y });
		queue.push({ x: current.x - 1, y: current.y });
		queue.push({ x: current.x, y: current.y + 1 });
		queue.push({ x: current.x, y: current.y - 1 });
	}

	return result;
}

/**
 * 指定位置を訪問済みにする（部屋全体・通路全体を含む）
 *
 * - タイル自体を訪問済みに追加
 * - 部屋内にいる場合、その部屋の全タイルを訪問済みに追加
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
	} else if (rooms.length > 0 && map.length > 0) {
		for (const tile of getConnectedCorridorTiles(position, rooms, map)) {
			newSet.add(positionToKey(tile));
		}
	}

	return newSet;
}
