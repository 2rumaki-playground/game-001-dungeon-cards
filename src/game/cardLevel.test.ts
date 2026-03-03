import { describe, expect, it, vi } from "vitest";
import {
	CARD_MAX_LEVEL,
	CARD_XP_TABLE,
	EVENT_LEVEL_UP_THRESHOLD,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import {
	addExpToCard,
	awardExpToCard,
	calculateLevel,
	getExpProgress,
	getLevelDamageBonus,
	hasKnockbackEffect,
	hasPierceEffect,
	hasRangeExtendEffect,
	hasShockwaveEffect,
	isMaxLevel,
	normalizeCardLevel,
} from "./cardLevel";
import { resetSession, startSession } from "./playStats";

function makeCard(overrides?: Partial<Card>): Card {
	return {
		id: "card-1",
		type: "fire",
		level: 1,
		exp: 0,
		stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		...overrides,
	};
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

	it("XP 5 でレベル2", () => {
		expect(calculateLevel(5)).toBe(2);
	});

	it("XP 6 でレベル3", () => {
		expect(calculateLevel(6)).toBe(3);
	});

	it("XP 14 でレベル4", () => {
		expect(calculateLevel(14)).toBe(4);
	});

	it("XP 30 でレベル5（最大）", () => {
		expect(calculateLevel(30)).toBe(5);
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
		const { card: updated, leveledUp } = addExpToCard(card, 14);
		expect(updated.exp).toBe(14);
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

describe("normalizeCardLevel", () => {
	it("正常なレベルはそのまま返す", () => {
		expect(normalizeCardLevel(makeCard({ level: 1 }))).toBe(1);
		expect(normalizeCardLevel(makeCard({ level: 3 }))).toBe(3);
		expect(normalizeCardLevel(makeCard({ level: CARD_MAX_LEVEL }))).toBe(
			CARD_MAX_LEVEL,
		);
	});

	it("0以下はLv.1にクランプされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(normalizeCardLevel(makeCard({ level: 0 }))).toBe(1);
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it("最大レベル超はMAXにクランプされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(normalizeCardLevel(makeCard({ level: CARD_MAX_LEVEL + 1 }))).toBe(
			CARD_MAX_LEVEL,
		);
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it.each([
		NaN,
		Infinity,
		-Infinity,
	])("level=%s はLv.1にフォールバックされ警告が出る", (invalidLevel) => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(normalizeCardLevel(makeCard({ level: invalidLevel }))).toBe(1);
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it("小数レベルはLv.1にフォールバックされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(normalizeCardLevel(makeCard({ level: 2.5 }))).toBe(1);
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
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
		const card = makeCard({ level: CARD_MAX_LEVEL, exp: 30 });
		const progress = getExpProgress(card);
		expect(progress.ratio).toBe(1);
	});

	it("異常レベルでもnormalizeCardLevelにより正しく動作する", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const card = makeCard({ level: 999, exp: 0 });
		const progress = getExpProgress(card);
		// Lv.MAXにクランプ → ratio=1
		expect(progress.ratio).toBe(1);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("expがレベルに対して過剰でもratioは1にクランプされる", () => {
		const card = makeCard({ level: 1, exp: 100 });
		expect(getExpProgress(card).ratio).toBe(1);
	});

	it("expが負値でもratioは0にクランプされる", () => {
		const card = makeCard({ level: 1, exp: -5 });
		expect(getExpProgress(card).ratio).toBe(0);
	});
});

describe("getExpProgress（レベル内進捗率）", () => {
	it("レベルアップ直後は進捗率0", () => {
		const card = makeCard({ level: 2, exp: 2 });
		expect(getExpProgress(card).ratio).toBe(0);
	});

	it("レベル2でXP4の進捗率は0.5", () => {
		const card = makeCard({ level: 2, exp: 4 });
		expect(getExpProgress(card).ratio).toBe(0.5);
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

	it("異常レベルでもnormalizeCardLevelにより正しく判定される", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		// Lv.999 → MAXにクランプ → true
		expect(isMaxLevel(makeCard({ level: 999 }))).toBe(true);
		// Lv.NaN → 1にフォールバック → false
		expect(isMaxLevel(makeCard({ level: NaN }))).toBe(false);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe("getLevelDamageBonus", () => {
	it.each([
		[1, 0],
		[2, 1],
		[3, 1],
		[4, 2],
		[5, 3],
	])("Lv.%i のボーナスは %i", (level, expected) => {
		const card = makeCard({ level });
		expect(getLevelDamageBonus(card)).toBe(expected);
	});

	it("レベル0以下はLv.1にクランプされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const card = makeCard({ level: 0 });
		expect(getLevelDamageBonus(card)).toBe(0); // Lv.1相当
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it("最大レベル超はMAXにクランプされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const card = makeCard({ level: CARD_MAX_LEVEL + 1 });
		expect(getLevelDamageBonus(card)).toBe(3); // Lv.5相当
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it.each([
		NaN,
		Infinity,
		-Infinity,
	])("level=%s はLv.1にフォールバックされ警告が出る", (invalidLevel) => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const card = makeCard({ level: invalidLevel });
		expect(getLevelDamageBonus(card)).toBe(0); // Lv.1相当
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it("小数レベルはLv.1にフォールバックされ警告が出る", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const card = makeCard({ level: 2.5 });
		expect(getLevelDamageBonus(card)).toBe(0); // Lv.1相当
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});
});

describe("hasPierceEffect", () => {
	it.each([1, 2])("ファイアボルトLv.%i ではfalse", (level) => {
		expect(hasPierceEffect(makeCard({ type: "fire", level }))).toBe(false);
	});

	it.each([3, 4, 5])("ファイアボルトLv.%i ではtrue", (level) => {
		expect(hasPierceEffect(makeCard({ type: "fire", level }))).toBe(true);
	});

	it("ファイアボルト以外ではレベルに関係なくfalse", () => {
		expect(hasPierceEffect(makeCard({ type: "thunder", level: 5 }))).toBe(
			false,
		);
		expect(hasPierceEffect(makeCard({ type: "move", level: 5 }))).toBe(false);
	});
});

describe("hasRangeExtendEffect", () => {
	it.each([1, 2, 3, 4])("ファイアボルトLv.%i ではfalse", (level) => {
		expect(hasRangeExtendEffect(makeCard({ type: "fire", level }))).toBe(false);
	});

	it("ファイアボルトLv.5ではtrue", () => {
		expect(hasRangeExtendEffect(makeCard({ type: "fire", level: 5 }))).toBe(
			true,
		);
	});

	it("ファイアボルト以外ではレベルに関係なくfalse", () => {
		expect(hasRangeExtendEffect(makeCard({ type: "thunder", level: 5 }))).toBe(
			false,
		);
	});
});

describe("hasKnockbackEffect", () => {
	it.each([1, 2])("強攻撃カードLv.%i ではfalse", (level) => {
		expect(hasKnockbackEffect(makeCard({ type: "thunder", level }))).toBe(
			false,
		);
	});

	it.each([3, 4, 5])("強攻撃カードLv.%i ではtrue", (level) => {
		expect(hasKnockbackEffect(makeCard({ type: "thunder", level }))).toBe(true);
	});

	it("強攻撃カード以外ではレベルに関係なくfalse", () => {
		expect(hasKnockbackEffect(makeCard({ type: "fire", level: 5 }))).toBe(
			false,
		);
	});
});

describe("hasShockwaveEffect", () => {
	it.each([1, 2, 3, 4])("強攻撃カードLv.%i ではfalse", (level) => {
		expect(hasShockwaveEffect(makeCard({ type: "thunder", level }))).toBe(
			false,
		);
	});

	it("強攻撃カードLv.5ではtrue", () => {
		expect(hasShockwaveEffect(makeCard({ type: "thunder", level: 5 }))).toBe(
			true,
		);
	});

	it("強攻撃カード以外ではレベルに関係なくfalse", () => {
		expect(hasShockwaveEffect(makeCard({ type: "fire", level: 5 }))).toBe(
			false,
		);
	});
});

describe("awardExpToCard", () => {
	it("手札内のカードにXPが付与される", () => {
		const card = makeCard({ id: "atk-1", type: "fire" });
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
		const card = makeCard({ id: "atk-1", type: "fire", exp: 1, level: 1 });
		const state = createTestState({
			deck: { hand: [card], usedCardIds: [] },
		});
		const next = awardExpToCard(state, "atk-1");
		expect(next.deck.hand[0].level).toBe(2);
		expect(next.actionLog[0].message).toContain("Lv.2");
	});

	it(`Lv.${EVENT_LEVEL_UP_THRESHOLD}到達でeventLogにcard_level_upが記録される`, () => {
		startSession();
		const xpForThreshold = CARD_XP_TABLE[EVENT_LEVEL_UP_THRESHOLD - 1];
		const card = makeCard({
			id: "atk-1",
			type: "fire",
			exp: xpForThreshold - 1,
			level: EVENT_LEVEL_UP_THRESHOLD - 1,
		});
		const state = createTestState({
			deck: { hand: [card], usedCardIds: [] },
			floor: 5,
		});
		const next = awardExpToCard(state, "atk-1");
		expect(next.deck.hand[0].level).toBe(EVENT_LEVEL_UP_THRESHOLD);
		expect(next.eventLog).toHaveLength(1);
		expect(next.eventLog[0].type).toBe("card_level_up");
		expect(next.eventLog[0].floor).toBe(5);
		resetSession();
	});

	it(`Lv.${EVENT_LEVEL_UP_THRESHOLD}未満のレベルアップではeventLogに記録されない`, () => {
		startSession();
		const card = makeCard({ id: "atk-1", type: "fire", exp: 1, level: 1 });
		const state = createTestState({
			deck: { hand: [card], usedCardIds: [] },
		});
		const next = awardExpToCard(state, "atk-1");
		expect(next.deck.hand[0].level).toBe(2);
		expect(next.eventLog).toHaveLength(0);
		resetSession();
	});
});
