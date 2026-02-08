import type { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { findTextByPrefix, getTexts } from "./pixiTestHelper";

describe("pixiTestHelper", () => {
	function createMockContainer(children: unknown[]): Container {
		return { children } as unknown as Container;
	}

	describe("getTexts", () => {
		it("textプロパティを持つ子要素のみを返す", () => {
			const container = createMockContainer([
				{ text: "HP: 10/10" },
				{ text: "AP: 3/3" },
				{ noText: true },
			]);

			const texts = getTexts(container);
			expect(texts).toHaveLength(2);
			expect(texts[0].text).toBe("HP: 10/10");
			expect(texts[1].text).toBe("AP: 3/3");
		});
	});

	describe("findTextByPrefix", () => {
		it("プレフィックスに一致するテキストを返す", () => {
			const container = createMockContainer([
				{ text: "HP: 10/10" },
				{ text: "AP: 3/3" },
				{ text: "階層: 1" },
			]);

			expect(findTextByPrefix(container, "HP:").text).toBe("HP: 10/10");
			expect(findTextByPrefix(container, "AP:").text).toBe("AP: 3/3");
			expect(findTextByPrefix(container, "階層:").text).toBe("階層: 1");
		});

		it("一致するテキストがない場合エラーを投げる", () => {
			const container = createMockContainer([{ text: "HP: 10/10" }]);

			expect(() => findTextByPrefix(container, "MISSING:")).toThrow(
				'"MISSING:" で始まるテキスト要素が見つかりません',
			);
		});
	});
});
