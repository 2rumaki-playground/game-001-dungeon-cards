import { beforeEach, describe, expect, it } from "vitest";
import { HAND_LIMIT, INITIAL_DECK, TOTAL_DECK_SIZE } from "../constants";
import { RNG } from "../utils/rng";
import {
	createInitialDeck,
	createInitialDeckState,
	discardHand,
	drawCards,
	getAllCards,
	getTotalDeckSize,
	playCard,
	resetCardIdCounter,
	reshuffleDeck,
	willReshuffle,
} from "./deck";

describe("deck", () => {
	const SEED = 42;

	beforeEach(() => {
		resetCardIdCounter();
	});

	describe("createInitialDeck", () => {
		it("合計18枚のカードを生成する", () => {
			const rng = new RNG(SEED);
			const deck = createInitialDeck(rng);
			expect(deck).toHaveLength(TOTAL_DECK_SIZE);
		});

		it("移動カード6枚、攻撃カード6枚、強攻撃カード2枚、ジャンプカード2枚、待機カード2枚を含む", () => {
			const rng = new RNG(SEED);
			const deck = createInitialDeck(rng);
			const moveCards = deck.filter((c) => c.type === "move");
			const attackCards = deck.filter((c) => c.type === "attack");
			const strongAttackCards = deck.filter((c) => c.type === "strong_attack");
			const jumpCards = deck.filter((c) => c.type === "jump");
			const waitCards = deck.filter((c) => c.type === "wait");
			expect(moveCards).toHaveLength(INITIAL_DECK.moveCards);
			expect(attackCards).toHaveLength(INITIAL_DECK.attackCards);
			expect(strongAttackCards).toHaveLength(INITIAL_DECK.strongAttackCards);
			expect(jumpCards).toHaveLength(INITIAL_DECK.jumpCards);
			expect(waitCards).toHaveLength(INITIAL_DECK.waitCards);
		});

		it("各カードに一意のIDを持つ", () => {
			const rng = new RNG(SEED);
			const deck = createInitialDeck(rng);
			const ids = deck.map((c) => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("同じシードで同じ順序のデッキを生成する", () => {
			const rng1 = new RNG(SEED);
			const deck1 = createInitialDeck(rng1);
			resetCardIdCounter();
			const rng2 = new RNG(SEED);
			const deck2 = createInitialDeck(rng2);
			expect(deck1.map((c) => c.type)).toEqual(deck2.map((c) => c.type));
		});
	});

	describe("createInitialDeckState", () => {
		it("山札にデッキをセットし、手札・捨て札は空", () => {
			const rng = new RNG(SEED);
			const state = createInitialDeckState(rng);
			expect(state.drawPile).toHaveLength(TOTAL_DECK_SIZE);
			expect(state.hand).toHaveLength(0);
			expect(state.discardPile).toHaveLength(0);
		});
	});

	describe("drawCards", () => {
		it("手札上限まで山札からカードを引く", () => {
			const rng = new RNG(SEED);
			const deck = createInitialDeckState(rng);
			const result = drawCards(deck, rng);
			expect(result.hand).toHaveLength(HAND_LIMIT);
			expect(result.drawPile).toHaveLength(TOTAL_DECK_SIZE - HAND_LIMIT);
		});

		it("指定枚数だけカードを引く", () => {
			const rng = new RNG(SEED);
			const deck = createInitialDeckState(rng);
			const result = drawCards(deck, rng, 3);
			expect(result.hand).toHaveLength(3);
			expect(result.drawPile).toHaveLength(TOTAL_DECK_SIZE - 3);
		});

		it("山札が不足する場合は捨て札をシャッフルして山札に戻す", () => {
			const rng = new RNG(SEED);
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [],
				discardPile: [
					{ id: "card-2", type: "attack" },
					{ id: "card-3", type: "attack" },
					{ id: "card-4", type: "wait" },
				],
			};
			const result = drawCards(deck, rng, 3);
			expect(result.hand).toHaveLength(3);
			expect(result.drawPile).toHaveLength(1);
			expect(result.discardPile).toHaveLength(0);
		});

		it("山札・捨て札の合計が引く枚数に満たない場合は引ける枚数だけ引く", () => {
			const rng = new RNG(SEED);
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [],
				discardPile: [{ id: "card-2", type: "attack" }],
			};
			const result = drawCards(deck, rng, 5);
			expect(result.hand).toHaveLength(2);
		});

		it("手札が既にある場合は上限まで補充する", () => {
			const rng = new RNG(SEED);
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: createInitialDeck(new RNG(SEED)),
				hand: [
					{ id: "card-existing-1", type: "move" },
					{ id: "card-existing-2", type: "attack" },
				],
				discardPile: [],
			};
			resetCardIdCounter();
			const result = drawCards(deck, rng);
			expect(result.hand).toHaveLength(HAND_LIMIT);
		});
	});

	describe("playCard", () => {
		it("手札からカードを捨て札に移動する", () => {
			const card = { id: "card-1", type: "move" as const };
			const deck: ReturnType<typeof createInitialDeckState> = {
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
			const deck: ReturnType<typeof createInitialDeckState> = {
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
			const deck: ReturnType<typeof createInitialDeckState> = {
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

	describe("reshuffleDeck", () => {
		it("全カードを山札に戻してシャッフルする", () => {
			const rng = new RNG(SEED);
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [{ id: "card-2", type: "attack" }],
				discardPile: [{ id: "card-3", type: "wait" }],
			};
			const result = reshuffleDeck(deck, rng);
			expect(result.drawPile).toHaveLength(3);
			expect(result.hand).toHaveLength(0);
			expect(result.discardPile).toHaveLength(0);
		});
	});

	describe("getAllCards", () => {
		it("3ゾーンの全カードを結合した配列を返す", () => {
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [{ id: "card-1", type: "move" }],
				hand: [{ id: "card-2", type: "attack" }],
				discardPile: [{ id: "card-3", type: "wait" }],
			};
			const result = getAllCards(deck);
			expect(result).toHaveLength(3);
			expect(result.map((c) => c.id)).toEqual(["card-1", "card-2", "card-3"]);
		});

		it("空デッキで空配列を返す", () => {
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [],
				hand: [],
				discardPile: [],
			};
			expect(getAllCards(deck)).toHaveLength(0);
		});
	});

	describe("willReshuffle", () => {
		it("山札がドロー枚数より少なく捨て札がある場合はtrueを返す", () => {
			const deck = {
				drawPile: [{ id: "card-1", type: "move" as const }],
				hand: [],
				discardPile: [
					{ id: "card-2", type: "attack" as const },
					{ id: "card-3", type: "wait" as const },
				],
			};
			expect(willReshuffle(deck)).toBe(true);
		});

		it("山札がドロー枚数以上の場合はfalseを返す", () => {
			const deck = {
				drawPile: Array.from({ length: HAND_LIMIT }, (_, i) => ({
					id: `card-${i + 1}`,
					type: "move" as const,
				})),
				hand: [],
				discardPile: [],
			};
			expect(willReshuffle(deck)).toBe(false);
		});

		it("捨て札が空の場合はfalseを返す", () => {
			const deck = {
				drawPile: [{ id: "card-1", type: "move" as const }],
				hand: [],
				discardPile: [],
			};
			expect(willReshuffle(deck)).toBe(false);
		});

		it("手札が上限の場合はfalseを返す", () => {
			const deck = {
				drawPile: [],
				hand: Array.from({ length: HAND_LIMIT }, (_, i) => ({
					id: `card-${i + 1}`,
					type: "move" as const,
				})),
				discardPile: [{ id: "card-99", type: "attack" as const }],
			};
			expect(willReshuffle(deck)).toBe(false);
		});
	});

	describe("getTotalDeckSize", () => {
		it("3ゾーンの合計枚数を返す", () => {
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [
					{ id: "card-1", type: "move" },
					{ id: "card-2", type: "attack" },
				],
				hand: [{ id: "card-3", type: "jump" }],
				discardPile: [
					{ id: "card-4", type: "wait" },
					{ id: "card-5", type: "move" },
				],
			};
			expect(getTotalDeckSize(deck)).toBe(5);
		});

		it("空デッキで0を返す", () => {
			const deck: ReturnType<typeof createInitialDeckState> = {
				drawPile: [],
				hand: [],
				discardPile: [],
			};
			expect(getTotalDeckSize(deck)).toBe(0);
		});
	});
});
