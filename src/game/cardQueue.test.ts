/**
 * カード予約キューのテスト
 */

import { afterEach, describe, expect, it } from "vitest";
import type { Card } from "../types";
import {
	buildQueuedCardIndexMap,
	canEnqueueCard,
	getQueuedApCost,
	type QueuedCard,
} from "./cardQueue";
import { resetDebugCheats, toggleDebugCheat } from "./debugCheats";

describe("cardQueue", () => {
	describe("getQueuedApCost", () => {
		it("空キューのコストは0", () => {
			expect(getQueuedApCost([])).toBe(0);
		});

		it("moveカード1枚のコストは1", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
			];
			expect(getQueuedApCost(queue)).toBe(1);
		});

		it("複数カードのコストが合算される", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
				{
					card: { id: "c2", type: "strong_attack", keyword: "flame" },
					direction: "down",
				},
			];
			// move(1) + strong_attack(2) = 3
			expect(getQueuedApCost(queue)).toBe(3);
		});

		it("waitカード(コスト0)は合計に影響しない", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "wait", keyword: "flame" } },
				{
					card: { id: "c2", type: "move", keyword: "flame" },
					direction: "left",
				},
			];
			// wait(0) + move(1) = 1
			expect(getQueuedApCost(queue)).toBe(1);
		});
	});

	describe("canEnqueueCard", () => {
		it("AP残ありで予約可能", () => {
			const card: Card = { id: "c1", type: "move", keyword: "flame" };
			expect(canEnqueueCard(3, [], card)).toBe(true);
		});

		it("AP不足で予約不可", () => {
			const card: Card = { id: "c1", type: "strong_attack", keyword: "flame" };
			// AP=1, strong_attack costs 2
			expect(canEnqueueCard(1, [], card)).toBe(false);
		});

		it("キュー内カードのAP消費を考慮して判定", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
			];
			// AP=2, queue cost=1, remaining=1, attack costs 1 → OK
			const card: Card = { id: "c2", type: "attack", keyword: "flame" };
			expect(canEnqueueCard(2, queue, card)).toBe(true);
		});

		it("キュー消費+新カードコストがAPを超えると予約不可", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
				{
					card: { id: "c2", type: "attack", keyword: "flame" },
					direction: "down",
				},
			];
			// AP=3, queue cost=2, remaining=1, strong_attack costs 2 → NG
			const card: Card = { id: "c3", type: "strong_attack", keyword: "flame" };
			expect(canEnqueueCard(3, queue, card)).toBe(false);
		});

		it("waitカード(コスト0)は常に予約可能", () => {
			const card: Card = { id: "c1", type: "wait", keyword: "flame" };
			expect(canEnqueueCard(0, [], card)).toBe(true);
		});

		it("AP=コストちょうどで予約可能", () => {
			const card: Card = { id: "c1", type: "jump", keyword: "flame" };
			// AP=2, jump costs 2 → OK
			expect(canEnqueueCard(2, [], card)).toBe(true);
		});
	});

	describe("buildQueuedCardIndexMap", () => {
		it("空キューは空Mapを返す", () => {
			expect(buildQueuedCardIndexMap([])).toEqual(new Map());
		});

		it("1件のキューは1始まりのインデックスを返す", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
			];
			expect(buildQueuedCardIndexMap(queue)).toEqual(new Map([["c1", 1]]));
		});

		it("複数件のキューは挿入順にインデックスを返す", () => {
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
				{
					card: { id: "c2", type: "attack", keyword: "flame" },
					direction: "down",
				},
				{
					card: { id: "c3", type: "jump", keyword: "flame" },
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

	describe("AP無限チート", () => {
		afterEach(() => {
			resetDebugCheats();
		});

		it("AP無限ON時にgetQueuedApCostが常に0を返す", () => {
			toggleDebugCheat("infiniteAp");
			const queue: QueuedCard[] = [
				{ card: { id: "c1", type: "move", keyword: "flame" }, direction: "up" },
				{
					card: { id: "c2", type: "strong_attack", keyword: "flame" },
					direction: "down",
				},
			];
			// 通常: move(1) + strong_attack(2) = 3 だがAP無限ONなので0
			expect(getQueuedApCost(queue)).toBe(0);
		});

		it("AP無限ON時にcanEnqueueCardがAP不足でもtrueを返す", () => {
			toggleDebugCheat("infiniteAp");
			const card: Card = { id: "c1", type: "strong_attack", keyword: "flame" };
			// AP=0, strong_attack costs 2 → 通常NG だがAP無限ONなのでOK
			expect(canEnqueueCard(0, [], card)).toBe(true);
		});
	});
});
