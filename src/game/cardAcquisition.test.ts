import { describe, expect, it } from "vitest";
import { CARD_DROP_TABLE } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import { RNG } from "../utils/rng";
import {
	checkCardDrop,
	createInitialCounters,
	exchangeCardInDeck,
	updateDefeatCounter,
	updateHitCounter,
} from "./cardAcquisition";

describe("createInitialCounters", () => {
	it("全カウンターが0で初期化される", () => {
		const counters = createInitialCounters();
		for (const type of [
			"normal",
			"heavy",
			"scout",
			"ranged",
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

describe("checkCardDrop", () => {
	it("boss(100%)は必ずドロップする", () => {
		const rng = new RNG(12345);
		const result = checkCardDrop(rng, "boss");
		expect(result).not.toBeNull();
		expect(result?.acquiredCardType).toBe("wait");
		expect(result?.defeatedEnemyType).toBe("boss");
	});

	it("ドロップ確率テーブルのカードタイプが正しい", () => {
		expect(CARD_DROP_TABLE.normal.cardType).toBe("move");
		expect(CARD_DROP_TABLE.ranged.cardType).toBe("move");
		expect(CARD_DROP_TABLE.heavy.cardType).toBe("strong_attack");
		expect(CARD_DROP_TABLE.scout.cardType).toBe("jump");
		expect(CARD_DROP_TABLE.summoner.cardType).toBe("wait");
		expect(CARD_DROP_TABLE.shielded.cardType).toBe("attack");
		expect(CARD_DROP_TABLE.miniboss.cardType).toBe("attack");
		expect(CARD_DROP_TABLE.boss.cardType).toBe("wait");
	});

	it("RNGシード制御で当選を検証できる", () => {
		// boss(dropRate=1.0)は常に当選
		let dropCount = 0;
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			if (checkCardDrop(rng, "boss") !== null) dropCount++;
		}
		expect(dropCount).toBe(100);
	});

	it("RNGシード制御で当選と落選が両方発生する", () => {
		// normal(dropRate=0.25)は一部当選・一部落選
		let dropCount = 0;
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			if (checkCardDrop(rng, "normal") !== null) dropCount++;
		}
		// 25%なので0%や100%にはならない
		expect(dropCount).toBeGreaterThan(0);
		expect(dropCount).toBeLessThan(100);
	});

	it("落選時にnullを返す", () => {
		// normal(dropRate=0.25)の落選ケースを検証: seedを多数試し、normalで落選するものを見つける
		let foundNull = false;
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			if (checkCardDrop(rng, "normal") === null) {
				foundNull = true;
				break;
			}
		}
		expect(foundNull).toBe(true);
	});

	it("当選時に正しいCardExchangeEntryを返す", () => {
		// miniboss(75%)で当選するseedを探す
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			const result = checkCardDrop(rng, "miniboss");
			if (result !== null) {
				expect(result.acquiredCardType).toBe("attack");
				expect(result.defeatedEnemyType).toBe("miniboss");
				return;
			}
		}
		// 75%で100回試せば必ず当選するはず
		expect.unreachable("miniboss should have dropped at least once");
	});
});

describe("exchangeCardInDeck", () => {
	function createTestCards(): Card[] {
		const stats = { useCount: 0, defeatCount: 0, maxSingleDamage: 0 };
		return [
			{ id: "test-card-1", type: "move", level: 1, exp: 0, stats },
			{ id: "test-card-2", type: "move", level: 1, exp: 0, stats },
			{ id: "test-card-3", type: "move", level: 1, exp: 0, stats },
			{ id: "test-card-4", type: "attack", level: 1, exp: 0, stats },
			{ id: "test-card-5", type: "attack", level: 1, exp: 0, stats },
			{ id: "test-card-6", type: "wait", level: 1, exp: 0, stats },
		];
	}

	it("手札からカードを除去して新カードを追加", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-1", "strong_attack");
		expect(result.deck.hand.some((c) => c.id === "test-card-1")).toBe(false);
		expect(result.deck.hand.some((c) => c.type === "strong_attack")).toBe(true);
	});

	it("handの同位置に新カードを挿入", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-3", "jump");
		expect(result.deck.hand[2].type).toBe("jump");
		expect(result.deck.hand.length).toBe(6);
	});

	it("手札の枚数が維持される", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-2", "strong_attack");
		expect(result.deck.hand.length).toBe(cards.length);
	});

	it("usedCardIdsから除去対象のIDが取り除かれる", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: ["test-card-2", "test-card-4"],
			},
		});

		const result = exchangeCardInDeck(state, "test-card-2", "strong_attack");
		expect(result.deck.usedCardIds).not.toContain("test-card-2");
		expect(result.deck.usedCardIds).toContain("test-card-4");
	});

	it("存在しないカードIDでエラーをthrow", () => {
		const cards = createTestCards();
		const state = createTestState({
			deck: {
				hand: [...cards],
				usedCardIds: [],
			},
		});

		expect(() =>
			exchangeCardInDeck(state, "nonexistent-id", "strong_attack"),
		).toThrow('removeCardId "nonexistent-id" not found in hand');
	});
});
