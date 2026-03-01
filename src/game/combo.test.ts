import { describe, expect, it } from "vitest";
import { COMBO_BONUS } from "../constants";
import type { ComboHistory } from "../types";
import { detectCombo, getComboBonus } from "./combo";

describe("detectCombo", () => {
	it("ターン最初のカード（history=null）はコンボなし", () => {
		expect(detectCombo(null, "attack", "up")).toBeNull();
	});

	it("move→attack 同方向で突撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "up")).toBe("charge");
	});

	it("move→attack 異方向はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "right")).toBeNull();
	});

	it("attack→attack で連撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "attack",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "down")).toBe("chain");
	});

	it("attack→attack 同方向でも連撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "attack",
			lastDirection: "left",
		};
		expect(detectCombo(history, "attack", "left")).toBe("chain");
	});

	it("move→move はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "move", "up")).toBeNull();
	});

	it("wait→attack で集中攻撃コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "wait",
			lastDirection: null,
		};
		expect(detectCombo(history, "attack", "up")).toBe("focus");
	});

	it("wait→strong_attack はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "wait",
			lastDirection: null,
		};
		expect(detectCombo(history, "strong_attack", "up")).toBeNull();
	});

	it("strong_attack→attack はコンボなし（strong_attackはattackではない）", () => {
		const history: ComboHistory = {
			lastCardType: "strong_attack",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "up")).toBeNull();
	});

	it("attack→strong_attack はコンボなし（strong_attackはattackではない）", () => {
		const history: ComboHistory = {
			lastCardType: "attack",
			lastDirection: "up",
		};
		expect(detectCombo(history, "strong_attack", "up")).toBeNull();
	});

	it("move→strong_attack はコンボなし（突撃はattackのみ）", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "strong_attack", "up")).toBeNull();
	});

	it("jump→attack 同方向で奇襲コンボ", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "up")).toBe("ambush");
	});

	it("jump→attack 異方向はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: "up",
		};
		expect(detectCombo(history, "attack", "right")).toBeNull();
	});

	it("jump失敗→attack 同方向はコンボなし（lastDirection=null）", () => {
		const history: ComboHistory = {
			lastCardType: "jump",
			lastDirection: null,
		};
		expect(detectCombo(history, "attack", "up")).toBeNull();
	});

	it("move→wait はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "move",
			lastDirection: "up",
		};
		expect(detectCombo(history, "wait", null)).toBeNull();
	});

	it("attack→wait はコンボなし", () => {
		const history: ComboHistory = {
			lastCardType: "attack",
			lastDirection: "up",
		};
		expect(detectCombo(history, "wait", null)).toBeNull();
	});
});

describe("getComboBonus", () => {
	it("突撃コンボのボーナスはCOMBO_BONUS.chargeと一致", () => {
		expect(getComboBonus("charge")).toBe(COMBO_BONUS.charge);
	});

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
