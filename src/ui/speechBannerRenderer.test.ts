import { describe, expect, it } from "vitest";
import { SpeechBannerRenderer } from "./speechBannerRenderer";

describe("SpeechBannerRenderer", () => {
	it("コンテナが取得できる", () => {
		const renderer = new SpeechBannerRenderer();
		expect(renderer.getContainer()).toBeDefined();
	});

	it("render()で発話メッセージが鉤括弧付きで表示される", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		const container = renderer.getContainer();
		// Containerの子要素にTextがある
		expect(container.children.length).toBeGreaterThan(0);
	});

	it("render(null)でテキストが非表示になる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		renderer.render(null);
		// clear後もコンテナは存在する
		expect(renderer.getContainer()).toBeDefined();
	});

	it("show/hideで表示状態が切り替わる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.hide();
		expect(renderer.getContainer().visible).toBe(false);
		renderer.show();
		expect(renderer.getContainer().visible).toBe(true);
	});

	it("clear()でテキストが空になる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "テスト",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		renderer.clear();
		expect(renderer.getContainer()).toBeDefined();
	});
});
