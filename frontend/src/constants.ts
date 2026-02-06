/**
 * ゲーム定数
 * @see docs/spec/constants.md
 */

import type { CardType, Rarity } from "./types";

// 行動関連
export const MAX_AP = 3;
export const TURN_START_AP = 3;
export const HAND_LIMIT = 5;

// デッキ構成
export const INITIAL_DECK = {
	moveCards: 6,
	attackCards: 6,
	strongAttackCards: 2,
	rushCards: 2,
	waitCards: 2,
} as const;

export const TOTAL_DECK_SIZE =
	INITIAL_DECK.moveCards +
	INITIAL_DECK.attackCards +
	INITIAL_DECK.strongAttackCards +
	INITIAL_DECK.rushCards +
	INITIAL_DECK.waitCards;

// カードAPコスト
export const CARD_COST = {
	move: 1,
	attack: 1,
	strong_attack: 2,
	rush: 2,
	wait: 0,
} as const;

// 突進
export const RUSH_MAX_DISTANCE = 2;

// 戦闘
export const PLAYER_INITIAL_HP = 10;
export const PLAYER_ATTACK_DAMAGE = 1;
export const PLAYER_STRONG_ATTACK_DAMAGE = 3;

// 敵タイプ別パラメータ
export const ENEMY_PARAMS = {
	normal: { hp: 3, attackDamage: 1, moveDistance: 1 },
	heavy: { hp: 5, attackDamage: 2, moveDistance: 0 },
	scout: { hp: 2, attackDamage: 1, moveDistance: 2 },
} as const;

// 後方互換（通常敵のパラメータ）
export const ENEMY_HP = ENEMY_PARAMS.normal.hp;
export const ENEMY_ATTACK_DAMAGE = ENEMY_PARAMS.normal.attackDamage;

// 階層
export const INITIAL_FLOOR = 1;

// マップ
export const MAP_WIDTH = 7;
export const MAP_HEIGHT = 7;
export const STAIRS_COUNT = 1;
export const ENEMY_COUNT = 3;

// 階層別敵構成
export type EnemyComposition = {
	normal: number;
	heavy: number;
	scout: number;
};

export const ENEMY_COMPOSITION_TABLE: {
	maxFloor: number;
	composition: EnemyComposition;
}[] = [
	{ maxFloor: 2, composition: { normal: 3, heavy: 0, scout: 0 } },
	{ maxFloor: 4, composition: { normal: 2, heavy: 0, scout: 1 } },
	{ maxFloor: 6, composition: { normal: 2, heavy: 1, scout: 0 } },
	{ maxFloor: 8, composition: { normal: 1, heavy: 1, scout: 1 } },
	{ maxFloor: Infinity, composition: { normal: 0, heavy: 1, scout: 2 } },
];

export function getEnemyComposition(floor: number): EnemyComposition {
	const entry = ENEMY_COMPOSITION_TABLE.find((e) => floor <= e.maxFloor);
	// 最後のエントリがInfinityなので必ずマッチする
	return (entry as (typeof ENEMY_COMPOSITION_TABLE)[number]).composition;
}

// デッキ構築（v1.2）
export const DECK_MAX_SIZE = 30;
export const DECK_MIN_SIZE = 10;
export const CARD_REMOVAL_CHANCE = 0.3;

// カードレアリティ（正典: docs/spec/constants.md）
export const CARD_RARITY: Record<CardType, Rarity> = {
	move: "common",
	attack: "common",
	wait: "common",
	strong_attack: "uncommon",
	rush: "rare",
};

// レアリティ出現率（正典: docs/spec/constants.md）
export const RARITY_WEIGHTS: Record<Rarity, number> = {
	common: 70,
	uncommon: 25,
	rare: 5,
};

// 行動ログ
export const ACTION_LOG_LIMIT = 50;

// マップレイアウト（内側の床タイル）
export const FLOOR_AREA_SIZE = 5; // 5x5
export const FLOOR_TILE_COUNT = FLOOR_AREA_SIZE * FLOOR_AREA_SIZE; // 25

// 描画設定
export const CELL_SIZE = 64;
export const CELL_GAP = 4;
export const STATUS_BAR_HEIGHT = 40;
export const LOG_AREA_WIDTH = 200;
export const LOG_AREA_GAP = 8;

// 色定義
export const COLORS = {
	// 背景
	background: 0x1a1a1a,
	// タイル
	floor: 0x3a3a3a,
	wall: 0x1a1a1a,
	stairs: 0x4a6a4a,
	// キャラクター
	player: 0x4a8cca,
	// 敵タイプ別カラー
	enemyNormal: 0xca4a4a,
	enemyHeavy: 0x8855aa,
	enemyScout: 0x88cc44,
	// 後方互換（通常敵カラー）
	enemy: 0xca4a4a,
} as const;
