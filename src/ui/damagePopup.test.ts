/**
 * ダメージ/MISSポップアップのテスト
 */

import "../test-utils/mapRendererTestSetup";
import { Container } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { tween } from "../utils/tween";
import { animateDamagePopup, animateMissPopup } from "./damagePopup";

describe("animateDamagePopup", () => {
	it("アニメーション完了後にコンテナから子要素が除去される", async () => {
		const container = new Container();
		await animateDamagePopup(container, { x: 0, y: 0 }, 5);
		expect(container.children).toHaveLength(0);
	});

	it("tweenがrejectしてもcleanupが実行される", async () => {
		const tweenMock = vi.mocked(tween);
		tweenMock.mockRejectedValueOnce(new Error("tween error"));

		const container = new Container();
		await expect(
			animateDamagePopup(container, { x: 0, y: 0 }, 5),
		).rejects.toThrow("tween error");

		// finally節によりTextがコンテナから除去・破棄されていること
		expect(container.children).toHaveLength(0);
	});
});

describe("animateMissPopup", () => {
	it("アニメーション完了後にコンテナから子要素が除去される", async () => {
		const container = new Container();
		await animateMissPopup(container, { x: 0, y: 0 });
		expect(container.children).toHaveLength(0);
	});

	it("tweenがrejectしてもcleanupが実行される", async () => {
		const tweenMock = vi.mocked(tween);
		tweenMock.mockRejectedValueOnce(new Error("tween error"));

		const container = new Container();
		await expect(animateMissPopup(container, { x: 0, y: 0 })).rejects.toThrow(
			"tween error",
		);

		// finally節によりTextがコンテナから除去・破棄されていること
		expect(container.children).toHaveLength(0);
	});
});
