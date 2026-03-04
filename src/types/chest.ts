/**
 * 宝箱ドロップシステムの型定義
 */

import type { CardExchangeEntry } from "./cardAcquisition";
import type { EnemyType } from "./character";

/**
 * 宝箱レアリティ
 */
export type ChestRarity = "common" | "rare" | "epic";

/**
 * 宝箱の中身種別
 */
export type ChestContentType = "heal" | "scroll";

/**
 * 宝箱タイルに紐づくメタ情報
 */
export type ChestMeta = {
	rarity: ChestRarity;
	defeatedEnemyType: EnemyType;
};

/**
 * 宝箱の中身（開封時に決定）
 */
export type ChestContent = {
	type: ChestContentType;
	rarity: ChestRarity;
	healAmount?: number;
	cardExchangeEntry?: CardExchangeEntry;
};
