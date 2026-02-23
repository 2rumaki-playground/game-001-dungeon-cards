import { describe, expect, it } from "vitest";
import { CARD_MAX_LEVEL, CARD_XP_TABLE } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import {
	addExpToCard,
	awardExpToCard,
	calculateLevel,
	getExpProgress,
	isMaxLevel,
} from "./cardLevel";

function makeCard(overrides?: Partial<Card>): Card {
	return { id: "card-1", type: "attack", level: 1, exp: 0, ...overrides };
}

describe("calculateLevel", () => {
	it("XP 0 でレベル1", () => {
		expect(calculateLevel(0)).toBe(1);
	});

	it("XP 1 でレベル1", () => {
		expect(calculateLevel(1)).toBe(1);
	});

	it("XP 2 でレベル2", () => {
		expect(calculateLevel(2)).toBe(2);
	});

	it("XP 3 でレベル2", () => {
		expect(calculateLevel(3)).toBe(2);
	});

	it("XP 4 でレベル3", () => {
		expect(calculateLevel(4)).toBe(3);
	});

	it("XP 8 でレベル4", () => {
		expect(calculateLevel(8)).toBe(4);
	});

	it("XP 16 でレベル5（最大）", () => {
		expect(calculateLevel(16)).toBe(5);
	});

	it("XP 100 でもレベル5（上限）", () => {
		expect(calculateLevel(100)).toBe(5);
	});
});

describe("addExpToCard", () => {
	it("XP加算でレベルが変わらない場合", () => {
		const card = makeCard({ exp: 0, level: 1 });
		const { card: updated, leveledUp } = addExpToCard(card, 1);
		expect(updated.exp).toBe(1);
		expect(updated.level).toBe(1);
		expect(leveledUp).toBe(false);
	});

	it("XP加算でレベルアップする場合", () => {
		const card = makeCard({ exp: 1, level: 1 });
		const { card: updated, leveledUp } = addExpToCard(card, 1);
		expect(updated.exp).toBe(2);
		expect(updated.level).toBe(2);
		expect(leveledUp).toBe(true);
	});

	it("複数レベルを一度に飛び越える場合", () => {
		const card = makeCard({ exp: 0, level: 1 });
		const { card: updated, leveledUp } = addExpToCard(card, 8);
		expect(updated.exp).toBe(8);
		expect(updated.level).toBe(4);
		expect(leveledUp).toBe(true);
	});

	it("最大レベルを超えない", () => {
		const card = makeCard({
			exp: CARD_XP_TABLE[CARD_MAX_LEVEL - 1],
			level: CARD_MAX_LEVEL,
		});
		const { card: updated, leveledUp } = addExpToCard(card, 10);
		expect(updated.level).toBe(CARD_MAX_LEVEL);
		expect(leveledUp).toBe(false);
	});
});

describe("getExpProgress", () => {
	it("レベル1でXP 0の進捗率は0", () => {
		const card = makeCard({ level: 1, exp: 0 });
		const progress = getExpProgress(card);
		expect(progress.current).toBe(0);
		expect(progress.required).toBe(2);
		expect(progress.ratio).toBe(0);
	});

	it("レベル1でXP 1の進捗率は0.5", () => {
		const card = makeCard({ level: 1, exp: 1 });
		const progress = getExpProgress(card);
		expect(progress.current).toBe(1);
		expect(progress.required).toBe(2);
		expect(progress.ratio).toBe(0.5);
	});

	it("最大レベルの進捗率は1", () => {
		const card = makeCard({ level: CARD_MAX_LEVEL, exp: 16 });
		const progress = getExpProgress(card);
		expect(progress.ratio).toBe(1);
	});
});

describe("isMaxLevel", () => {
	it("最大レベル未満ではfalse", () => {
		expect(isMaxLevel(makeCard({ level: 1 }))).toBe(false);
		expect(isMaxLevel(makeCard({ level: 4 }))).toBe(false);
	});

	it("最大レベルではtrue", () => {
		expect(isMaxLevel(makeCard({ level: CARD_MAX_LEVEL }))).toBe(true);
	});
});

describe("awardExpToCard", () => {
	it("手札内のカードにXPが付与される", () => {
		const card = makeCard({ id: "atk-1", type: "attack" });
		const state = createTestState({
			deck: { hand: [card], usedCardIds: [] },
		});
		const next = awardExpToCard(state, "atk-1");
		expect(next.deck.hand[0].exp).toBe(1);
	});

	it("存在しないカードIDでは状態が変わらない", () => {
		const state = createTestState();
		const next = awardExpToCard(state, "nonexistent");
		expect(next).toBe(state);
	});

	it("レベルアップ時にログが記録される", () => {
		const card = makeCard({ id: "atk-1", type: "attack", exp: 1, level: 1 });
		const state = createTestState({
			deck: { hand: [card], usedCardIds: [] },
		});
		const next = awardExpToCard(state, "atk-1");
		expect(next.deck.hand[0].level).toBe(2);
		expect(next.actionLog[0].message).toContain("Lv.2");
	});
});
