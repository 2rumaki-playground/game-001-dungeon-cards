import { describe, expect, it } from "vitest";
import { StatusBar } from "./statusBar";

describe("StatusBar", () => {
	it("getContainerでContainerを返す", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();
		expect(container).toBeDefined();
		// 3テキスト + 4バーGraphics = 7
		expect(container.children.length).toBe(7);
	});

	it("renderでHP・AP・階層が正しく表示される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		const container = statusBar.getContainer();
		const texts = container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		);

		const hpText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("HP:"),
		) as unknown as { text: string };
		const apText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("AP:"),
		) as unknown as { text: string };
		const floorText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("階層:"),
		) as unknown as { text: string };

		expect(hpText.text).toBe("HP: 7/10");
		expect(apText.text).toBe("AP: 2/3");
		expect(floorText.text).toBe("階層: 5");
	});

	it("renderでHPバーが正しい比率で描画される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.7);
	});

	it("renderでAPバーが正しい比率で描画される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		expect(statusBar.getCurrentApRatio()).toBeCloseTo(2 / 3);
	});

	it("clearでテキストとバーがクリアされる", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);
		statusBar.clear();

		const container = statusBar.getContainer();
		const texts = container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		);

		for (const t of texts) {
			expect((t as unknown as { text: string }).text).toBe("");
		}

		expect(statusBar.getCurrentHpRatio()).toBe(0);
		expect(statusBar.getCurrentApRatio()).toBe(0);
	});

	it("show/hideで表示・非表示を切り替え", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();

		statusBar.hide();
		expect(container.visible).toBe(false);

		statusBar.show();
		expect(container.visible).toBe(true);
	});
});
