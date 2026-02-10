import { describe, expect, it } from "vitest";
import type { Room } from "../types";
import { findRoomAt, isInRoom, isInSameRoom } from "./roomUtils";

describe("isInRoom", () => {
	const room: Room = { x: 2, y: 3, width: 4, height: 3 };

	it("部屋内の座標でtrueを返す", () => {
		expect(isInRoom({ x: 2, y: 3 }, room)).toBe(true);
		expect(isInRoom({ x: 5, y: 5 }, room)).toBe(true);
		expect(isInRoom({ x: 3, y: 4 }, room)).toBe(true);
	});

	it("部屋外の座標でfalseを返す", () => {
		expect(isInRoom({ x: 1, y: 3 }, room)).toBe(false);
		expect(isInRoom({ x: 6, y: 3 }, room)).toBe(false);
		expect(isInRoom({ x: 2, y: 2 }, room)).toBe(false);
		expect(isInRoom({ x: 2, y: 6 }, room)).toBe(false);
	});

	it("部屋の境界上はtrueを返す", () => {
		// 左上
		expect(isInRoom({ x: 2, y: 3 }, room)).toBe(true);
		// 右下（x: 2+4-1=5, y: 3+3-1=5）
		expect(isInRoom({ x: 5, y: 5 }, room)).toBe(true);
	});
});

describe("findRoomAt", () => {
	const rooms: Room[] = [
		{ x: 2, y: 2, width: 3, height: 3 },
		{ x: 8, y: 8, width: 4, height: 4 },
	];

	it("部屋内の座標で対応する部屋を返す", () => {
		expect(findRoomAt({ x: 3, y: 3 }, rooms)).toEqual(rooms[0]);
		expect(findRoomAt({ x: 9, y: 9 }, rooms)).toEqual(rooms[1]);
	});

	it("どの部屋にも属さない座標（廊下）でnullを返す", () => {
		expect(findRoomAt({ x: 6, y: 6 }, rooms)).toBeNull();
	});

	it("部屋リストが空の場合nullを返す", () => {
		expect(findRoomAt({ x: 3, y: 3 }, [])).toBeNull();
	});
});

describe("isInSameRoom", () => {
	const rooms: Room[] = [
		{ x: 2, y: 2, width: 3, height: 3 },
		{ x: 8, y: 8, width: 4, height: 4 },
	];

	it("同じ部屋にいる2座標でtrueを返す", () => {
		expect(isInSameRoom({ x: 2, y: 2 }, { x: 4, y: 4 }, rooms)).toBe(true);
	});

	it("異なる部屋にいる2座標でfalseを返す", () => {
		expect(isInSameRoom({ x: 2, y: 2 }, { x: 9, y: 9 }, rooms)).toBe(false);
	});

	it("片方が廊下にいる場合falseを返す", () => {
		expect(isInSameRoom({ x: 2, y: 2 }, { x: 6, y: 6 }, rooms)).toBe(false);
	});

	it("両方が廊下にいる場合falseを返す", () => {
		expect(isInSameRoom({ x: 6, y: 6 }, { x: 7, y: 7 }, rooms)).toBe(false);
	});

	it("部屋リストが空の場合falseを返す", () => {
		expect(isInSameRoom({ x: 2, y: 2 }, { x: 3, y: 3 }, [])).toBe(false);
	});
});
