import { beforeEach, describe, expect, it } from "vitest";
import { HAND_LIMIT, INITIAL_DECK, TOTAL_DECK_SIZE } from "../constants";
import type { DeckState } from "../types";
import {
	createInitialDeck,
	createInitialDeckState,
	discardHand,
	drawCards,
	getAllCards,
	getTotalDeckSize,
	playCard,
	resetCardIdCounter,
	resetDeck,
	setDeckOrder,
	willRecycle,
} from "./deck";

describe("deck", () => {
	beforeEach(() => {
		resetCardIdCounter();
	});

	describe("createInitialDeck", () => {
		it("合計6枚のカードを生成する", () => {
			const deck = createInitialDeck();
			expect(deck).toHaveLength(TOTAL_DECK_SIZE);
		});

		it("移動カード3枚、攻撃カード2枚、待機カード1枚を含む", () => {
			const deck = createInitialDeck();
			const moveCards = deck.filter((c) => c.type === "move");
			const attackCards = deck.filter((c) => c.type === "attack");
			const waitCards = deck.filter((c) => c.type === "wait");
			expect(moveCards).toHaveLength(INITIAL_DECK.moveCards);
			expect(attackCards).toHaveLength(INITIAL_DECK.attackCards);
			expect(waitCards).toHaveLength(INITIAL_DECK.waitCards);
		});

		it("各カードに一意のIDを持つ", () => {
			const deck = createInitialDeck();
			const ids = deck.map((c) => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("固定順で生成される（move, move, move, attack, attack, wait）", () => {
			const deck = createInitialDeck();
			expect(deck.map((c) => c.type)).toEqual([
				"move",
				"move",
				"move",
				"attack",
				"attack",
				"wait",
			]);
		});
	});

	describe("createInitialDeckState", () => {
		it("山札にデッキをセットし、手札・捨て札は空", () => {
			const state = createInitialDeckState();
			expect(state.drawPile).toHaveLength(TOTAL_DECK_SIZE);
			expect(state.hand).toHaveLength(0);
			expect(state.discardPile).toHaveLength(0);
		});

		it("deckOrderが設定される", () => {
			const state = createInitialDeckState();
			expect(state.deckOrder).toHaveLength(TOTAL_DECK_SIZE);
			expect(state.deckOrder.map((c) => c.type)).toEqual(
				state.drawPile.map((c) => c.type),
			);
		});
	});

	describe("drawCards", () => {
		it("手札上限まで山札からカードを引く", () => {
			const deck = createInitialDeckState();
			const result = drawCards(deck);
			expect(result.hand).toHaveLength(HAND_LIMIT);
			expect(result.drawPile).toHaveLength(TOTAL_DECK_SIZE - HAND_LIMIT);
		});

		it("指定枚数だけカードを引く", () => {
			const deck = createInitialDeckState();
			const result = drawCards(deck, 2);
			expect(result.hand).toHaveLength(2);
			expect(result.drawPile).toHaveLength(TOTAL_DECK_SIZE - 2);
		});

		it("山札が不足する場合は捨て札をdeckOrder順で復元して山札に戻す", () => {
			const deckOrder = [
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
				{ id: "card-3", type: "attack" as const },
				{ id: "card-4", type: "wait" as const },
			];
			const deck: DeckState = {
				deckOrder,
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [],
				discardPile: [
					{ id: "card-2", type: "attack" },
					{ id: "card-3", type: "attack" },
					{ id: "card-4", type: "wait" },
				],
			};
			const result = drawCards(deck, 3);
			expect(result.hand).toHaveLength(3);
			expect(result.drawPile).toHaveLength(1);
			expect(result.discardPile).toHaveLength(0);
		});

		it("捨て札復元時にdeckOrderの順番が維持される", () => {
			const deckOrder = [
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
				{ id: "card-3", type: "wait" as const },
			];
			const deck: DeckState = {
				deckOrder,
				drawPile: [],
				hand: [],
				discardPile: [
					{ id: "card-3", type: "wait" },
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
			};
			const result = drawCards(deck, 3);
			// deckOrderの順番（card-1, card-2, card-3）で復元される
			expect(result.hand.map((c) => c.id)).toEqual([
				"card-1",
				"card-2",
				"card-3",
			]);
		});

		it("山札・捨て札の合計が引く枚数に満たない場合は引ける枚数だけ引く", () => {
			const deck: DeckState = {
				deckOrder: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [],
				discardPile: [{ id: "card-2", type: "attack" }],
			};
			const result = drawCards(deck, 5);
			expect(result.hand).toHaveLength(2);
		});

		it("手札が既にある場合は上限まで補充する", () => {
			const deck = createInitialDeckState();
			// 手札に1枚ある状態を作る
			const hand = deck.drawPile.slice(0, 1);
			const drawPile = deck.drawPile.slice(1);
			const deckWithHand: DeckState = {
				...deck,
				hand,
				drawPile,
			};
			const result = drawCards(deckWithHand);
			expect(result.hand).toHaveLength(HAND_LIMIT);
		});

		it("deckOrderが維持される", () => {
			const deck = createInitialDeckState();
			const result = drawCards(deck);
			expect(result.deckOrder).toEqual(deck.deckOrder);
		});
	});

	describe("playCard", () => {
		it("手札からカードを捨て札に移動する", () => {
			const card = { id: "card-1", type: "move" as const };
			const deck: DeckState = {
				deckOrder: [card, { id: "card-2", type: "attack" }],
				drawPile: [],
				hand: [card, { id: "card-2", type: "attack" }],
				discardPile: [],
			};
			const result = playCard(deck, "card-1");
			expect(result.hand).toHaveLength(1);
			expect(result.hand[0].id).toBe("card-2");
			expect(result.discardPile).toHaveLength(1);
			expect(result.discardPile[0].id).toBe("card-1");
		});

		it("存在しないカードIDを指定した場合はデッキを変更しない", () => {
			const deck: DeckState = {
				deckOrder: [{ id: "card-1", type: "move" }],
				drawPile: [],
				hand: [{ id: "card-1", type: "move" }],
				discardPile: [],
			};
			const result = playCard(deck, "nonexistent");
			expect(result).toBe(deck);
		});
	});

	describe("discardHand", () => {
		it("手札をすべて捨て札に移動する", () => {
			const deck: DeckState = {
				deckOrder: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
					{ id: "card-3", type: "wait" },
				],
				drawPile: [{ id: "card-3", type: "wait" }],
				hand: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				discardPile: [],
			};
			const result = discardHand(deck);
			expect(result.hand).toHaveLength(0);
			expect(result.discardPile).toHaveLength(2);
			expect(result.drawPile).toHaveLength(1);
		});
	});

	describe("resetDeck", () => {
		it("全カードをdeckOrderの順番で山札に復元する", () => {
			const deckOrder = [
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
				{ id: "card-3", type: "wait" as const },
			];
			const deck: DeckState = {
				deckOrder,
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [{ id: "card-2", type: "attack" }],
				discardPile: [{ id: "card-3", type: "wait" }],
			};
			const result = resetDeck(deck);
			expect(result.drawPile).toHaveLength(3);
			expect(result.hand).toHaveLength(0);
			expect(result.discardPile).toHaveLength(0);
			expect(result.drawPile.map((c) => c.id)).toEqual([
				"card-1",
				"card-2",
				"card-3",
			]);
		});

		it("deckOrderが維持される", () => {
			const deckOrder = [
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
			];
			const deck: DeckState = {
				deckOrder,
				drawPile: [],
				hand: [],
				discardPile: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
			};
			const result = resetDeck(deck);
			expect(result.deckOrder).toEqual(deckOrder);
		});
	});

	describe("setDeckOrder", () => {
		it("新しい並び順をdeckOrderとdrawPileにセットする", () => {
			const originalOrder = [
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
				{ id: "card-3", type: "wait" as const },
			];
			const deck: DeckState = {
				deckOrder: originalOrder,
				drawPile: originalOrder,
				hand: [],
				discardPile: [],
			};
			const newOrder = [
				{ id: "card-3", type: "wait" as const },
				{ id: "card-1", type: "move" as const },
				{ id: "card-2", type: "attack" as const },
			];
			const result = setDeckOrder(deck, newOrder);
			expect(result.deckOrder.map((c) => c.id)).toEqual([
				"card-3",
				"card-1",
				"card-2",
			]);
			expect(result.drawPile.map((c) => c.id)).toEqual([
				"card-3",
				"card-1",
				"card-2",
			]);
			expect(result.hand).toHaveLength(0);
			expect(result.discardPile).toHaveLength(0);
		});
	});

	describe("getAllCards", () => {
		it("3ゾーンの全カードを結合した配列を返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [{ id: "card-2", type: "attack" }],
				discardPile: [{ id: "card-3", type: "wait" }],
			};
			const result = getAllCards(deck);
			expect(result).toHaveLength(3);
			expect(result.map((c) => c.id)).toEqual(["card-1", "card-2", "card-3"]);
		});

		it("空デッキで空配列を返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [],
				hand: [],
				discardPile: [],
			};
			expect(getAllCards(deck)).toHaveLength(0);
		});
	});

	describe("willRecycle", () => {
		it("山札がドロー枚数より少なく捨て札がある場合はtrueを返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [{ id: "card-1", type: "move" as const }],
				hand: [],
				discardPile: [
					{ id: "card-2", type: "attack" as const },
					{ id: "card-3", type: "wait" as const },
				],
			};
			expect(willRecycle(deck)).toBe(true);
		});

		it("山札がドロー枚数以上の場合はfalseを返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: Array.from({ length: HAND_LIMIT }, (_, i) => ({
					id: `card-${i + 1}`,
					type: "move" as const,
				})),
				hand: [],
				discardPile: [],
			};
			expect(willRecycle(deck)).toBe(false);
		});

		it("捨て札が空の場合はfalseを返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [{ id: "card-1", type: "move" as const }],
				hand: [],
				discardPile: [],
			};
			expect(willRecycle(deck)).toBe(false);
		});

		it("手札が上限の場合はfalseを返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [],
				hand: Array.from({ length: HAND_LIMIT }, (_, i) => ({
					id: `card-${i + 1}`,
					type: "move" as const,
				})),
				discardPile: [{ id: "card-99", type: "attack" as const }],
			};
			expect(willRecycle(deck)).toBe(false);
		});
	});

	describe("getTotalDeckSize", () => {
		it("3ゾーンの合計枚数を返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				hand: [{ id: "card-3", type: "move" }],
				discardPile: [
					{ id: "card-4", type: "wait" },
					{ id: "card-5", type: "move" },
				],
			};
			expect(getTotalDeckSize(deck)).toBe(5);
		});

		it("空デッキで0を返す", () => {
			const deck: DeckState = {
				deckOrder: [],
				drawPile: [],
				hand: [],
				discardPile: [],
			};
			expect(getTotalDeckSize(deck)).toBe(0);
		});
	});
});
