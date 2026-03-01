import { describe, expect, it } from "vitest";
import { CharacterCardRenderer } from "./characterCardRenderer";

function getChildren(renderer: CharacterCardRenderer) {
	const container = renderer.getContainer();
	// children[0] = background, [1] = icon, [2] = label, [3] = speech, [4] = tooltip
	return {
		background: container.children[0],
		icon: container.children[1] as unknown as { text: string },
		label: container.children[2] as unknown as { text: string },
		speech: container.children[3] as unknown as {
			text: string;
			visible: boolean;
		},
		tooltip: container.children[4] as unknown as { visible: boolean },
	};
}

describe("CharacterCardRenderer", () => {
	it("コンテナが背景・アイコン・ラベル・発話・ツールチップの5要素を持つ", () => {
		const renderer = new CharacterCardRenderer();
		expect(renderer.getContainer().children.length).toBe(5);
	});

	it("render()で性格アイコンと性格名が表示される", () => {
		const renderer = new CharacterCardRenderer();
		renderer.render("brave", {
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		const { icon, label } = getChildren(renderer);
		expect(icon.text).toBe("⚔");
		expect(label.text).toBe("勇敢");
	});

	it("render()で発話メッセージが鉤括弧付きで表示される", () => {
		const renderer = new CharacterCardRenderer();
		renderer.render("brave", {
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		const { speech } = getChildren(renderer);
		expect(speech.text).toBe("「よし、進もう」");
		expect(speech.visible).toBe(true);
	});

	it("render(personality, null)で発話が非表示になる", () => {
		const renderer = new CharacterCardRenderer();
		renderer.render("cautious", null);
		const { speech } = getChildren(renderer);
		expect(speech.text).toBe("");
		expect(speech.visible).toBe(false);
	});

	it("性格ごとに異なるシンボルが表示される", () => {
		const renderer = new CharacterCardRenderer();
		const cases: [Parameters<typeof renderer.render>[0], string, string][] = [
			["brave", "⚔", "勇敢"],
			["cautious", "⛊", "慎重"],
			["cheerful", "☀", "明朗"],
			["stoic", "◆", "寡黙"],
			["curious", "？", "好奇心旺盛"],
		];
		for (const [personality, expectedSymbol, expectedLabel] of cases) {
			renderer.render(personality, null);
			const { icon, label } = getChildren(renderer);
			expect(icon.text).toBe(expectedSymbol);
			expect(label.text).toBe(expectedLabel);
		}
	});

	it("show/hideで表示状態が切り替わる", () => {
		const renderer = new CharacterCardRenderer();
		renderer.hide();
		expect(renderer.getContainer().visible).toBe(false);
		renderer.show();
		expect(renderer.getContainer().visible).toBe(true);
	});

	it("clear()でテキストが空かつ発話が非表示になる", () => {
		const renderer = new CharacterCardRenderer();
		renderer.render("brave", {
			message: "テスト",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		renderer.clear();
		const { icon, label, speech } = getChildren(renderer);
		expect(icon.text).toBe("");
		expect(label.text).toBe("");
		expect(speech.text).toBe("");
		expect(speech.visible).toBe(false);
	});

	it("ツールチップが初期状態で非表示", () => {
		const renderer = new CharacterCardRenderer();
		const { tooltip } = getChildren(renderer);
		expect(tooltip.visible).toBe(false);
	});
});
