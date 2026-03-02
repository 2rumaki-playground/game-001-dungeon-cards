/**
 * ゲーム定数
 * @see docs/spec/constants.md
 */

import type { CardDropConfig, CardType, EnemyType, Personality } from "./types";

// 手札関連
export const HAND_LIMIT = 4;

// 手札構成
export const INITIAL_DECK = {
	moveCards: 2,
	attackCards: 1,
	waitCards: 1,
} as const;

export const TOTAL_DECK_SIZE =
	INITIAL_DECK.moveCards + INITIAL_DECK.attackCards + INITIAL_DECK.waitCards;

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
	summoner: { hp: 2, attackDamage: 1, moveDistance: 0, senseRange: 5 },
	ranged: {
		hp: 2,
		attackDamage: 1,
		moveDistance: 0,
		senseRange: 6,
		shootRange: 2,
	},
	shielded: { hp: 3, attackDamage: 1, moveDistance: 1, senseRange: 5 },
	miniboss: { hp: 8, attackDamage: 2, moveDistance: 1, senseRange: 7 },
	boss: { hp: 15, attackDamage: 3, moveDistance: 1, senseRange: 10 },
} as const;

// 敵タイプ表示名
export const ENEMY_TYPE_LABEL: Record<EnemyType, string> = {
	normal: "通常敵",
	heavy: "重装敵",
	scout: "俊敏敵",
	summoner: "召喚敵",
	ranged: "射撃敵",
	shielded: "盾持ち敵",
	miniboss: "ミニボス",
	boss: "ボス",
} as const;

// カード種別表示名
export const CARD_TYPE_SYMBOL: Record<CardType, string> = {
	move: "👟",
	attack: "⚔",
	strong_attack: "🔥",
	jump: "🦘",
	wait: "⏳",
};

export const CARD_TYPE_NAME: Record<CardType, string> = {
	move: "移動",
	attack: "攻撃",
	strong_attack: "強攻撃",
	jump: "ジャンプ",
	wait: "待機",
};

