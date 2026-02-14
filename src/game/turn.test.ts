import { describe, expect, it } from "vitest";
import { HAND_LIMIT, TURN_START_AP } from "../constants";
import type { GameState } from "../types";
import { RNG } from "../utils/rng";
import { createInitialDeckState } from "./deck";
import { createInitialPlayer, createTitleScreenState } from "./state";
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
		it("APを最大値にリセットする", () => {
			const state = createGameState();
			// APを消費した状態にする
			const depleted: GameState = {
				...state,
				player: { ...state.player, ap: 0 },
			};

			const next = startPlayerTurn(depleted);

			expect(next.player.ap).toBe(TURN_START_AP);
		});

		it("手札を上限まで補充する", () => {
			const state = createGameState();
			// 手札が空の状態
			expect(state.deck.hand.length).toBe(0);

			const next = startPlayerTurn(state);

			expect(next.deck.hand.length).toBe(HAND_LIMIT);
		});

		it("ターンをplayerに設定する", () => {
			const state = createGameState({
				turn: "enemy",
			});

			const next = startPlayerTurn(state);

			expect(next.turn).toBe("player");
		});

		it("既に手札がある場合は上限まで補充する", () => {
			const deck = createInitialDeckState(new RNG(12345));
			// 手札に1枚ある状態を作る
			const hand = deck.drawPile.slice(0, 1);
			const drawPile = deck.drawPile.slice(1);
			const state = createGameState({
				deck: { ...deck, hand, drawPile },
			});

			const next = startPlayerTurn(state);

			expect(next.deck.hand.length).toBe(HAND_LIMIT);
		});

		it("元の状態を変更しない（イミュータブル）", () => {
			const state = createGameState({
				player: { ...createInitialPlayer(), ap: 1 },
			});
			const originalAp = state.player.ap;
			const originalHandLength = state.deck.hand.length;

			startPlayerTurn(state);

			expect(state.player.ap).toBe(originalAp);
			expect(state.deck.hand.length).toBe(originalHandLength);
		});
	});

	describe("endPlayerTurn", () => {
		it("手札をすべて捨て札に移動する", () => {
			const deck = createInitialDeckState(new RNG(12345));
			// 手札に3枚ある状態
			const hand = deck.drawPile.slice(0, 3);
			const drawPile = deck.drawPile.slice(3);
			const state = createGameState({
				deck: { ...deck, hand, drawPile, discardPile: [] },
			});

			const next = endPlayerTurn(state);

			expect(next.deck.hand.length).toBe(0);
			expect(next.deck.discardPile.length).toBe(3);
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
			const hand = deck.drawPile.slice(0, 3);
			const drawPile = deck.drawPile.slice(3);
			const state = createGameState({
				deck: { ...deck, hand, drawPile },
			});
			const originalHandLength = state.deck.hand.length;
			const originalTurn = state.turn;

			endPlayerTurn(state);

			expect(state.deck.hand.length).toBe(originalHandLength);
			expect(state.turn).toBe(originalTurn);
		});
	});
});
