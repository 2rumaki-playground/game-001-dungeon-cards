/**
 * キャラクター関連の型定義
 * @see docs/spec/mvp/rules.md - 戦闘システム
 */

import type { Position } from "./direction";

/**
 * プレイヤー
 */
export type Player = {
	position: Position;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
};

/**
 * 敵タイプ
 */
export type EnemyType = "normal" | "heavy" | "scout";

/**
 * 敵
 */
export type Enemy = {
	id: string;
	type: EnemyType;
	position: Position;
	hp: number;
	maxHp: number;
};
