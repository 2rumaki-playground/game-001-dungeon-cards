import { describe, expect, it } from "vitest";
import { StatusBar } from "./statusBar";

describe("StatusBar", () => {
	it("getContainerでContainerを返す", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();
		expect(container).toBeDefined();
		expect(container.children.length).toBe(3);
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
		const hpText = container.children[0] as { text: string };
		const apText = container.children[1] as { text: string };
		const floorText = container.children[2] as { text: string };

		expect(hpText.text).toBe("HP: 7/10");
		expect(apText.text).toBe("AP: 2/3");
		expect(floorText.text).toBe("階層: 5");
	});

	it("clearでテキストがクリアされる", () => {
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
		const hpText = container.children[0] as { text: string };
		const apText = container.children[1] as { text: string };
		const floorText = container.children[2] as { text: string };

		expect(hpText.text).toBe("");
		expect(apText.text).toBe("");
		expect(floorText.text).toBe("");
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
