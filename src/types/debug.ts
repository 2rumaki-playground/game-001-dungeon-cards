/**
 * デバッグ開始パラメータの型定義（DEV環境限定）
 */

import type { CardType } from "./card";
import type { EnemyType } from "./character";

/** デッキ構成: カード種別ごとの枚数 */
export type DebugDeckComposition = Partial<Record<CardType, number>>;

/** 敵構成: 敵タイプごとの数 */
export type DebugEnemyComposition = Partial<Record<EnemyType, number>>;

/** デバッグ開始パラメータ */
export type DebugStartParams = {
	/** 階層番号 */
	floor?: number;
	/** デッキ構成 */
	deck?: DebugDeckComposition;
	/** 敵構成 */
	enemies?: DebugEnemyComposition;
	/** プレイヤーHP */
	playerHp?: number;
	/** プレイヤー最大HP */
	playerMaxHp?: number;
	/** 乱数シード */
	seed?: number;
};
