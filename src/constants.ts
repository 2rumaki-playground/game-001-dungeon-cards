/**
 * ゲーム定数
 * @see docs/spec/constants.md
 */

import type { EnemyCardAcquisitionConfig, EnemyType } from "./types";

// 行動関連
export const MAX_AP = 3;
export const TURN_START_AP = 3;
export const HAND_LIMIT = 3;

// デッキ構成
export const INITIAL_DECK = {
	moveCards: 3,
	attackCards: 2,
	waitCards: 1,
} as const;

export const TOTAL_DECK_SIZE =
	INITIAL_DECK.moveCards + INITIAL_DECK.attackCards + INITIAL_DECK.waitCards;

// カードキーワード（属性）
export const KEYWORDS = ["flame", "water"] as const;

// カードAPコスト
export const CARD_COST = {
	move: 1,
	attack: 1,
	strong_attack: 2,
	jump: 2,
	wait: 0,
} as const;

// ジャンプ
export const JUMP_DISTANCE = 2;

// 戦闘
export const PLAYER_INITIAL_HP = 10;
export const PLAYER_ATTACK_DAMAGE = 1;
export const PLAYER_STRONG_ATTACK_DAMAGE = 3;

// 敵タイプ別パラメータ
export const ENEMY_PARAMS = {
	normal: { hp: 3, attackDamage: 1, moveDistance: 1, senseRange: 5 },
	heavy: { hp: 5, attackDamage: 2, moveDistance: 0, senseRange: 3 },
	scout: { hp: 2, attackDamage: 1, moveDistance: 2, senseRange: 8 },
	miniboss: { hp: 8, attackDamage: 2, moveDistance: 1, senseRange: 7 },
	boss: { hp: 15, attackDamage: 3, moveDistance: 1, senseRange: 10 },
} as const;

// 敵タイプ表示名
export const ENEMY_TYPE_LABEL: Record<EnemyType, string> = {
	normal: "通常敵",
	heavy: "重装敵",
	scout: "俊敏敵",
	miniboss: "ミニボス",
	boss: "ボス",
} as const;

// 後方互換（通常敵のパラメータ）
export const ENEMY_HP = ENEMY_PARAMS.normal.hp;
export const ENEMY_ATTACK_DAMAGE = ENEMY_PARAMS.normal.attackDamage;

// 階層
export const INITIAL_FLOOR = 1;
export const CLEAR_FLOOR = 20;
// マップ
export const MAP_WIDTH = 7;
export const MAP_HEIGHT = 7;
export const STAIRS_COUNT = 1;
/** 構成テーブル用の基準人数（敵タイプ比率はこの人数分を定義する） */
export const ENEMY_COUNT = 3;

// 階層別敵構成
export type EnemyComposition = {
	normal: number;
	heavy: number;
	scout: number;
	miniboss: number;
	boss: number;
};

export const ENEMY_COMPOSITION_TABLE: {
	maxFloor: number;
	composition: EnemyComposition;
}[] = [
	// 序盤（1-4F）
	{
		maxFloor: 2,
		composition: { normal: 3, heavy: 0, scout: 0, miniboss: 0, boss: 0 },
	},
	{
		maxFloor: 4,
		composition: { normal: 2, heavy: 0, scout: 1, miniboss: 0, boss: 0 },
	},
	// 5F: 中ボス階層
	{
		maxFloor: 5,
		composition: { normal: 1, heavy: 1, scout: 0, miniboss: 1, boss: 0 },
	},
	// 中盤（6-9F）
	{
		maxFloor: 6,
		composition: { normal: 1, heavy: 1, scout: 1, miniboss: 0, boss: 0 },
	},
	{
		maxFloor: 9,
		composition: { normal: 0, heavy: 1, scout: 2, miniboss: 0, boss: 0 },
	},
	// 10F: 大ボス階層
	{
		maxFloor: 10,
		composition: { normal: 0, heavy: 1, scout: 1, miniboss: 0, boss: 1 },
	},
	// 後半（11-14F）
	{
		maxFloor: 12,
		composition: { normal: 0, heavy: 1, scout: 2, miniboss: 0, boss: 0 },
	},
	{
		maxFloor: 14,
		composition: { normal: 0, heavy: 2, scout: 1, miniboss: 0, boss: 0 },
	},
	// 15F: 中ボス階層
	{
		maxFloor: 15,
		composition: { normal: 0, heavy: 1, scout: 1, miniboss: 1, boss: 0 },
	},
	// 終盤（16-19F）
	{
		maxFloor: 18,
		composition: { normal: 0, heavy: 2, scout: 1, miniboss: 0, boss: 0 },
	},
	{
		maxFloor: 19,
		composition: { normal: 0, heavy: 1, scout: 2, miniboss: 0, boss: 0 },
	},
	// 20F: 大ボス階層
	{
		maxFloor: 20,
		composition: { normal: 0, heavy: 1, scout: 1, miniboss: 0, boss: 1 },
	},
	// 21F以降（拡張用）
	{
		maxFloor: Infinity,
		composition: { normal: 0, heavy: 2, scout: 1, miniboss: 0, boss: 0 },
	},
];

