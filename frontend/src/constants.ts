/**
 * ゲーム定数
 * @see docs/spec/mvp/constants.md
 */

// 行動関連
export const MAX_AP = 3;
export const TURN_START_AP = 3;
export const HAND_LIMIT = 5;

// デッキ構成
export const INITIAL_DECK = {
	moveCards: 8,
	attackCards: 8,
	waitCards: 2,
} as const;

export const TOTAL_DECK_SIZE =
	INITIAL_DECK.moveCards + INITIAL_DECK.attackCards + INITIAL_DECK.waitCards;

// カードAPコスト
export const CARD_COST = {
	move: 1,
	attack: 1,
	wait: 0,
} as const;

// 戦闘
export const PLAYER_INITIAL_HP = 10;
export const ENEMY_HP = 3;
export const PLAYER_ATTACK_DAMAGE = 1;
export const ENEMY_ATTACK_DAMAGE = 1;

// 階層
export const INITIAL_FLOOR = 1;

// マップ
export const MAP_WIDTH = 7;
export const MAP_HEIGHT = 7;
export const STAIRS_COUNT = 1;
export const ENEMY_COUNT = 3;

// 行動ログ
export const ACTION_LOG_LIMIT = 50;

// マップレイアウト（内側の床タイル）
export const FLOOR_AREA_SIZE = 5; // 5x5
export const FLOOR_TILE_COUNT = FLOOR_AREA_SIZE * FLOOR_AREA_SIZE; // 25

// 描画設定
export const CELL_SIZE = 64;
export const CELL_GAP = 4;
export const STATUS_BAR_HEIGHT = 40;

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
	enemy: 0xca4a4a,
} as const;
