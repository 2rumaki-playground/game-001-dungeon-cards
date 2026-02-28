import { describe, expect, it } from "vitest";
import { SpeechBannerRenderer } from "./speechBannerRenderer";

function getMessageText(renderer: SpeechBannerRenderer): {
	text: string;
	visible: boolean;
} {
	// children[0] = background (Graphics), children[1] = messageText (Text)
	return renderer.getContainer().children[1] as unknown as {
		text: string;
		visible: boolean;
	};
}

describe("SpeechBannerRenderer", () => {
	it("コンテナが背景とテキストの2要素を持つ", () => {
		const renderer = new SpeechBannerRenderer();
		expect(renderer.getContainer().children.length).toBe(2);
	});

	it("render()で発話メッセージが鉤括弧付きで表示される", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		const msg = getMessageText(renderer);
		expect(msg.text).toBe("「よし、進もう」");
		expect(msg.visible).toBe(true);
	});

	it("render(null)でテキストが空かつ非表示になる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "よし、進もう",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		renderer.render(null);
		const msg = getMessageText(renderer);
		expect(msg.text).toBe("");
		expect(msg.visible).toBe(false);
	});

	it("show/hideで表示状態が切り替わる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.hide();
		expect(renderer.getContainer().visible).toBe(false);
		renderer.show();
		expect(renderer.getContainer().visible).toBe(true);
	});

	it("clear()でテキストが空かつ非表示になる", () => {
		const renderer = new SpeechBannerRenderer();
		renderer.render({
			message: "テスト",
			eventType: "move_success",
			timestamp: Date.now(),
		});
		renderer.clear();
		const msg = getMessageText(renderer);
		expect(msg.text).toBe("");
		expect(msg.visible).toBe(false);
	});
});
