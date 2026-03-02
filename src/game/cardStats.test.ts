import { describe, expect, it } from "vitest";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card, GameState } from "../types";
import { incrementUseCount, recordDefeat, updateMaxDamage } from "./cardStats";

function makeCard(overrides?: Partial<Card>): Card {
	return {
		id: "card-1",
		type: "attack",
		level: 1,
		exp: 0,
		stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		...overrides,
	};
}

function stateWithCard(card: Card): GameState {
	return createTestState({
		deck: { hand: [card], usedCardIds: [] },
	});
}

describe("incrementUseCount", () => {
	it("useCountを1増加させる", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = incrementUseCount(state, "card-1");
		expect(next.deck.hand[0].stats.useCount).toBe(1);
	});

	it("既にuseCountがある場合は累加する", () => {
		const card = makeCard({
			stats: { useCount: 5, defeatCount: 0, maxSingleDamage: 0 },
		});
		const state = stateWithCard(card);
		const next = incrementUseCount(state, "card-1");
		expect(next.deck.hand[0].stats.useCount).toBe(6);
	});

	it("存在しないcardIdでは状態を変更しない", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = incrementUseCount(state, "nonexistent");
		expect(next).toBe(state);
	});

	it("他のstatsフィールドは変更しない", () => {
		const card = makeCard({
			stats: { useCount: 3, defeatCount: 2, maxSingleDamage: 10 },
		});
		const state = stateWithCard(card);
		const next = incrementUseCount(state, "card-1");
		expect(next.deck.hand[0].stats.defeatCount).toBe(2);
		expect(next.deck.hand[0].stats.maxSingleDamage).toBe(10);
	});
});

describe("recordDefeat", () => {
	it("defeatCountを1増加させる", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = recordDefeat(state, "card-1");
		expect(next.deck.hand[0].stats.defeatCount).toBe(1);
	});

	it("既にdefeatCountがある場合は累加する", () => {
		const card = makeCard({
			stats: { useCount: 0, defeatCount: 7, maxSingleDamage: 0 },
		});
		const state = stateWithCard(card);
		const next = recordDefeat(state, "card-1");
		expect(next.deck.hand[0].stats.defeatCount).toBe(8);
	});

	it("存在しないcardIdでは状態を変更しない", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = recordDefeat(state, "nonexistent");
		expect(next).toBe(state);
	});
});

describe("updateMaxDamage", () => {
	it("初回ダメージでmaxSingleDamageを更新する", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = updateMaxDamage(state, "card-1", 5);
		expect(next.deck.hand[0].stats.maxSingleDamage).toBe(5);
	});

	it("既存値より大きいダメージで更新される", () => {
		const card = makeCard({
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 3 },
		});
		const state = stateWithCard(card);
		const next = updateMaxDamage(state, "card-1", 7);
		expect(next.deck.hand[0].stats.maxSingleDamage).toBe(7);
	});

	it("既存値以下のダメージでは更新されない", () => {
		const card = makeCard({
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 10 },
		});
		const state = stateWithCard(card);
		const next = updateMaxDamage(state, "card-1", 5);
		expect(next.deck.hand[0].stats.maxSingleDamage).toBe(10);
	});

	it("同値のダメージでは更新されない（状態が変わらない）", () => {
		const card = makeCard({
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 5 },
		});
		const state = stateWithCard(card);
		const next = updateMaxDamage(state, "card-1", 5);
		expect(next).toBe(state);
	});

	it("存在しないcardIdでは状態を変更しない", () => {
		const card = makeCard();
		const state = stateWithCard(card);
		const next = updateMaxDamage(state, "nonexistent", 10);
		expect(next).toBe(state);
	});
});
