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
};

/**
 * 敵タイプ
 */
export type EnemyType =
	| "normal"
	| "heavy"
	| "scout"
	| "summoner"
	| "ranged"
	| "shielded"
	| "miniboss"
	| "boss";

/**
 * ボス特殊スキル種別
 */
export type BossSkillType = "power_strike" | "area_attack" | "enrage";

/**
 * 敵
 */
export type Enemy = {
	id: string;
	type: EnemyType;
	position: Position;
	hp: number;
	maxHp: number;
	/** 激昂状態（攻撃力UP） */
	enraged?: boolean;
	/** 召喚クールダウン（召喚敵用） */
	summonCooldown?: number;
	/** 盾が有効か（盾持ち敵用） */
	shieldActive?: boolean;
};
