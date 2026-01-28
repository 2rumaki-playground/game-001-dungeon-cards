/**
 * ゲーム状態の型定義
 * @see docs/spec/mvp/rules.md
 */

import type { DeckState } from "./card";
import type { Enemy, Player } from "./character";
import type { GameMap } from "./map";

/**
 * 画面種別
 */
export type Screen = "title" | "game" | "gameOver";

/**
 * ターン種別
 */
export type Turn = "player" | "enemy";

/**
 * 行動ログエントリ
 */
export type ActionLogEntry = {
	id: string;
	message: string;
	timestamp: number;
};

/**
 * ゲーム状態
 */
export type GameState = {
	/** 現在の画面 */
	screen: Screen;
	/** 現在のターン */
	turn: Turn;
	/** 階層番号 */
	floor: number;
	/** マップ */
	map: GameMap;
	/** プレイヤー */
	player: Player;
	/** 敵リスト */
	enemies: Enemy[];
	/** デッキ状態 */
	deck: DeckState;
	/** 行動ログ */
	actionLog: ActionLogEntry[];
};
