/**
 * ゲーム状態の型定義
 * @see docs/spec/mvp/rules.md
 */

import type { RNG } from "../utils/rng";
import type { CardType, DeckState } from "./card";
import type { Enemy, Player } from "./character";
import type { GameMap, Room } from "./map";

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
 * 行動ログの主体
 */
export type LogActor = "player" | "enemy" | "system";

/**
 * 行動ログエントリ
 */
export type ActionLogEntry = {
	id: string;
	actor: LogActor;
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
	/** 部屋情報（BSPマップ生成時に保持、非BSPマップでは空配列） */
	rooms: Room[];
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
	/** ゲームクリア済みフラグ（クリア階層（CLEAR_FLOOR）のボス撃破） */
	isCleared: boolean;
	/** 敵撃破の残骸情報（key: "x,y" 形式の座標、value: 撃破数） */
	remnants: Record<string, number>;
	/** 訪問済みタイル座標（"x,y" 形式のSet） */
	visitedTiles: Set<string>;
};
