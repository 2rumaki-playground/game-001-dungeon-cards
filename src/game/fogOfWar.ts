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
			if (x >= 0 && x < mapWidth && map[topY][x].type !== "wall") {
				entrances.push({ x, y: topY });
			}
		}
	}

	// 下辺の外側1マス
	const bottomY = room.y + room.height;
	if (bottomY < mapHeight) {
		for (let x = room.x; x < room.x + room.width; x++) {
			if (x >= 0 && x < mapWidth && map[bottomY][x].type !== "wall") {
				entrances.push({ x, y: bottomY });
			}
		}
	}

	// 左辺の外側1マス
	const leftX = room.x - 1;
	if (leftX >= 0) {
		for (let y = room.y; y < room.y + room.height; y++) {
			if (y >= 0 && y < mapHeight && map[y][leftX].type !== "wall") {
				entrances.push({ x: leftX, y });
			}
		}
	}

	// 右辺の外側1マス
	const rightX = room.x + room.width;
	if (rightX < mapWidth) {
		for (let y = room.y; y < room.y + room.height; y++) {
			if (y >= 0 && y < mapHeight && map[y][rightX].type !== "wall") {
				entrances.push({ x: rightX, y });
			}
		}
	}

	return entrances;
}

/**
 * 指定位置を訪問済みにする（部屋全体 + 通路入口を含む）
 *
 * - タイル自体を訪問済みに追加
 * - 部屋内にいる場合、その部屋の全タイルを訪問済みに追加
 * - 部屋に隣接する通路入口タイル（各辺の外側1マスで壁でないタイル）も訪問済みに追加
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
	}

	return newSet;
}