export function getEnemyComposition(floor: number): EnemyComposition {
	const entry =
		ENEMY_COMPOSITION_TABLE.find((e) => floor <= e.maxFloor) ??
		ENEMY_COMPOSITION_TABLE[ENEMY_COMPOSITION_TABLE.length - 1];
	return entry.composition;
}

// ボス階層定義（ENEMY_COMPOSITION_TABLEから導出）
export function isBossFloor(floor: number): boolean {
	const composition = getEnemyComposition(floor);
	return (composition.boss ?? 0) > 0 || (composition.miniboss ?? 0) > 0;
}

export function getBossType(floor: number): "miniboss" | "boss" | null {
	const composition = getEnemyComposition(floor);
	if ((composition.boss ?? 0) > 0) {
		return "boss";
	}
	if ((composition.miniboss ?? 0) > 0) {
		return "miniboss";
	}
	return null;
}

// デッキ構築（v1.2）
export const DECK_MAX_SIZE = 6;
export const DECK_MIN_SIZE = 6;
// 敵撃破時カード獲得条件（正典: docs/spec/constants.md）
// カードマッピングは各エントリの cardType を参照
export const ENEMY_ACQUISITION_CONDITIONS: Record<
	EnemyType,
	EnemyCardAcquisitionConfig
> = {
	normal: {
		cardType: "move",
		conditions: [{ type: "defeat_count", threshold: 3 }],
		conditionLogic: "and",
	},
	heavy: {
		cardType: "strong_attack",
		conditions: [{ type: "defeat_count", threshold: 2 }],
		conditionLogic: "and",
	},
	scout: {
		cardType: "jump",
		conditions: [
			{ type: "defeat_count", threshold: 2 },
			{ type: "hit_count", threshold: 1 },
		],
		conditionLogic: "and",
	},
	miniboss: {
		cardType: "attack",
		conditions: [{ type: "defeat_count", threshold: 1 }],
		conditionLogic: "and",
	},
	boss: {
		cardType: "wait",
		conditions: [{ type: "defeat_count", threshold: 1 }],
		conditionLogic: "and",
	},
};

// 行動ログ
export const ACTION_LOG_LIMIT = 50;

// プレイ統計
export const MAX_PLAY_SESSIONS = 50;

// マップレイアウト（内側の床タイル）
export const FLOOR_AREA_SIZE = 5; // 5x5
export const FLOOR_TILE_COUNT = FLOOR_AREA_SIZE * FLOOR_AREA_SIZE; // 25

// 特殊タイル効果（v1.3）
export const TRAP_DAMAGE = 1;
export const TREASURE_HEAL = 3;

// 階層別特殊タイル配置テーブル
export type SpecialTileComposition = {
	trap: number;
	treasure: number;
	rest_area: number;
};

export const SPECIAL_TILE_TABLE: {
	maxFloor: number;
	composition: SpecialTileComposition;
}[] = [
	{ maxFloor: 2, composition: { trap: 1, treasure: 1, rest_area: 0 } },
	{ maxFloor: 4, composition: { trap: 2, treasure: 1, rest_area: 1 } },
	{ maxFloor: 6, composition: { trap: 2, treasure: 1, rest_area: 1 } },
	{ maxFloor: 9, composition: { trap: 3, treasure: 1, rest_area: 1 } },
	{ maxFloor: 14, composition: { trap: 3, treasure: 2, rest_area: 1 } },
	{ maxFloor: Infinity, composition: { trap: 4, treasure: 2, rest_area: 1 } },
];

