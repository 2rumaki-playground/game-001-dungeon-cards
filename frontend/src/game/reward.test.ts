import { beforeEach, describe, expect, it } from "vitest";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import { resetCardIdCounter } from "./deck";
import {
	addRewardCardToDeck,
	createRewardState,
	getTotalDeckSize,
	removeCardFromDeck,
} from "./reward";

beforeEach(() => {
	resetCardIdCounter();
});

describe("getTotalDeckSize", () => {
	it("山札+手札+捨て札の合計を返す", () => {
		const deck = {
			drawPile: [
				{ id: "c-1", type: "move" as const },
				{ id: "c-2", type: "attack" as const },
			],
			hand: [{ id: "c-3", type: "rush" as const }],
			discardPile: [
				{ id: "c-4", type: "wait" as const },
				{ id: "c-5", type: "move" as const },
				{ id: "c-6", type: "attack" as const },
			],
		};
		expect(getTotalDeckSize(deck)).toBe(6);
	});

	it("空デッキで0を返す", () => {
		const deck = { drawPile: [], hand: [], discardPile: [] };
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
		const reward = createRewardState(state);

		expect(reward).not.toBeNull();
		expect(reward?.choices).toHaveLength(1);
		expect(reward?.selectedCards).toHaveLength(1);
		expect(reward?.selectedCards[0]).toBeNull();
		expect(reward?.phase).toBe("select");
		expect(reward?.replacingIndex).toBeNull();
	});

	it("撃破数3の場合、3つの選択肢を持つRewardStateを返す", () => {
		const state = createTestState({ defeatedEnemyCount: 3 });
		const reward = createRewardState(state);

		expect(reward).not.toBeNull();
		expect(reward?.choices).toHaveLength(3);
		expect(reward?.selectedCards).toHaveLength(3);
	});

	it("シード固定で再現性がある", () => {
		const state1 = createTestState({ defeatedEnemyCount: 3 });
		const state2 = createTestState({ defeatedEnemyCount: 3 });

		const reward1 = createRewardState(state1);
		const reward2 = createRewardState(state2);

		expect(reward1?.choices).toEqual(reward2?.choices);
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
		const result = addRewardCardToDeck(state, "rush");

		const added = result.deck.drawPile.find((c) => c.type === "rush");
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
			deck: { drawPile: cards, hand: [], discardPile: [] },
		});

		const result = removeCardFromDeck(state, "c-1");
		expect(getTotalDeckSize(result.deck)).toBe(1);
		expect(result.deck.drawPile.find((c) => c.id === "c-1")).toBeUndefined();
	});

	it("手札からカードを除去する", () => {
		const state = createTestState({
			deck: {
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
			deck: { drawPile: cards, hand: [], discardPile: [] },
		});

		removeCardFromDeck(state, "c-1");
		expect(state.deck.drawPile).toHaveLength(1);
	});
});
