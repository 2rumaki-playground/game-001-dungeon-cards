import { describe, expect, it } from "vitest";
import type { GameState } from "../types";
import { RNG } from "../utils/rng";
import { createInitialDeckState } from "./deck";
import { createTitleScreenState } from "./state";
import { endPlayerTurn, startPlayerTurn } from "./turn";

/**
 * テスト用のゲーム状態を作成
 */
function createGameState(overrides?: Partial<GameState>): GameState {
	const seed = 12345;
	const base = createTitleScreenState(seed);
	const rng = new RNG(seed);
	const deck = createInitialDeckState(rng);
	return {
		...base,
		screen: "game",
		deck,
		...overrides,
	};
}

describe("turn", () => {
	describe("startPlayerTurn", () => {
		it("使用済みカードIDリストをリセットする", () => {
			const deck = createInitialDeckState(new RNG(12345));
			// 使用済みカードがある状態
			const usedCardIds = [deck.hand[0].id, deck.hand[1].id];
			const state = createGameState({
				deck: { ...deck, usedCardIds },
			});

			expect(state.deck.usedCardIds.length).toBe(2);

			const next = startPlayerTurn(state);

			expect(next.deck.usedCardIds.length).toBe(0);
		});

		it("ターンをplayerに設定する", () => {
			const state = createGameState({
				turn: "enemy",
			});

			const next = startPlayerTurn(state);

			expect(next.turn).toBe("player");
		});

		it("手札はそのまま保持される", () => {
			const deck = createInitialDeckState(new RNG(12345));
			const state = createGameState({ deck });
			const originalHand = state.deck.hand;

			const next = startPlayerTurn(state);

			expect(next.deck.hand).toEqual(originalHand);
		});

		it("元の状態を変更しない（イミュータブル）", () => {
			const deck = createInitialDeckState(new RNG(12345));
			const usedCardIds = [deck.hand[0].id];
			const state = createGameState({
				deck: { ...deck, usedCardIds },
			});
			const originalUsedCardIds = state.deck.usedCardIds.length;

			startPlayerTurn(state);

			expect(state.deck.usedCardIds.length).toBe(originalUsedCardIds);
		});
	});

	describe("endPlayerTurn", () => {
		it("手札はそのまま保持される", () => {
			const deck = createInitialDeckState(new RNG(12345));
			const state = createGameState({ deck });
			const originalHandLength = state.deck.hand.length;

			const next = endPlayerTurn(state);

			expect(next.deck.hand.length).toBe(originalHandLength);
			expect(next.deck.hand).toEqual(state.deck.hand);
		});

		it("ターンをplayerからenemyに遷移する", () => {
			const state = createGameState({
				turn: "player",
			});

			expect(state.turn).toBe("player");

			const next = endPlayerTurn(state);

			expect(next.turn).toBe("enemy");
		});

		it("元の状態を変更しない（イミュータブル）", () => {
			const deck = createInitialDeckState(new RNG(12345));
			const state = createGameState({ deck });
			const originalHandLength = state.deck.hand.length;
			const originalTurn = state.turn;

			endPlayerTurn(state);

			expect(state.deck.hand.length).toBe(originalHandLength);
			expect(state.turn).toBe(originalTurn);
		});
	});
});