export function getSpecialTileComposition(
	floor: number,
): SpecialTileComposition {
	const entry = SPECIAL_TILE_TABLE.find((e) => floor <= e.maxFloor);
	return (entry as (typeof SPECIAL_TILE_TABLE)[number]).composition;
}

export function getSpecialTileCount(floor: number): number {
	const comp = getSpecialTileComposition(floor);
	return comp.trap + comp.treasure + comp.rest_area;
}

// ビューポート（表示領域）
export const VIEWPORT_TILES = 9;

// カメラズーム
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_DEFAULT = 1.0;
export const ZOOM_WHEEL_STEP = 0.1;

// 階層別マップサイズ（v1.3）
export const MAP_SIZE_TABLE: {
	maxFloor: number;
	width: number;
	height: number;
}[] = [
	{ maxFloor: 2, width: 9, height: 9 },
	{ maxFloor: 4, width: 11, height: 11 },
	{ maxFloor: 6, width: 13, height: 13 },
	{ maxFloor: 9, width: 15, height: 15 },
	{ maxFloor: 14, width: 17, height: 17 },
	{ maxFloor: Infinity, width: 19, height: 19 },
];

export function getMapSize(floor: number): { width: number; height: number } {
	const entry = MAP_SIZE_TABLE.find((e) => floor <= e.maxFloor);
	const { width, height } = entry ?? MAP_SIZE_TABLE[MAP_SIZE_TABLE.length - 1];
	return { width, height };
}

// 階層別敵配置数（v1.3）
export const ENEMY_COUNT_TABLE: {
	maxFloor: number;
	count: number;
}[] = [
	{ maxFloor: 2, count: 3 },
	{ maxFloor: 4, count: 4 },
	{ maxFloor: 6, count: 5 },
	{ maxFloor: 9, count: 6 },
	{ maxFloor: 14, count: 7 },
	{ maxFloor: Infinity, count: 8 },
];

export function getEnemyCount(floor: number): number {
	const entry =
		ENEMY_COUNT_TABLE.find((e) => floor <= e.maxFloor) ??
		ENEMY_COUNT_TABLE[ENEMY_COUNT_TABLE.length - 1];
	return entry.count;
}

// BSPマップ生成（v1.3）
export const BSP_MIN_PARTITION_SIZE = 5;
export const BSP_MIN_ROOM_SIZE = 3; // 内部床サイズ（最小幅/高さ）
export const BSP_CORRIDOR_WIDTH = 1;
export const BSP_MAX_DEPTH = 4;
export const BSP_MAX_RETRIES = 10;
export const BSP_MAP_WIDTH = 12; // 内側領域が 2 * BSP_MIN_PARTITION_SIZE 以上（Issue #211で階層別に変更予定）
export const BSP_MAP_HEIGHT = 12;

// ボス特殊スキル（v1.4）
export const BOSS_SKILL = {
	/** ミニボス: 強化攻撃の発動確率 */
	powerStrikeChance: 0.3,
	/** ミニボス: 強化攻撃のダメージ倍率 */
	powerStrikeMultiplier: 2,
	/** ボス: 範囲攻撃の発動確率 */
	areaAttackChance: 0.25,
	/** ボス: 範囲攻撃のダメージ */
	areaAttackDamage: 2,
	/** ボス: 範囲攻撃の射程（マンハッタン距離） */
	areaAttackRange: 2,
	/** ボス: 激昂発動のHP閾値（maxHpに対する割合） */
	enrageThreshold: 0.5,
	/** ボス: 激昂時の攻撃ダメージ加算 */
	enrageBonusDamage: 2,
} as const;

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
	trap: 0x9b59b6,
	treasure: 0xccaa44,
	restArea: 0x44aa88,
	// キャラクター
	player: 0x4a8cca,
	// 敵タイプ別カラー
	enemyNormal: 0xca4a4a,
	enemyHeavy: 0x8855aa,
	enemyScout: 0x88cc44,
	enemyMiniboss: 0xdd8833,
	enemyBoss: 0xdd3333,
	// 後方互換（通常敵カラー）
	enemy: 0xca4a4a,
	// スキル予告
	skillPowerStrike: 0xdd8833,
	skillAreaAttack: 0xdd3333,
	// システム（行動ログ等）
	system: 0x888888,
	// デバッグ: 敵AI可視化
	debugMoveCandidate: 0x44aa66,
	debugMoveBest: 0x66ff88,
	debugAttackRange: 0xcc4444,
} as const;
