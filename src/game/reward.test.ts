import { beforeEach, describe, expect, it } from "vitest";
import { DECK_MIN_SIZE, getEnemyCount, INITIAL_FLOOR } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import { getTotalDeckSize, resetCardIdCounter } from "./deck";
import {
	addRewardCardToDeck,
	createRewardState,
	removeCardFromDeck,
	shouldTriggerCardRemoval,
} from "./reward";

beforeEach(() => {
	resetCardIdCounter();
});

describe("getTotalDeckSize", () => {
	it("山札+手札+捨て札の合計を返す", () => {
		const deck = {
			deckOrder: [],
			drawPile: [
				{ id: "c-1", type: "move" as const },
				{ id: "c-2", type: "attack" as const },
			],
			hand: [{ id: "c-3", type: "move" as const }],
			discardPile: [
				{ id: "c-4", type: "wait" as const },
				{ id: "c-5", type: "move" as const },
				{ id: "c-6", type: "attack" as const },
			],
		};
		expect(getTotalDeckSize(deck)).toBe(6);
	});

	it("空デッキで0を返す", () => {
		const deck = {
			deckOrder: [],
			drawPile: [],
			hand: [],
			discardPile: [],
		};
		expect(getTotalDeckSize(deck)).toBe(0);
	});
});

describe("createRewardState", () => {
	it("撃破数0の場合nullを返す", () => {
		const state = createTestState({ defeatedEnemyCount: 0 });
		expect(createRewardState(state)).toBeNull();
	});

	it("撃破数1の場合、1つの選択肢を持つRewardStateを返す", () => {
		const state = createTestState({ defeatedEnemyCount: 1 });
		const result = createRewardState(state);

		expect(result).not.toBeNull();
		expect(result?.rewardState.choices).toHaveLength(1);
	});

	it("撃破数3の場合、3つの選択肢を持つRewardStateを返す", () => {
		const state = createTestState({ defeatedEnemyCount: 3 });
		const result = createRewardState(state);

		expect(result).not.toBeNull();
		expect(result?.rewardState.choices).toHaveLength(3);
	});

	it("シード固定で再現性がある", () => {
		const state1 = createTestState({ defeatedEnemyCount: 3 });
		const state2 = createTestState({ defeatedEnemyCount: 3 });

		const result1 = createRewardState(state1);
		const result2 = createRewardState(state2);

		expect(result1?.rewardState.choices).toEqual(result2?.rewardState.choices);
	});

	it("RNG消費状態がupdatedStateに反映される", () => {
		const state = createTestState({ defeatedEnemyCount: 2 });
		const result = createRewardState(state);

		expect(result).not.toBeNull();
		// RNGが消費されているため、元のstateと異なるRNGになる
		expect(result?.updatedState.rng).not.toBe(state.rng);
	});
});

describe("addRewardCardToDeck", () => {
	it("デッキにカード1枚を追加する", () => {
		const state = createTestState();
		const before = getTotalDeckSize(state.deck);
		const result = addRewardCardToDeck(state, "move");

		expect(getTotalDeckSize(result.deck)).toBe(before + 1);
	});

	it("追加されたカードが山札に含まれる", () => {
		const state = createTestState();
		const result = addRewardCardToDeck(state, "jump");

		const added = result.deck.drawPile.find((c) => c.type === "jump");
		expect(added).toBeDefined();
	});

	it("元の状態が変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalSize = getTotalDeckSize(state.deck);
		addRewardCardToDeck(state, "move");

		expect(getTotalDeckSize(state.deck)).toBe(originalSize);
	});
});

