/**
 * アセットローダー
 * PixiJS Assets APIでゲームアセットをプリロードし、テクスチャを提供する
 */

import { Assets, type Texture } from "pixi.js";
import type { EnemyType } from "../types/character";
import type { TileType } from "../types/map";

/** タイル種別ごとのアセットパス */
const TILE_ASSET_PATHS: Record<TileType, string> = {
	floor: "assets/tiles/floor.png",
	wall: "assets/tiles/wall.png",
	stairs: "assets/tiles/stairs.png",
	trap: "assets/tiles/trap.png",
	treasure: "assets/tiles/treasure.png",
	rest_area: "assets/tiles/rest_area.png",
};

/** 敵タイプごとのアセットパス */
const ENEMY_ASSET_PATHS: Record<EnemyType, string> = {
	normal: "assets/enemies/normal.png",
	heavy: "assets/enemies/heavy.png",
	scout: "assets/enemies/scout.png",
	miniboss: "assets/enemies/miniboss.png",
	boss: "assets/enemies/boss.png",
};

/** プレイヤーのアセットパス */
const PLAYER_ASSET_PATH = "assets/player.png";

/** 読み込み済みテクスチャのキャッシュ */
const textureCache = new Map<string, Texture>();

/**
 * 全ゲームアセットをプリロードする
 * app.init() の後、描画開始前に呼び出すこと
 */
export async function loadGameAssets(): Promise<void> {
	const allPaths = [
		...Object.values(TILE_ASSET_PATHS),
		...Object.values(ENEMY_ASSET_PATHS),
		PLAYER_ASSET_PATH,
	];

	const textures = await Assets.load<Texture>(allPaths);

	// テクスチャをキャッシュし、NEAREST スケールモードを設定
	const missingPaths: string[] = [];
	for (const path of allPaths) {
		const texture = textures[path];
		if (!texture) {
			missingPaths.push(path);
			continue;
		}
		texture.source.scaleMode = "nearest";
		textureCache.set(path, texture);
	}
	if (missingPaths.length > 0) {
		throw new Error(
			`テクスチャの読み込みに失敗しました: ${missingPaths.join(", ")}`,
		);
	}
}

/**
 * タイル種別に対応するテクスチャを取得
 */
export function getTileTexture(type: TileType): Texture {
	const path = TILE_ASSET_PATHS[type];
	const texture = textureCache.get(path);
	if (!texture) {
		throw new Error(`テクスチャ未読み込み: ${path}`);
	}
	return texture;
}

/**
 * 敵タイプに対応するテクスチャを取得
 */
export function getEnemyTexture(type: EnemyType): Texture {
	const path = ENEMY_ASSET_PATHS[type];
	const texture = textureCache.get(path);
	if (!texture) {
		throw new Error(`テクスチャ未読み込み: ${path}`);
	}
	return texture;
}

/**
 * プレイヤーのテクスチャを取得
 */
export function getPlayerTexture(): Texture {
	const texture = textureCache.get(PLAYER_ASSET_PATH);
	if (!texture) {
		throw new Error(`テクスチャ未読み込み: ${PLAYER_ASSET_PATH}`);
	}
	return texture;
}
