/**
 * 部屋判定ユーティリティ
 * @see docs/spec/rules.md - 敵の移動
 */

import type { Position, Room } from "../types";

/**
 * 座標が部屋内かを判定
 */
export function isInRoom(position: Position, room: Room): boolean {
	return (
		position.x >= room.x &&
		position.x < room.x + room.width &&
		position.y >= room.y &&
		position.y < room.y + room.height
	);
}

/**
 * 座標が属する部屋を返す（廊下ならnull）
 */
export function findRoomAt(position: Position, rooms: Room[]): Room | null {
	for (const room of rooms) {
		if (isInRoom(position, room)) {
			return room;
		}
	}
	return null;
}

/**
 * 2座標が同じ部屋内かを判定
 */
export function isInSameRoom(a: Position, b: Position, rooms: Room[]): boolean {
	const roomA = findRoomAt(a, rooms);
	if (!roomA) return false;
	return isInRoom(b, roomA);
}
