import { beforeEach, describe, expect, it } from "vitest";
import { INITIAL_DECK, TOTAL_DECK_SIZE } from "../constants";
import type { DeckState } from "../types";
import {
	createInitialDeck,
	createInitialDeckState,
	getAllCards,
	getTotalDeckSize,
	isCardUsed,
	markCardUsed,
	reorderHand,
	resetCardIdCounter,
	resetUsedCards,
} from "./deck";

describe("deck", () => {
	beforeEach(() => {
		resetCardIdCounter();
	});

	describe("createInitialDeck", () => {
		it("合計4枚のカードを生成する", () => {
			const deck = createInitialDeck();
			expect(deck).toHaveLength(TOTAL_DECK_SIZE);
		});

		it("移動カード2枚、ファイアボルト1枚、待機カード1枚を含む", () => {
			const deck = createInitialDeck();
			const moveCards = deck.filter((c) => c.type === "move");
			const fireCards = deck.filter((c) => c.type === "fire");
			const waitCards = deck.filter((c) => c.type === "wait");
			expect(moveCards).toHaveLength(INITIAL_DECK.moveCards);
			expect(fireCards).toHaveLength(INITIAL_DECK.fireCards);
			expect(waitCards).toHaveLength(INITIAL_DECK.waitCards);
		});

		it("各カードに一意のIDを持つ", () => {
			const deck = createInitialDeck();
			const ids = deck.map((c) => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("固定順で生成される（move, move, fire, wait）", () => {
			const deck = createInitialDeck();
			expect(deck.map((c) => c.type)).toEqual(["move", "move", "fire", "wait"]);
		});

		it("各カードがlevel:1, exp:0で生成される", () => {
			const deck = createInitialDeck();
			for (const card of deck) {
				expect(card.level).toBe(1);
				expect(card.exp).toBe(0);
			}
		});
	});

	describe("createInitialDeckState", () => {
		it("手札に4枚セットし、使用済みIDは空", () => {
			const state = createInitialDeckState();
			expect(state.hand).toHaveLength(TOTAL_DECK_SIZE);
			expect(state.usedCardIds).toHaveLength(0);
		});
	});

	describe("markCardUsed", () => {
		it("カードを使用済みにする", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			const result = markCardUsed(deck, "card-1");
			expect(result.usedCardIds).toContain("card-1");
			expect(result.hand).toHaveLength(2);
		});

		it("既に使用済みのカードを再度マークしても変化しない", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: ["card-1"],
			};
			const result = markCardUsed(deck, "card-1");
			expect(result).toBe(deck);
		});
	});

	describe("resetUsedCards", () => {
		it("使用済みカードIDリストをリセットする", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: ["card-1", "card-2"],
			};
			const result = resetUsedCards(deck);
			expect(result.usedCardIds).toHaveLength(0);
			expect(result.hand).toHaveLength(2);
		});
	});

	describe("isCardUsed", () => {
		it("使用済みカードの場合trueを返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: ["card-1"],
			};
			expect(isCardUsed(deck, "card-1")).toBe(true);
		});

		it("未使用カードの場合falseを返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			expect(isCardUsed(deck, "card-1")).toBe(false);
		});
	});

	describe("getAllCards", () => {
		it("手札の全カードを返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			const result = getAllCards(deck);
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.id)).toEqual(["card-1", "card-2"]);
		});

		it("空デッキで空配列を返す", () => {
			const deck: DeckState = {
				hand: [],
				usedCardIds: [],
			};
			expect(getAllCards(deck)).toHaveLength(0);
		});
	});

	describe("getTotalDeckSize", () => {
		it("手札の枚数を返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-3",
						type: "wait",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			expect(getTotalDeckSize(deck)).toBe(3);
		});

		it("空デッキで0を返す", () => {
			const deck: DeckState = {
				hand: [],
				usedCardIds: [],
			};
			expect(getTotalDeckSize(deck)).toBe(0);
		});
	});

	describe("reorderHand", () => {
		it("カードを前方から後方に移動する", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-3",
						type: "wait",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-4",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			const result = reorderHand(deck, 0, 2);
			expect(result.hand.map((c) => c.id)).toEqual([
				"card-2",
				"card-3",
				"card-1",
				"card-4",
			]);
		});

		it("カードを後方から前方に移動する", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-3",
						type: "wait",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-4",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			const result = reorderHand(deck, 3, 1);
			expect(result.hand.map((c) => c.id)).toEqual([
				"card-1",
				"card-4",
				"card-2",
				"card-3",
			]);
		});

		it("同一インデックスの場合は元のdeckを返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			const result = reorderHand(deck, 1, 1);
			expect(result).toBe(deck);
		});

		it("範囲外インデックスの場合は元のdeckを返す", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: [],
			};
			expect(reorderHand(deck, -1, 0)).toBe(deck);
			expect(reorderHand(deck, 0, 5)).toBe(deck);
		});

		it("イミュータブル: 元のdeckが変更されない", () => {
			const deck: DeckState = {
				hand: [
					{
						id: "card-1",
						type: "move",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-2",
						type: "fire",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
					{
						id: "card-3",
						type: "wait",
						level: 1,
						exp: 0,
						stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
					},
				],
				usedCardIds: ["card-1"],
			};
			const originalIds = deck.hand.map((c) => c.id);
			const result = reorderHand(deck, 0, 2);
			expect(deck.hand.map((c) => c.id)).toEqual(originalIds);
			expect(result).not.toBe(deck);
			expect(result.usedCardIds).toEqual(["card-1"]);
		});
	});
});
