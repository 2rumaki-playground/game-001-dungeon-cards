import { describe, expect, it } from "vitest";
import { COLORS, LOG_AREA_WIDTH } from "../constants";
import type { ActionLogEntry } from "../types";
import { ActionLogRenderer, getActorLabel } from "./actionLogRenderer";

function getActorLabelElement(
	container: { children: unknown[] },
	index: number,
): { text: string; visible: boolean; style: { fill: number } } {
	return container.children[2 + index * 2] as unknown as {
		text: string;
		visible: boolean;
		style: { fill: number };
	};
}

function getLogEntry(
	container: { children: unknown[] },
	index: number,
): { text: string; visible: boolean } {
	return container.children[2 + index * 2 + 1] as unknown as {
		text: string;
		visible: boolean;
	};
}

describe("ActionLogRenderer", () => {
	it("getContainerでContainerを返す", () => {
		const renderer = new ActionLogRenderer(400);
		const container = renderer.getContainer();
		expect(container).toBeDefined();
		// 背景(1) + タイトル(1) + (主体ラベル+メッセージ)×15 + トグルボタン(1) = 33
		expect(container.children.length).toBe(33);
	});

	it("getWidthでログエリアの幅を返す", () => {
		const renderer = new ActionLogRenderer(400);
		expect(renderer.getWidth()).toBe(LOG_AREA_WIDTH);
	});

	it("renderでログが正しく表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "プレイヤーが移動した",
				timestamp: 1000,
			},
			{
				id: "2",
				actor: "enemy",
				message: "敵を攻撃した",
				timestamp: 2000,
			},
		];

		renderer.render(logs);

		const container = renderer.getContainer();
		const label1 = getActorLabelElement(container, 0);
		const logText1 = getLogEntry(container, 0);
		const label2 = getActorLabelElement(container, 1);
		const logText2 = getLogEntry(container, 1);
		const logText3 = getLogEntry(container, 2);

		expect(label1.text).toBe("自");
		expect(label1.visible).toBe(true);
		expect(logText1.text).toBe("プレイヤーが移動した");
		expect(logText1.visible).toBe(true);
		expect(label2.text).toBe("敵");
		expect(label2.visible).toBe(true);
		expect(logText2.text).toBe("敵を攻撃した");
		expect(logText2.visible).toBe(true);
		expect(logText3.text).toBe("");
		expect(logText3.visible).toBe(false);
	});

	it("renderで最大15件まで表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
			id: String(i),
			actor: "system" as const,
			message: `ログ${i + 1}`,
			timestamp: i * 1000,
		}));

		renderer.render(logs);

		const container = renderer.getContainer();
		// 最初の15件のみ表示される
		for (let i = 0; i < 15; i++) {
			const logText = getLogEntry(container, i);
			expect(logText.text).toBe(`ログ${i + 1}`);
			expect(logText.visible).toBe(true);
		}
	});

	it("clearでログがクリアされる", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "テストログ",
				timestamp: 1000,
			},
		];

		renderer.render(logs);
		renderer.clear();

		const container = renderer.getContainer();
		const label1 = getActorLabelElement(container, 0);
		const logText1 = getLogEntry(container, 0);

		expect(label1.text).toBe("");
		expect(label1.visible).toBe(false);
		expect(logText1.text).toBe("");
		expect(logText1.visible).toBe(false);
	});

	it("show/hideで表示・非表示を切り替え", () => {
		const renderer = new ActionLogRenderer(400);
		const container = renderer.getContainer();

		renderer.hide();
		expect(container.visible).toBe(false);

		renderer.show();
		expect(container.visible).toBe(true);
	});

	it("主体ラベルがactorに応じた色で表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "移動した",
				timestamp: 1000,
			},
			{
				id: "2",
				actor: "enemy",
				message: "敵が攻撃した",
				timestamp: 2000,
			},
			{
				id: "3",
				actor: "system",
				message: "敵を倒した",
				timestamp: 3000,
			},
		];

		renderer.render(logs);

		const container = renderer.getContainer();
		const label1 = getActorLabelElement(container, 0);
		const label2 = getActorLabelElement(container, 1);
		const label3 = getActorLabelElement(container, 2);

		expect(label1.style.fill).toBe(COLORS.player);
		expect(label2.style.fill).toBe(COLORS.enemy);
		expect(label3.style.fill).toBe(COLORS.system);
	});

	it("トグルボタンが存在する", () => {
		const renderer = new ActionLogRenderer(400);
		const container = renderer.getContainer();
		// 背景(1) + タイトル(1) + (主体ラベル+メッセージ)×15 + トグルボタン(1) = 33
		expect(container.children.length).toBe(33);
	});

	it("isMinimizedがデフォルトでfalseを返す", () => {
		const renderer = new ActionLogRenderer(400);
		expect(renderer.isMinimized()).toBe(false);
	});

	it("toggleで最小化/展開が切り替わる", () => {
		const renderer = new ActionLogRenderer(400);
		renderer.toggle();
		expect(renderer.isMinimized()).toBe(true);
		renderer.toggle();
		expect(renderer.isMinimized()).toBe(false);
	});

	it("最小化時にログエントリが非表示になる", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "テスト",
				timestamp: 1000,
			},
		];
		renderer.render(logs);
		renderer.toggle(); // 最小化

		const container = renderer.getContainer();
		const label1 = getActorLabelElement(container, 0);
		const logText1 = getLogEntry(container, 0);
		expect(label1.visible).toBe(false);
		expect(logText1.visible).toBe(false);
	});

	it("展開時にログエントリが再表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "テスト",
				timestamp: 1000,
			},
		];
		renderer.render(logs);
		renderer.toggle(); // 最小化
		renderer.toggle(); // 展開

		const container = renderer.getContainer();
		const label1 = getActorLabelElement(container, 0);
		const logText1 = getLogEntry(container, 0);
		expect(label1.visible).toBe(true);
		expect(logText1.visible).toBe(true);
		expect(logText1.text).toBe("テスト");
	});

	it("最小化中にrenderしても例外が出ない", () => {
		const renderer = new ActionLogRenderer(400);
		renderer.toggle(); // 最小化
		const logs: ActionLogEntry[] = [
			{
				id: "1",
				actor: "player",
				message: "テスト",
				timestamp: 1000,
			},
		];
		expect(() => renderer.render(logs)).not.toThrow();
	});
});

describe("getActorLabel", () => {
	it("actorに応じたラベルを返す", () => {
		expect(getActorLabel("player")).toBe("自");
		expect(getActorLabel("enemy")).toBe("敵");
		expect(getActorLabel("system")).toBe("他");
	});
});
