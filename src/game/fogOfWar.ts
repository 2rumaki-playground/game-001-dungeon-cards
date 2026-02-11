/**
 * Fog of War（未探索エリア管理）
 * @see docs/spec/rules.md - 視界（Fog of War）
 */

import type { Position, Room } from "../types";
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
 * 指定位置を訪問済みにする（部屋全体を含む）
 *
 * - タイル自体を訪問済みに追加
 * - 部屋内にいる場合、その部屋の全タイルを訪問済みに追加
 *
 * 新しいSetを返す（イミュータブル）
 */
export function revealAtPosition(
	visitedTiles: Set<string>,
	position: Position,
	rooms: Room[],
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
	}

	return newSet;
}
