import { beforeEach, describe, expect, it } from "vitest";
import { INITIAL_DECK, TOTAL_DECK_SIZE } from "../constants";
import type { DeckState } from "../types";
import { RNG } from "../utils/rng";
import {
	assignRandomKeyword,
	createCard,
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
	let rng: RNG;

	beforeEach(() => {
		resetCardIdCounter();
		rng = new RNG(12345);
	});

	describe("createInitialDeck", () => {
		it("合計4枚のカードを生成する", () => {
			const deck = createInitialDeck(rng);
			expect(deck).toHaveLength(TOTAL_DECK_SIZE);
		});

		it("移動カード2枚、攻撃カード1枚、待機カード1枚を含む", () => {
			const deck = createInitialDeck(rng);
			const moveCards = deck.filter((c) => c.type === "move");
			const attackCards = deck.filter((c) => c.type === "attack");
			const waitCards = deck.filter((c) => c.type === "wait");
			expect(moveCards).toHaveLength(INITIAL_DECK.moveCards);
			expect(attackCards).toHaveLength(INITIAL_DECK.attackCards);
			expect(waitCards).toHaveLength(INITIAL_DECK.waitCards);
		});

		it("各カードに一意のIDを持つ", () => {
			const deck = createInitialDeck(rng);
			const ids = deck.map((c) => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("固定順で生成される（move, move, attack, wait）", () => {
			const deck = createInitialDeck(rng);
			expect(deck.map((c) => c.type)).toEqual([
				"move",
				"move",
				"attack",
				"wait",
			]);
		});
	});

	describe("createInitialDeckState", () => {
		it("手札に4枚セットし、使用済みIDは空", () => {
			const state = createInitialDeckState(rng);
			expect(state.hand).toHaveLength(TOTAL_DECK_SIZE);
			expect(state.usedCardIds).toHaveLength(0);
		});
	});

	describe("markCardUsed", () => {
		it("カードを使用済みにする", () => {
			const deck: DeckState = {
				hand: [
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
				],
				usedCardIds: [],
			};
			const result = markCardUsed(deck, "card-1");
			expect(result.usedCardIds).toContain("card-1");
			expect(result.hand).toHaveLength(2);
		});

		it("既に使用済みのカードを再度マークしても変化しない", () => {
			const deck: DeckState = {
				hand: [{ id: "card-1", type: "move", keyword: "flame" }],
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
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
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
				hand: [{ id: "card-1", type: "move", keyword: "flame" }],
				usedCardIds: ["card-1"],
			};
			expect(isCardUsed(deck, "card-1")).toBe(true);
		});

		it("未使用カードの場合falseを返す", () => {
			const deck: DeckState = {
				hand: [{ id: "card-1", type: "move", keyword: "flame" }],
				usedCardIds: [],
			};
			expect(isCardUsed(deck, "card-1")).toBe(false);
		});
	});

	describe("getAllCards", () => {
		it("手札の全カードを返す", () => {
			const deck: DeckState = {
				hand: [
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
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
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
					{ id: "card-3", type: "wait", keyword: "flame" },
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

	describe("assignRandomKeyword", () => {
		it("flameまたはwaterを返す", () => {
			const rng = new RNG(42);
			const keyword = assignRandomKeyword(rng);
			expect(["flame", "water"]).toContain(keyword);
		});

		it("同一シードで同一結果を返す（再現性）", () => {
			const rng1 = new RNG(42);
			const rng2 = new RNG(42);
			expect(assignRandomKeyword(rng1)).toBe(assignRandomKeyword(rng2));
		});
	});

	describe("createCard with keyword", () => {
		it("指定キーワードが設定される", () => {
			const card = createCard("move", "flame");
			expect(card.keyword).toBe("flame");

			const card2 = createCard("attack", "water");
			expect(card2.keyword).toBe("water");
		});
	});

	describe("reorderHand", () => {
		it("カードを前方から後方に移動する", () => {
			const deck: DeckState = {
				hand: [
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
					{ id: "card-3", type: "wait", keyword: "flame" },
					{ id: "card-4", type: "move", keyword: "water" },
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
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
					{ id: "card-3", type: "wait", keyword: "flame" },
					{ id: "card-4", type: "move", keyword: "water" },
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
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
				],
				usedCardIds: [],
			};
			const result = reorderHand(deck, 1, 1);
			expect(result).toBe(deck);
		});

		it("範囲外インデックスの場合は元のdeckを返す", () => {
			const deck: DeckState = {
				hand: [
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
				],
				usedCardIds: [],
			};
			expect(reorderHand(deck, -1, 0)).toBe(deck);
			expect(reorderHand(deck, 0, 5)).toBe(deck);
		});

		it("イミュータブル: 元のdeckが変更されない", () => {
			const deck: DeckState = {
				hand: [
					{ id: "card-1", type: "move", keyword: "flame" },
					{ id: "card-2", type: "attack", keyword: "flame" },
					{ id: "card-3", type: "wait", keyword: "flame" },
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

	describe("createInitialDeck keyword assignment", () => {
		it("全カードにキーワードが付与される", () => {
			const rng = new RNG(42);
			const deck = createInitialDeck(rng);
			for (const card of deck) {
				expect(["flame", "water"]).toContain(card.keyword);
			}
		});

		it("同一シードで同一キーワード割り当てになる（再現性）", () => {
			const rng1 = new RNG(42);
			const rng2 = new RNG(42);
			const deck1 = createInitialDeck(rng1);
			const deck2 = createInitialDeck(rng2);
			expect(deck1.map((c) => c.keyword)).toEqual(deck2.map((c) => c.keyword));
		});
	});
});
