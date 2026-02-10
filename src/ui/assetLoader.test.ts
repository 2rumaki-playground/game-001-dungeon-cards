/**
 * アセットローダーのテスト
 */

import { Assets } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ENEMY_ASSET_PATHS,
	getEnemyTexture,
	getPlayerTexture,
	getTileTexture,
	loadGameAssets,
	PLAYER_ASSET_PATH,
	TILE_ASSET_PATHS,
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

/** 全アセットパス（assetLoaderのexport定数から構築） */
const ALL_PATHS = [
	...Object.values(TILE_ASSET_PATHS),
	...Object.values(ENEMY_ASSET_PATHS),
	PLAYER_ASSET_PATH,
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
