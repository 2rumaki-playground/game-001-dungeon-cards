import { describe, expect, it } from "vitest";
import { COMBO_BONUS } from "../constants";
import type { ComboHistory } from "../types";
import { detectCombo, getComboBonus } from "./combo";

describe("detectCombo", () => {
	it("ターン最初のカード（history=null）はコンボなし", () => {
		expect(detectCombo(null, "fire", "up")).toBeNull();
	});

	it("move→fire 異方向はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "fire", "right")).toBeNull();
	});

	it("fire→fire で連撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "fire",
			lastDirection: "up",
		};
		expect(detectCombo(history, "fire", "down")).toBe("chain");
	});

	it("fire→fire 同方向でも連撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "fire",
			lastDirection: "left",
		};
		expect(detectCombo(history, "fire", "left")).toBe("chain");
	});

	it("move→move はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "move", "up")).toBeNull();
	});

	it("wait→fire で集中攻撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "wait",
			lastDirection: null,
		};
		expect(detectCombo(history, "fire", "up")).toBe("focus");
	});

	it("wait→thunder はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "wait",
			lastDirection: null,
		};
		expect(detectCombo(history, "thunder", "up")).toBeNull();
	});

	it("thunder→fire はコンボなし（thunderはfireではない）", () => {
		const history: ComboHistory = {
			lastCardType: "thunder",
			lastDirection: "up",
		};
		expect(detectCombo(history, "fire", "up")).toBeNull();
	});

	it("fire→thunder はコンボなし（thunderはfireではない）", () => {
		const history: ComboHistory = {
			lastCardType: "fire",
			lastDirection: "up",
		};
		expect(detectCombo(history, "thunder", "up")).toBeNull();
	});

	it("move→thunder はコンボなし（突撃はfireのみ）", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "thunder", "up")).toBeNull();
	});

	it("jump→fire 同方向で奇襲コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: "up",
		};
		expect(detectCombo(history, "fire", "up")).toBe("ambush");
	});

	it("jump→fire 異方向はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: "up",
		};
		expect(detectCombo(history, "fire", "right")).toBeNull();
	});

	it("jump失敗→fire 同方向はコンボなし（lastDirection=null）", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: null,
		};
		expect(detectCombo(history, "fire", "up")).toBeNull();
	});

	it("move→wait はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "wait", null)).toBeNull();
	});

	it("fire→wait はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "fire",
			lastDirection: "up",
		};
		expect(detectCombo(history, "wait", null)).toBeNull();
	});
});

describe("getComboBonus", () => {
	it("連撃コンボのボーナスはCOMBO_BONUS.chainと一致", () => {
		expect(getComboBonus("chain")).toBe(COMBO_BONUS.chain);
	});

	it("奇襲コンボのボーナスはCOMBO_BONUS.ambushと一致", () => {
		expect(getComboBonus("ambush")).toBe(COMBO_BONUS.ambush);
	});

	it("集中攻撃コンボのボーナスはCOMBO_BONUS.focusと一致", () => {
		expect(getComboBonus("focus")).toBe(COMBO_BONUS.focus);
	});
});
