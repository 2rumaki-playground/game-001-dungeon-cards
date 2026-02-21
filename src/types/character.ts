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
export type EnemyType = "normal" | "heavy" | "scout" | "miniboss" | "boss";

/**
 * ボス特殊スキル種別
 */
export type BossSkillType = "power_strike" | "area_attack" | "enrage";

/**
 * 予告可能なボススキル種別
 * ※ 激昂(enrage)はHP50%以下で自動発動するため含めない
 */
export type PendingSkillType = Exclude<BossSkillType, "enrage">;

/**
 * 予告中のスキル情報
 */
export type PendingSkill = {
	type: PendingSkillType;
};

/**
 * 敵
 */
export type Enemy = {
	id: string;
	type: EnemyType;
	position: Position;
	hp: number;
	maxHp: number;
	/** 予告中のスキル（次ターンで発動） */
	pendingSkill?: PendingSkill;
	/** 激昂状態（攻撃力UP） */
	enraged?: boolean;
};
