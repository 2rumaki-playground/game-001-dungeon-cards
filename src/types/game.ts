/**
 * ゲーム状態の型定義
 * @see docs/spec/mvp/rules.md
 */

import type { RNG } from "../utils/rng";
import type { DeckState } from "./card";
import type { AcquisitionCounters, CardExchangeEntry } from "./cardAcquisition";
import type { Enemy, EnemyType, Player } from "./character";
import type { ComboHistory } from "./combo";
import type { GameMap, Room } from "./map";
import type { RunEvent } from "./result";

/**
 * マイルストーン種別一覧（Single Source of Truth）
 */
export const ALL_MILESTONES = [
	"first_defeat",
	"ten_defeats",
	"first_trap",
	"last_word",
	"first_floor_clear",
] as const;

/**
 * マイルストーン種別
 */
export type MilestoneType = (typeof ALL_MILESTONES)[number];

/**
 * キャラクター性格タイプ
 */
export type Personality =
	| "brave"
	| "cautious"
	| "cheerful"
	| "stoic"
	| "curious";

/**
 * 発話イベント種別
 */
export type SpeechEventType =
	| "move_success"
	| "move_fail"
	| "attack_miss"
	| "combo_activated"
	| "enemy_defeated"
	| "damage_taken"
	| "game_over"
	| "trap_triggered"
	| "treasure_found"
	| "rest_area_used"
	| "floor_reached"
	| "jump_success"
	| "card_acquired"
	| "card_skipped"
	| "body_slam";

/**
 * 発話ログエントリ
 */
export type SpeechLogEntry = {
	message: string;
	eventType: SpeechEventType;
	timestamp: number;
};

/**
 * 画面種別
 */
export type Screen = "title" | "game" | "gameOver" | "exchange" | "victory";

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
	/** ゲームクリア済みフラグ（クリア階層（CLEAR_FLOOR）のボス撃破） */
	isCleared: boolean;
	/** 敵撃破の残骸情報（key: "x,y" 形式の座標、value: 撃破数） */
	remnants: Record<string, number>;
	/** 訪問済みタイル座標（"x,y" 形式のSet） */
	visitedTiles: Set<string>;
	/** 最後に攻撃した敵のタイプ（死因追跡用） */
	lastAttackerEnemyType?: EnemyType | null;
	/** カード獲得条件のカウンター（ランごとに累計） */
	acquisitionCounters: AcquisitionCounters;
	/** カード交換キュー（敵撃破時のドロップ当選分を蓄積） */
	cardExchangeQueue: CardExchangeEntry[];
	/** ターン内カード使用履歴（コンボ判定用、ターン開始時にnullリセット） */
	comboHistory: ComboHistory | null;
	/** キャラクター性格タイプ */
	personality: Personality;
	/** キャラクター発話ログ（最新1件のみ保持） */
	speechLog: SpeechLogEntry | null;
	/** 達成済みマイルストーン */
	achievedMilestones: Set<MilestoneType>;
	/** 発話保留中のマイルストーン（連続発話等でスキップされた場合に次回優先表示） */
	pendingMilestone: MilestoneType | null;
	/** ランイベントログ（リザルト画面のハイライト用） */
	eventLog: RunEvent[];
};
