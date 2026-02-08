/**
 * ゲーム状態の型定義
 * @see docs/spec/mvp/rules.md
 */

import type { RNG } from "../utils/rng";
import type { CardType, DeckState } from "./card";
import type { Enemy, Player } from "./character";
import type { GameMap } from "./map";

/**
 * 画面種別
 */
export type Screen = "title" | "game" | "gameOver" | "reward" | "victory";

/**
 * 報酬画面の状態
 * @see docs/spec/deckbuilding.md
 */
export type RewardState = {
	/** 撃破数分のカード選択肢 */
	choices: CardType[];
};

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
	/** 乱数生成器 */
	rng: RNG;
	/** このフロアで撃破した敵の数 */
	defeatedEnemyCount: number;
	/** 報酬画面の状態（null = 報酬画面ではない） */
	rewardState: RewardState | null;
	/** ゲームクリア済みフラグ（20Fボス撃破） */
	isCleared: boolean;
};
