/**
 * カード予約キューのテスト
 */

import { describe, expect, it } from "vitest";
import type { Card } from "../types";
import {
	buildQueuedCardIndexMap,
	canEnqueueCard,
	type QueuedCard,
} from "./cardQueue";

describe("cardQueue", () => {
	describe("canEnqueueCard", () => {
		it("未使用カードは予約可能", () => {
			const card: Card = {
				id: "c1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			expect(canEnqueueCard([], card)).toBe(true);
		});

		it("使用済みカードは予約不可", () => {
			const card: Card = {
				id: "c1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			const deck = { hand: [card], usedCardIds: ["c1"] };
			expect(canEnqueueCard([], card, deck)).toBe(false);
		});

		it("キュー内に同じカードがあれば予約不可", () => {
			const card: Card = {
				id: "c1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			const queue: QueuedCard[] = [{ card, direction: "up" }];
			expect(canEnqueueCard(queue, card)).toBe(false);
		});

		it("キュー内に別のカードがあれば予約可能", () => {
			const card1: Card = {
				id: "c1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			const card2: Card = {
				id: "c2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			const queue: QueuedCard[] = [{ card: card1, direction: "up" }];
			expect(canEnqueueCard(queue, card2)).toBe(true);
		});

		it("deck未指定でも未使用カードは予約可能", () => {
			const card: Card = {
				id: "c1",
				type: "wait",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			};
			expect(canEnqueueCard([], card)).toBe(true);
		});
	});

	describe("buildQueuedCardIndexMap", () => {
		it("空キューは空Mapを返す", () => {
			expect(buildQueuedCardIndexMap([])).toEqual(new Map());
		});

		it("1件のキューは1始まりのインデックスを返す", () => {
			const queue: QueuedCard[] = [
				{
					card: {
						id: "c1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					direction: "up",
				},
			];
			expect(buildQueuedCardIndexMap(queue)).toEqual(new Map([["c1", 1]]));
		});

		it("複数件のキューは挿入順にインデックスを返す", () => {
			const queue: QueuedCard[] = [
				{
					card: {
						id: "c1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					direction: "up",
				},
				{
					card: {
						id: "c2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					direction: "down",
				},
				{
					card: {
						id: "c3",
						type: "jump",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					direction: "left",
				},
			];
			expect(buildQueuedCardIndexMap(queue)).toEqual(
				new Map([
					["c1", 1],
					["c2", 2],
					["c3", 3],
				]),
			);
		});
	});
});
