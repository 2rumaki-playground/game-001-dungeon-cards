import { describe, expect, it } from "vitest";
import {
	UI_COLOR_GOLD,
	UI_COLORS_BUTTON_PRIMARY,
	UI_COLORS_BUTTON_SECONDARY,
	UI_COLORS_DISABLED,
} from "./uiColors";

describe("UI色定数", () => {
	it("ゴールド色が定義されている", () => {
		expect(UI_COLOR_GOLD).toBe(0xffd700);
	});

	it("無効状態色が定義されている", () => {
		expect(UI_COLORS_DISABLED).toEqual({
			bg: 0x2a2a2a,
			border: 0x4a4a4a,
			text: 0x666666,
		});
	});

	it("プライマリボタン色が定義されている", () => {
		expect(UI_COLORS_BUTTON_PRIMARY).toEqual({
			bg: 0x2a5a8c,
			border: 0x4a8cca,
		});
	});

	it("セカンダリボタン色が定義されている", () => {
		expect(UI_COLORS_BUTTON_SECONDARY).toEqual({
			bg: 0x555555,
			border: 0x777777,
		});
	});
});
