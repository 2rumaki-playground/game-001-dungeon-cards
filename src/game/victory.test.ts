import { describe, expect, it } from "vitest";
import { CLEAR_FLOOR } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import { checkVictory, shouldShowVictoryScreen } from "./victory";

describe("checkVictory", () => {
	it("20Fでボス撃破時にisClearedがtrueになる", () => {
		const state = createTestState({ floor: CLEAR_FLOOR });
		const result = checkVictory(state, "boss");
		expect(result.isCleared).toBe(true);
	});

	it("20F以外でボス撃破してもisClearedはfalseのまま", () => {
		const state = createTestState({ floor: 10 });
		const result = checkVictory(state, "boss");
		expect(result.isCleared).toBe(false);
	});

	it("20Fで通常敵撃破してもisClearedはfalseのまま", () => {
		const state = createTestState({ floor: CLEAR_FLOOR });
		const result = checkVictory(state, "normal");
		expect(result.isCleared).toBe(false);
	});

	it("20Fでミニボス撃破してもisClearedはfalseのまま", () => {
		const state = createTestState({ floor: CLEAR_FLOOR });
		const result = checkVictory(state, "miniboss");
		expect(result.isCleared).toBe(false);
	});

	it("既にクリア済みの場合は状態を変更しない", () => {
		const state = createTestState({
			floor: CLEAR_FLOOR,
			isCleared: true,
		});
		const result = checkVictory(state, "boss");
		expect(result).toBe(state);
	});
});

describe("shouldShowVictoryScreen", () => {
	it("isCleared=true, floor=20の場合trueを返す", () => {
		const state = createTestState({
			floor: CLEAR_FLOOR,
			isCleared: true,
		});
		expect(shouldShowVictoryScreen(state)).toBe(true);
	});

	it("isCleared=falseの場合falseを返す", () => {
		const state = createTestState({
			floor: CLEAR_FLOOR,
			isCleared: false,
		});
		expect(shouldShowVictoryScreen(state)).toBe(false);
	});

	it("isCleared=true, floor=21（既に通過済み）の場合falseを返す", () => {
		const state = createTestState({
			floor: CLEAR_FLOOR + 1,
			isCleared: true,
		});
		expect(shouldShowVictoryScreen(state)).toBe(false);
	});

	it("isCleared=true, floor=19（まだ到達前）の場合falseを返す", () => {
		const state = createTestState({
			floor: CLEAR_FLOOR - 1,
			isCleared: true,
		});
		expect(shouldShowVictoryScreen(state)).toBe(false);
	});
});
