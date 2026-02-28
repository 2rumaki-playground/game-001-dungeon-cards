/**
 * コンボポップアップのテスト
 */

import "../test-utils/mapRendererTestSetup";
import { Container } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { tween } from "../utils/tween";
import { animateComboPopup } from "./comboPopup";

describe("animateComboPopup", () => {
	it("突撃コンボのポップアップが正常に完了する", async () => {
		const container = new Container();
		await expect(
			animateComboPopup(container, { x: 1, y: 1 }, "charge"),
		).resolves.toBeUndefined();
	});

	it("連撃コンボのポップアップが正常に完了する", async () => {
		const container = new Container();
		await expect(
			animateComboPopup(container, { x: 2, y: 3 }, "chain"),
		).resolves.toBeUndefined();
	});

	it("アニメーション完了後にコンテナから子要素が除去される", async () => {
		const container = new Container();
		await animateComboPopup(container, { x: 0, y: 0 }, "charge");
		expect(container.children).toHaveLength(0);
	});

	it("tweenがrejectしてもcleanupが実行される", async () => {
		const tweenMock = vi.mocked(tween);
		tweenMock.mockRejectedValueOnce(new Error("tween error"));

		const container = new Container();
		await expect(
			animateComboPopup(container, { x: 0, y: 0 }, "charge"),
		).rejects.toThrow("tween error");

		// finally節によりTextがコンテナから除去・破棄されていること
		expect(container.children).toHaveLength(0);
	});
});
