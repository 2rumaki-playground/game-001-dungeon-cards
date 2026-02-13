import { afterEach, describe, expect, it } from "vitest";
import { CARD_COST } from "../constants";
import type { CardType } from "../types";
import {
	getDebugCheats,
	getEffectiveCardCost,
	resetDebugCheats,
	toggleDebugCheat,
} from "./debugCheats";

afterEach(() => {
	resetDebugCheats();
});

describe("getDebugCheats", () => {
	it("初期状態は全てfalse", () => {
		const cheats = getDebugCheats();
		expect(cheats.invincible).toBe(false);
		expect(cheats.infiniteAp).toBe(false);
		expect(cheats.fullMapVisible).toBe(false);
		expect(cheats.skipEnemyTurn).toBe(false);
	});
});

describe("toggleDebugCheat", () => {
	it("invincibleをトグルするとtrueになる", () => {
		const result = toggleDebugCheat("invincible");
		expect(result).toBe(true);
		expect(getDebugCheats().invincible).toBe(true);
	});

	it("2回トグルすると元に戻る", () => {
		toggleDebugCheat("infiniteAp");
		const result = toggleDebugCheat("infiniteAp");
		expect(result).toBe(false);
		expect(getDebugCheats().infiniteAp).toBe(false);
	});

	it("異なるキーは独立してトグルできる", () => {
		toggleDebugCheat("invincible");
		toggleDebugCheat("fullMapVisible");
		const cheats = getDebugCheats();
		expect(cheats.invincible).toBe(true);
		expect(cheats.infiniteAp).toBe(false);
		expect(cheats.fullMapVisible).toBe(true);
		expect(cheats.skipEnemyTurn).toBe(false);
	});
});

const allCardTypes: CardType[] = [
	"move",
	"attack",
	"strong_attack",
	"jump",
	"wait",
];

describe("getEffectiveCardCost", () => {
	it("AP無限OFF時はCARD_COSTの値を返す", () => {
		for (const cardType of allCardTypes) {
			expect(getEffectiveCardCost(cardType)).toBe(CARD_COST[cardType]);
		}
	});

	it("AP無限ON時は全カードタイプで0を返す", () => {
		toggleDebugCheat("infiniteAp");
		for (const cardType of allCardTypes) {
			expect(getEffectiveCardCost(cardType)).toBe(0);
		}
	});
});

describe("resetDebugCheats", () => {
	it("全てのチートをfalseにリセットする", () => {
		toggleDebugCheat("invincible");
		toggleDebugCheat("infiniteAp");
		toggleDebugCheat("fullMapVisible");
		toggleDebugCheat("skipEnemyTurn");

		resetDebugCheats();

		const cheats = getDebugCheats();
		expect(cheats.invincible).toBe(false);
		expect(cheats.infiniteAp).toBe(false);
		expect(cheats.fullMapVisible).toBe(false);
		expect(cheats.skipEnemyTurn).toBe(false);
	});
});