describe("removeCardFromDeck", () => {
	it("山札からカードを除去する", () => {
		const cards: Card[] = [
			{ id: "c-1", type: "move" },
			{ id: "c-2", type: "attack" },
		];
		const state = createTestState({
			deck: { deckOrder: cards, drawPile: cards, hand: [], discardPile: [] },
		});

		const result = removeCardFromDeck(state, "c-1");
		expect(getTotalDeckSize(result.deck)).toBe(1);
		expect(result.deck.drawPile.find((c) => c.id === "c-1")).toBeUndefined();
	});

	it("手札からカードを除去する", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [{ id: "c-1", type: "move" }],
				discardPile: [],
			},
		});

		const result = removeCardFromDeck(state, "c-1");
		expect(result.deck.hand).toHaveLength(0);
	});

	it("捨て札からカードを除去する", () => {
		const state = createTestState({
			deck: {
				deckOrder: [],
				drawPile: [],
				hand: [],
				discardPile: [{ id: "c-1", type: "move" }],
			},
		});

		const result = removeCardFromDeck(state, "c-1");
		expect(result.deck.discardPile).toHaveLength(0);
	});

	it("元の状態が変更されない（イミュータブル）", () => {
		const cards: Card[] = [{ id: "c-1", type: "move" }];
		const state = createTestState({
			deck: { deckOrder: cards, drawPile: cards, hand: [], discardPile: [] },
		});

		removeCardFromDeck(state, "c-1");
		expect(state.deck.drawPile).toHaveLength(1);
	});
});

describe("shouldTriggerCardRemoval", () => {
	/** DECK_MIN_SIZEより多いカードのデッキを作成 */
	function createLargeDeck(size: number): {
		deckOrder: Card[];
		drawPile: Card[];
		hand: Card[];
		discardPile: Card[];
	} {
		const cards: Card[] = Array.from({ length: size }, (_, i) => ({
			id: `c-${i + 1}`,
			type: "move" as const,
		}));
		return { deckOrder: cards, drawPile: cards, hand: [], discardPile: [] };
	}

	it("全敵撃破していない場合 → triggered: false", () => {
		const state = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR) - 1,
			deck: createLargeDeck(DECK_MIN_SIZE + 1),
		});

		const result = shouldTriggerCardRemoval(state);
		expect(result.triggered).toBe(false);
	});

	it("デッキがDECK_MIN_SIZE以下の場合 → triggered: false", () => {
		const state = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR),
			deck: createLargeDeck(DECK_MIN_SIZE),
		});

		const result = shouldTriggerCardRemoval(state);
		expect(result.triggered).toBe(false);
	});

	it("条件を満たす場合、シード固定で再現性がある", () => {
		const state1 = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR),
			deck: createLargeDeck(DECK_MIN_SIZE + 1),
		});
		const state2 = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR),
			deck: createLargeDeck(DECK_MIN_SIZE + 1),
		});

		const result1 = shouldTriggerCardRemoval(state1);
		const result2 = shouldTriggerCardRemoval(state2);
		expect(result1.triggered).toBe(result2.triggered);
	});

	it("RNG消費がupdatedStateに反映される", () => {
		const state = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR),
			deck: createLargeDeck(DECK_MIN_SIZE + 1),
		});

		const result = shouldTriggerCardRemoval(state);
		// RNG消費が発生しているため、updatedStateのrngは元と異なる
		expect(result.updatedState.rng).not.toBe(state.rng);
	});

	it("全敵撃破していない場合、RNGは消費されない", () => {
		const state = createTestState({
			defeatedEnemyCount: 0,
			deck: createLargeDeck(DECK_MIN_SIZE + 1),
		});

		const result = shouldTriggerCardRemoval(state);
		// RNGが消費されていないので、updatedStateは元のstateと同じ
		expect(result.updatedState).toBe(state);
	});

	it("デッキ枚数不足の場合、RNGは消費されない", () => {
		const state = createTestState({
			defeatedEnemyCount: getEnemyCount(INITIAL_FLOOR),
			deck: createLargeDeck(DECK_MIN_SIZE),
		});

		const result = shouldTriggerCardRemoval(state);
		expect(result.updatedState).toBe(state);
	});
});
