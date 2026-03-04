import { describe, expect, it } from "vitest";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import {
	createInitialCounters,
	exchangeCardInDeck,
	updateDefeatCounter,
	updateHitCounter,
} from "./cardAcquisition";
import { createInitialCardStats } from "./deck";

describe("createInitialCounters", () => {
	it("全カウンターが0で初期化される", () => {
		const counters = createInitialCounters();
		for (const type of [
			"normal",
			"heavy",
			"scout",
			"ranged",
			"miniboss",
			"boss",
		] as const) {
			expect(counters.defeatCounts[type]).toBe(0);
			expect(counters.hitCounts[type]).toBe(0);
		}
	});
});

describe("updateDefeatCounter", () => {
	it("撃破カウンターが+1される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "normal");
		expect(updated.defeatCounts.normal).toBe(1);
	});

	it("イミュータブルに更新される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "normal");
		expect(counters.defeatCounts.normal).toBe(0);
		expect(updated).not.toBe(counters);
	});

	it("指定した敵タイプのみ更新される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "heavy");
		expect(updated.defeatCounts.heavy).toBe(1);
		expect(updated.defeatCounts.normal).toBe(0);
		expect(updated.defeatCounts.scout).toBe(0);
	});
});

describe("updateHitCounter", () => {
	it("被弾カウンターが+1される", () => {
		const counters = createInitialCounters();
		const updated = updateHitCounter(counters, "scout");
		expect(updated.hitCounts.scout).toBe(1);
	});

	it("イミュータブルに更新される", () => {
		const counters = createInitialCounters();
		const updated = updateHitCounter(counters, "scout");
		expect(counters.hitCounts.scout).toBe(0);
		expect(updated).not.toBe(counters);
	});
});

describe("exchangeCardInDeck", () => {
	function createTestCards(): Card[] {
		return [
			{
				id: "test-card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
			{
				id: "test-card-2",
				type: "move",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
			{
				id: "test-card-3",
				type: "move",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
			{
				id: "test-card-4",
				type: "fire",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
			{
				id: "test-card-5",
				type: "fire",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
			{
				id: "test-card-6",
				type: "wait",
				level: 1,
				exp: 0,
				stats: createInitialCardStats(),
			},
		];
	}

	it("手札からカードを除去して新カードを追加", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-1", "thunder");
		expect(result.deck.hand.some((c) => c.id === "test-card-1")).toBe(false);
		expect(result.deck.hand.some((c) => c.type === "thunder")).toBe(true);
	});

	it("handの同位置に新カードを挿入", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-3", "jump");
		expect(result.deck.hand[2].type).toBe("jump");
		expect(result.deck.hand.length).toBe(6);
	});

	it("手札の枚数が維持される", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-2", "thunder");
		expect(result.deck.hand.length).toBe(cards.length);
	});

	it("usedCardIdsから除去対象のIDが取り除かれる", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: ["test-card-2", "test-card-4"],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-2", "thunder");
		expect(result.deck.usedCardIds).not.toContain("test-card-2");
		expect(result.deck.usedCardIds).toContain("test-card-4");
	});

	it("存在しないカードIDでエラーをthrow", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		expect(() =>
			exchangeCardInDeck(state, "nonexistent-id", "thunder"),
		).toThrow('removeCardId "nonexistent-id" not found in hand');
	});
});
