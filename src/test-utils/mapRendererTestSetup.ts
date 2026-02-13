/**
 * MapRendererテスト用の共通セットアップ
 *
 * tween / pixi.js / assetLoader のモック設定と、
 * テスト用の簡易マップ生成ヘルパーを提供する。
 */
import { beforeEach, vi } from "vitest";
import { createTickerMock } from "./mockPixi";
import { createTweenMock, mockEasing } from "./mockTween";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

export const tickerMock = createTickerMock();

vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	return {
		...actual,
		Ticker: {
			shared: {
				add: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.add(fn),
				remove: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.remove(fn),
			},
		},
	};
});

vi.mock("../ui/assetLoader", async () => {
	const pixi = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	const dummyTexture = pixi.Texture.WHITE;
	return {
		getTileTexture: () => dummyTexture,
		getPlayerTexture: () => dummyTexture,
		getEnemyTexture: () => dummyTexture,
	};
});

beforeEach(() => {
	tickerMock.reset();
});

/**
 * テスト用の5x5フロアマップを作成
 */
export function createRendererTestMap() {
	const map = [];
	for (let y = 0; y < 5; y++) {
		const row = [];
		for (let x = 0; x < 5; x++) {
			row.push({ type: "floor" as const });
		}
		map.push(row);
	}
	return map;
}
