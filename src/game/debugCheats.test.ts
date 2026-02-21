import { afterEach, describe, expect, it } from "vitest";
import {
	getDebugCheats,
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
		expect(cheats.fullMapVisible).toBe(false);
		expect(cheats.skipEnemyTurn).toBe(false);
		expect(cheats.showEnemyAi).toBe(false);
	});
});

describe("toggleDebugCheat", () => {
	it("invincibleをトグルするとtrueになる", () => {
		const result = toggleDebugCheat("invincible");
		expect(result).toBe(true);
		expect(getDebugCheats().invincible).toBe(true);
	});

	it("2回トグルすると元に戻る", () => {
		toggleDebugCheat("fullMapVisible");
		const result = toggleDebugCheat("fullMapVisible");
		expect(result).toBe(false);
		expect(getDebugCheats().fullMapVisible).toBe(false);
	});

	it("異なるキーは独立してトグルできる", () => {
		toggleDebugCheat("invincible");
		toggleDebugCheat("fullMapVisible");
		const cheats = getDebugCheats();
		expect(cheats.invincible).toBe(true);
		expect(cheats.fullMapVisible).toBe(true);
		expect(cheats.skipEnemyTurn).toBe(false);
	});

	it("showEnemyAiをトグルするとtrueになる", () => {
		const result = toggleDebugCheat("showEnemyAi");
		expect(result).toBe(true);
		expect(getDebugCheats().showEnemyAi).toBe(true);
	});
});

describe("resetDebugCheats", () => {
	it("全てのチートをfalseにリセットする", () => {
		toggleDebugCheat("invincible");
		toggleDebugCheat("fullMapVisible");
		toggleDebugCheat("skipEnemyTurn");
		toggleDebugCheat("showEnemyAi");

		resetDebugCheats();

		const cheats = getDebugCheats();
		expect(cheats.invincible).toBe(false);
		expect(cheats.fullMapVisible).toBe(false);
		expect(cheats.skipEnemyTurn).toBe(false);
		expect(cheats.showEnemyAi).toBe(false);
	});
});