// 召喚クールダウン（正典: docs/spec/constants.md）
export const SUMMONER_COOLDOWN = 2;

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
	summoner: number;
	ranged: number;
	shielded: number;
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
		composition: {
			normal: 3,
			heavy: 0,
			scout: 0,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	{
		maxFloor: 4,
		composition: {
			normal: 2,
			heavy: 0,
			scout: 1,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	// 5F: 中ボス階層
	{
		maxFloor: 5,
		composition: {
			normal: 1,
			heavy: 1,
			scout: 0,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 1,
			boss: 0,
		},
	},
	// 中盤（6-9F）
	{
		maxFloor: 6,
		composition: {
			normal: 1,
			heavy: 1,
			scout: 0,
			summoner: 0,
			ranged: 1,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	{
		maxFloor: 9,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 1,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	// 10F: 大ボス階層
	{
		maxFloor: 10,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 1,
		},
	},
	// 後半（11-14F）
	{
		maxFloor: 12,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 1,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	{
		maxFloor: 14,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 1,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	// 15F: 中ボス階層
	{
		maxFloor: 15,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 1,
			boss: 0,
		},
	},
	// 終盤（16-19F）
	{
		maxFloor: 18,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 1,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	{
		maxFloor: 19,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 1,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
	},
	// 20F: 大ボス階層
	{
		maxFloor: 20,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 0,
			shielded: 0,
			miniboss: 0,
			boss: 1,
		},
	},
	// 21F以降（拡張用）
	{
		maxFloor: Infinity,
		composition: {
			normal: 0,
			heavy: 1,
			scout: 1,
			summoner: 0,
			ranged: 1,
			shielded: 0,
			miniboss: 0,
			boss: 0,
		},
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

// カード交換
export const DECK_MAX_SIZE = 4;
export const DECK_MIN_SIZE = 4;
// 敵撃破時カードドロップ確率テーブル（正典: docs/spec/constants.md）
export const CARD_DROP_TABLE: Record<EnemyType, CardDropConfig> = {
	normal: { cardType: "move", dropRate: 0.25 },
	ranged: { cardType: "move", dropRate: 0.25 },
	heavy: { cardType: "strong_attack", dropRate: 0.35 },
	scout: { cardType: "jump", dropRate: 0.35 },
	summoner: { cardType: "wait", dropRate: 0.35 },
	shielded: { cardType: "attack", dropRate: 0.35 },
	miniboss: { cardType: "attack", dropRate: 0.75 },
	boss: { cardType: "wait", dropRate: 1.0 },
};

// 行動ログ
export const ACTION_LOG_LIMIT = 50;

// プレイ統計
export const MAX_PLAY_SESSIONS = 50;

// マップレイアウト（内側の床タイル）
export const FLOOR_AREA_SIZE = 5; // 5x5
export const FLOOR_TILE_COUNT = FLOOR_AREA_SIZE * FLOOR_AREA_SIZE; // 25

// カードレベル
export const CARD_MAX_LEVEL = 5;
/** index = level-1 の値が、そのレベルに到達するのに必要な累計XP */
export const CARD_XP_TABLE = [0, 2, 6, 14, 30] as const;
/** index = level-1 の値が、そのレベルで得られるダメージボーナス */
export const CARD_LEVEL_DAMAGE_BONUS = [0, 1, 1, 2, 3] as const;

// 特殊効果の解放レベル
/** 攻撃カード: 貫通効果の解放レベル */
export const CARD_LEVEL_PIERCE = 3;
/** 攻撃カード: 射程延長の解放レベル */
export const CARD_LEVEL_RANGE_EXTEND = 5;
/** 攻撃カード: 射程延長時の攻撃射程 */
export const ATTACK_EXTENDED_RANGE = 2;
/** 強攻撃カード: ノックバック効果の解放レベル */
export const CARD_LEVEL_KNOCKBACK = 3;
/** 強攻撃カード: 衝撃波効果の解放レベル */
export const CARD_LEVEL_SHOCKWAVE = 5;

// コンボボーナス
export const COMBO_BONUS = {
	charge: 1,
	chain: 1,
	ambush: 2,
	focus: 1,
} as const;

// 特殊タイル効果
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

// 階層別マップサイズ
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

// 階層別敵配置数
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

// 階層別ひび割れ壁配置数
export const CRACKED_WALL_TABLE: {
	maxFloor: number;
	count: number;
}[] = [
	{ maxFloor: 2, count: 0 },
	{ maxFloor: 4, count: 0 },
	{ maxFloor: 6, count: 2 },
	{ maxFloor: 9, count: 3 },
	{ maxFloor: 14, count: 4 },
	{ maxFloor: Infinity, count: 5 },
];

export function getCrackedWallCount(floor: number): number {
	const entry =
		CRACKED_WALL_TABLE.find((e) => floor <= e.maxFloor) ??
		CRACKED_WALL_TABLE[CRACKED_WALL_TABLE.length - 1];
	return entry.count;
}

// BSPマップ生成
export const BSP_MIN_PARTITION_SIZE = 5;
export const BSP_MIN_ROOM_SIZE = 3; // 内部床サイズ（最小幅/高さ）
export const BSP_CORRIDOR_WIDTH = 1;
export const BSP_MAX_DEPTH = 4;
export const BSP_MAX_RETRIES = 10;
export const BSP_MAP_WIDTH = 12; // 内側領域が 2 * BSP_MIN_PARTITION_SIZE 以上（Issue #211で階層別に変更予定）
export const BSP_MAP_HEIGHT = 12;

// ボス特殊スキル
export const BOSS_SKILL = {
	/** ミニボス: 強化攻撃の発動確率 */
	powerStrikeChance: 0.3,
	/** ミニボス: 強化攻撃のダメージ倍率 */
	powerStrikeMultiplier: 1.5,
	/** ボス: 範囲攻撃の発動確率 */
	areaAttackChance: 0.25,
	/** ボス: 範囲攻撃のダメージ */
	areaAttackDamage: 1,
	/** ボス: 範囲攻撃の射程（マンハッタン距離） */
	areaAttackRange: 2,
	/** ボス: 激昂発動のHP閾値（maxHpに対する割合） */
	enrageThreshold: 0.5,
	/** ボス: 激昂時の攻撃ダメージ加算 */
	enrageBonusDamage: 2,
} as const;

// 射撃敵の射程距離（正典: ENEMY_PARAMS.ranged.shootRange）
export const RANGED_SHOOT_RANGE = ENEMY_PARAMS.ranged.shootRange;

// キャラクター性格
export const PERSONALITIES: readonly Personality[] = [
	"brave",
	"cautious",
	"cheerful",
	"stoic",
	"curious",
] as const;
export const DEFAULT_PERSONALITY: Personality = "brave";

// キャラクターカード
export const CHARACTER_CARD_HEIGHT = 80;

// 性格表示ラベル
export const PERSONALITY_LABEL: Record<Personality, string> = {
	brave: "勇敢",
	cautious: "慎重",
	cheerful: "明朗",
	stoic: "寡黙",
	curious: "好奇心旺盛",
} as const;

// 性格シンボル（Unicode記号）
export const PERSONALITY_SYMBOL: Record<Personality, string> = {
	brave: "⚔",
	cautious: "⛊",
	cheerful: "☀",
	stoic: "◆",
	curious: "？",
} as const;

// 性格説明文
export const PERSONALITY_DESCRIPTION: Record<Personality, string> = {
	brave: "力強い、前向きな口調",
	cautious: "用心深い、分析的な口調",
	cheerful: "楽天的、軽い口調",
	stoic: "短文、体言止め",
	curious: "疑問形、探究的な口調",
} as const;

// キャラクタープロフィール
export const PERSONALITY_PROFILE: Record<
	Personality,
	{
		gender: string;
		ageRange: string;
		physicalTraits: string;
		archetype: string;
	}
> = {
	brave: {
		gender: "男性",
		ageRange: "20代前半",
		physicalTraits: "がっしりした体格",
		archetype: "剣士",
	},
	cautious: {
		gender: "女性",
		ageRange: "不詳",
		physicalTraits: "眼鏡",
		archetype: "分析者",
	},
	cheerful: {
		gender: "女性",
		ageRange: "10代後半",
		physicalTraits: "小柄で身軽",
		archetype: "冒険好き",
	},
	stoic: {
		gender: "男性",
		ageRange: "30代",
		physicalTraits: "長身・引き締まった体格",
		archetype: "歴戦の戦士",
	},
	curious: {
		gender: "女性",
		ageRange: "20代",
		physicalTraits: "学者風の装い",
		archetype: "研究者",
	},
} as const;

// リザルト画面
/** ハイライト表示件数（最大） */
export const RESULT_HIGHLIGHT_COUNT = 5;
/** ハイライト表示の最小件数（これ未満ならセクション非表示） */
export const RESULT_HIGHLIGHT_MIN = 3;
/** 同一イベントタイプの最大表示件数 */
export const RESULT_MAX_SAME_TYPE = 2;
/** 瀕死撃破判定のHP割合 */
export const CLOSE_CALL_HP_RATIO = 0.2;
/** カードレベルアップイベント記録の閾値レベル */
export const EVENT_LEVEL_UP_THRESHOLD = 3;

// マイルストーン閾値
export const MILESTONE_DEFEAT_COUNT = 10;

// 発話コンテキスト閾値
export const HP_TENSION_RATIO = 0.75;
export const HP_CRITICAL_RATIO = 0.25;
export const DEEP_FLOOR_THRESHOLD = 5;
export const RARE_SPEECH_RATE = 0.1;

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
	crackedWall: 0x6a5a3a,
	// キャラクター
	player: 0x4a8cca,
	// 敵タイプ別カラー
	enemyNormal: 0xca4a4a,
	enemyHeavy: 0x8855aa,
	enemyScout: 0x88cc44,
	enemySummoner: 0x66aacc,
	enemyRanged: 0x44aacc,
	enemyShielded: 0xaa8844,
	enemyMiniboss: 0xdd8833,
	enemyBoss: 0xdd3333,
	// 後方互換（通常敵カラー）
	enemy: 0xca4a4a,
	// システム（行動ログ等）
	system: 0x888888,
	// デバッグ: 敵AI可視化
	debugMoveCandidate: 0x44aa66,
	debugMoveBest: 0x66ff88,
	debugAttackRange: 0xcc4444,
} as const;
