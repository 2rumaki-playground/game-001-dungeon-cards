/**
 * アセットローダーのテスト
 */

import { Assets } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getEnemyTexture,
	getPlayerTexture,
	getTileTexture,
	loadGameAssets,
} from "./assetLoader";

vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	return {
		...actual,
		Assets: {
			load: vi.fn(),
		},
	};
});

/** 全アセットパス（assetLoader内部の定義と同期） */
const ALL_PATHS = [
	"assets/tiles/floor.png",
	"assets/tiles/wall.png",
	"assets/tiles/stairs.png",
	"assets/tiles/trap.png",
	"assets/tiles/treasure.png",
	"assets/tiles/rest_area.png",
	"assets/enemies/normal.png",
	"assets/enemies/heavy.png",
	"assets/enemies/scout.png",
	"assets/enemies/miniboss.png",
	"assets/enemies/boss.png",
	"assets/player.png",
];

/** モックテクスチャを作成 */
function createMockTexture() {
	return {
		source: { scaleMode: "linear" },
	} as unknown as import("pixi.js").Texture;
}

/** 全パスに対応するモックテクスチャのマップを作成 */
function createAllMockTextures() {
	const textures: Record<string, import("pixi.js").Texture> = {};
	for (const path of ALL_PATHS) {
		textures[path] = createMockTexture();
	}
	return textures;
}

describe("assetLoader", () => {
	beforeEach(() => {
		vi.mocked(Assets.load).mockReset();
	});

	it("全パス成功時にキャッシュからテクスチャを取得できる", async () => {
		const mockTextures = createAllMockTextures();
		vi.mocked(Assets.load).mockResolvedValue(mockTextures);

		await loadGameAssets();

		expect(getTileTexture("floor")).toBe(
			mockTextures["assets/tiles/floor.png"],
		);
		expect(getEnemyTexture("normal")).toBe(
			mockTextures["assets/enemies/normal.png"],
		);
		expect(getPlayerTexture()).toBe(mockTextures["assets/player.png"]);
	});

	it("欠落パスがある場合に一覧を含むエラーになる", async () => {
		const mockTextures = createAllMockTextures();
		(mockTextures as Record<string, unknown>)["assets/tiles/floor.png"] =
			undefined;
		(mockTextures as Record<string, unknown>)["assets/player.png"] = undefined;
		vi.mocked(Assets.load).mockResolvedValue(mockTextures);

		await expect(loadGameAssets()).rejects.toThrow(
			"テクスチャの読み込みに失敗しました: assets/tiles/floor.png, assets/player.png",
		);
	});

	it("scaleModeがnearestに設定される", async () => {
		const mockTextures = createAllMockTextures();
		vi.mocked(Assets.load).mockResolvedValue(mockTextures);

		await loadGameAssets();

		for (const texture of Object.values(mockTextures)) {
			expect(texture.source.scaleMode).toBe("nearest");
		}
	});
});
