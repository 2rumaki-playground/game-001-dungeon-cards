import { describe, expect, it } from "vitest";
import { LOG_AREA_WIDTH } from "../constants";
import type { ActionLogEntry } from "../types";
import { ActionLogRenderer } from "./actionLogRenderer";

function getLogEntry(
	container: { children: unknown[] },
	index: number,
): { text: string; visible: boolean } {
	return container.children[2 + index] as unknown as {
		text: string;
		visible: boolean;
	};
}

describe("ActionLogRenderer", () => {
	it("getContainerでContainerを返す", () => {
		const renderer = new ActionLogRenderer(400);
		const container = renderer.getContainer();
		expect(container).toBeDefined();
		// 背景 + タイトル + ログテキスト15件 = 17
		expect(container.children.length).toBe(17);
	});

	it("getWidthでログエリアの幅を返す", () => {
		const renderer = new ActionLogRenderer(400);
		expect(renderer.getWidth()).toBe(LOG_AREA_WIDTH);
	});

	it("renderでログが正しく表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = [
			{ id: "1", message: "プレイヤーが移動した", timestamp: 1000 },
			{ id: "2", message: "敵を攻撃した", timestamp: 2000 },
		];

		renderer.render(logs);

		const container = renderer.getContainer();
		// children[0] = 背景, children[1] = タイトル, children[2]以降 = ログテキスト
		const logText1 = getLogEntry(container, 0);
		const logText2 = getLogEntry(container, 1);
		const logText3 = getLogEntry(container, 2);

		expect(logText1.text).toBe("プレイヤーが移動した");
		expect(logText1.visible).toBe(true);
		expect(logText2.text).toBe("敵を攻撃した");
		expect(logText2.visible).toBe(true);
		expect(logText3.text).toBe("");
		expect(logText3.visible).toBe(false);
	});

	it("renderで最大15件まで表示される", () => {
		const renderer = new ActionLogRenderer(400);
		const logs: ActionLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
			id: String(i),
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
			{ id: "1", message: "テストログ", timestamp: 1000 },
		];

		renderer.render(logs);
		renderer.clear();

		const container = renderer.getContainer();
		const logText1 = getLogEntry(container, 0);

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
});
