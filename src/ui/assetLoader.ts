/**
 * アセットローダー
 * PixiJS Assets APIでゲームアセットをプリロードし、テクスチャを提供する
 */

import { Assets, type Texture } from "pixi.js";
import type { EnemyType } from "../types/character";
import type { TileType } from "../types/map";

/** タイル種別ごとのアセットパス */
export const TILE_ASSET_PATHS: Record<TileType, string> = {
	floor: "assets/tiles/floor.png",
	wall: "assets/tiles/wall.png",
	// FIXME: cracked_wall 専用のアセットが追加されたらパスを修正すること
	cracked_wall: "assets/tiles/wall.png",
	stairs: "assets/tiles/stairs.png",
	trap: "assets/tiles/trap.png",
	chest_common: "assets/tiles/treasure.png",
	chest_rare: "assets/tiles/treasure.png",
	chest_epic: "assets/tiles/treasure.png",
};

/** 敵タイプごとのアセットパス */
export const ENEMY_ASSET_PATHS: Record<EnemyType, string> = {
	normal: "assets/enemies/normal.png",
	heavy: "assets/enemies/heavy.png",
	scout: "assets/enemies/scout.png",
	summoner: "assets/enemies/summoner.png",
	ranged: "assets/enemies/ranged.png",
	shielded: "assets/enemies/shielded.png",
	miniboss: "assets/enemies/miniboss.png",
	boss: "assets/enemies/boss.png",
};

/** プレイヤーのアセットパス */
export const PLAYER_ASSET_PATH = "assets/player.png";

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

	// 成功時のみ反映するためのテンポラリキャッシュ
	const tempCache = new Map<string, Texture>();

	try {
		const textures = await Assets.load<Texture>(allPaths);

		// テクスチャをテンポラリキャッシュし、NEAREST スケールモードを設定
		const missingPaths: string[] = [];
		for (const path of allPaths) {
			const texture = textures[path];
			if (!texture) {
				missingPaths.push(path);
				continue;
			}
			texture.source.scaleMode = "nearest";
			tempCache.set(path, texture);
		}
		if (missingPaths.length > 0) {
			throw new Error(
				`テクスチャの読み込みに失敗しました: ${missingPaths.join(", ")}`,
			);
		}

		// 全アセットが揃ったら一括でグローバルキャッシュを更新
		textureCache.clear();
		for (const [path, texture] of tempCache.entries()) {
			textureCache.set(path, texture);
		}
	} catch (error) {
		// 失敗時は中途半端なキャッシュを残さない
		textureCache.clear();
		throw error;
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
