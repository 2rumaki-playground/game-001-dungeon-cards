import { describe, expect, it } from "vitest";
import { ENEMY_ACQUISITION_CONDITIONS } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { AcquisitionCounters, Card } from "../types";
import {
	checkAcquisitionCondition,
	createInitialCounters,
	exchangeCardInDeck,
	updateDefeatCounter,
	updateHitCounter,
} from "./cardAcquisition";
import { validateDeckConsistency } from "./deck";

describe("createInitialCounters", () => {
	it("全カウンターが0で初期化される", () => {
		const counters = createInitialCounters();
		for (const type of [
			"normal",
			"heavy",
			"scout",
			"miniboss",
			"boss",
		] as const) {
			expect(counters.defeatCounts[type]).toBe(0);
			expect(counters.hitCounts[type]).toBe(0);
		}
	});
});

describe("updateDefeatCounter", () => {
	it("撃破カウンターが+1される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "normal");
		expect(updated.defeatCounts.normal).toBe(1);
	});

	it("イミュータブルに更新される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "normal");
		expect(counters.defeatCounts.normal).toBe(0);
		expect(updated).not.toBe(counters);
	});

	it("指定した敵タイプのみ更新される", () => {
		const counters = createInitialCounters();
		const updated = updateDefeatCounter(counters, "heavy");
		expect(updated.defeatCounts.heavy).toBe(1);
		expect(updated.defeatCounts.normal).toBe(0);
		expect(updated.defeatCounts.scout).toBe(0);
	});
});

describe("updateHitCounter", () => {
	it("被弾カウンターが+1される", () => {
		const counters = createInitialCounters();
		const updated = updateHitCounter(counters, "scout");
		expect(updated.hitCounts.scout).toBe(1);
	});

	it("イミュータブルに更新される", () => {
		const counters = createInitialCounters();
		const updated = updateHitCounter(counters, "scout");
		expect(counters.hitCounts.scout).toBe(0);
		expect(updated).not.toBe(counters);
	});
});

describe("checkAcquisitionCondition", () => {
	it("AND条件: すべて満たす→true", () => {
		// scoutは defeat_count>=2 AND hit_count>=1
		const counters: AcquisitionCounters = {
			defeatCounts: { normal: 0, heavy: 0, scout: 2, miniboss: 0, boss: 0 },
			hitCounts: { normal: 0, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
		};
		expect(checkAcquisitionCondition(counters, "scout")).toBe(true);
	});

	it("AND条件: 一部のみ→false", () => {
		// scoutは defeat_count>=2 AND hit_count>=1、hit_countが0
		const counters: AcquisitionCounters = {
			defeatCounts: { normal: 0, heavy: 0, scout: 2, miniboss: 0, boss: 0 },
			hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
		};
		expect(checkAcquisitionCondition(counters, "scout")).toBe(false);
	});

	it("単一条件: 閾値到達→true", () => {
		// normalは defeat_count>=3
		const counters: AcquisitionCounters = {
			defeatCounts: { normal: 3, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
		};
		expect(checkAcquisitionCondition(counters, "normal")).toBe(true);
	});

	it("単一条件: 閾値未達→false", () => {
		const counters: AcquisitionCounters = {
			defeatCounts: { normal: 2, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
			hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
		};
		expect(checkAcquisitionCondition(counters, "normal")).toBe(false);
	});

	it("miniboss: 1体撃破で条件達成", () => {
		const counters: AcquisitionCounters = {
			defeatCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 1, boss: 0 },
			hitCounts: { normal: 0, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
		};
		expect(checkAcquisitionCondition(counters, "miniboss")).toBe(true);
	});

	it("OR条件: いずれか満たす→true", () => {
		const original = ENEMY_ACQUISITION_CONDITIONS.scout;
		ENEMY_ACQUISITION_CONDITIONS.scout = {
			cardType: "jump",
			conditions: [
				{ type: "defeat_count", threshold: 5 },
				{ type: "hit_count", threshold: 1 },
			],
			conditionLogic: "or",
		};
		try {
			const counters: AcquisitionCounters = {
				defeatCounts: { normal: 0, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
				hitCounts: { normal: 0, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
			};
			// defeat_count未達だがhit_count達成→OR条件なのでtrue
			expect(checkAcquisitionCondition(counters, "scout")).toBe(true);
		} finally {
			ENEMY_ACQUISITION_CONDITIONS.scout = original;
		}
	});

	it("OR条件: どちらも未達→false", () => {
		const original = ENEMY_ACQUISITION_CONDITIONS.scout;
		ENEMY_ACQUISITION_CONDITIONS.scout = {
			cardType: "jump",
			conditions: [
				{ type: "defeat_count", threshold: 5 },
				{ type: "hit_count", threshold: 3 },
			],
			conditionLogic: "or",
		};
		try {
			const counters: AcquisitionCounters = {
				defeatCounts: { normal: 0, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
				hitCounts: { normal: 0, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
			};
			// どちらも未達→false
			expect(checkAcquisitionCondition(counters, "scout")).toBe(false);
		} finally {
			ENEMY_ACQUISITION_CONDITIONS.scout = original;
		}
	});
});

describe("exchangeCardInDeck", () => {
	function createTestCards(): Card[] {
		return [
			{ id: "test-card-1", type: "move" },
			{ id: "test-card-2", type: "move" },
			{ id: "test-card-3", type: "move" },
			{ id: "test-card-4", type: "attack" },
			{ id: "test-card-5", type: "attack" },
			{ id: "test-card-6", type: "wait" },
		];
	}

	it("drawPileからカードを除去して新カードを追加", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-1", "strong_attack");
		expect(result.deck.drawPile.some((c) => c.id === "test-card-1")).toBe(
			false,
		);
		expect(result.deck.drawPile.some((c) => c.type === "strong_attack")).toBe(
			true,
		);
	});

	it("handからカードを除去して新カードをdrawPile末尾に追加", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-4", "jump");
		expect(result.deck.hand.some((c) => c.id === "test-card-4")).toBe(false);
		const lastDrawCard = result.deck.drawPile[result.deck.drawPile.length - 1];
		expect(lastDrawCard.type).toBe("jump");
	});

	it("discardPileからカードを除去", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-6", "move");
		expect(result.deck.discardPile.some((c) => c.id === "test-card-6")).toBe(
			false,
		);
	});

	it("deckOrderの同位置に新カードを挿入", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-3", "jump");
		expect(result.deck.deckOrder[2].type).toBe("jump");
		expect(result.deck.deckOrder.length).toBe(6);
	});

	it("デッキ整合性が維持される", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-2", "strong_attack");
		expect(validateDeckConsistency(result.deck)).toBe(true);
	});

	it("存在しないカードIDでエラーをthrow", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				deckOrder: [...cards],
				drawPile: [cards[0], cards[1], cards[2]],
				hand: [cards[3], cards[4]],
				discardPile: [cards[5]],
			},
		});

		expect(() =>
			exchangeCardInDeck(state, "nonexistent-id", "strong_attack"),
		).toThrow('removeCardId "nonexistent-id" not found in deckOrder');
	});
});
