/**
 * ゲーム状態管理
 * @see docs/spec/mvp/rules.md
 */

import { INITIAL_FLOOR, MAX_AP, PLAYER_INITIAL_HP } from "../constants";
import type {
	ActionLogEntry,
	DeckState,
	Enemy,
	GameMap,
	GameState,
	Player,
	Screen,
	Turn,
} from "../types";
import { RNG } from "../utils/rng";

/**
 * 初期プレイヤー状態を作成
 */
export function createInitialPlayer(): Player {
	return {
		position: { x: 0, y: 0 }, // 実際の位置はマップ生成時に設定
		hp: PLAYER_INITIAL_HP,
		maxHp: PLAYER_INITIAL_HP,
		ap: MAX_AP,
		maxAp: MAX_AP,
	};
}

/**
 * 空のデッキ状態を作成
 */
export function createEmptyDeckState(): DeckState {
	return {
		drawPile: [],
		hand: [],
		discardPile: [],
	};
}

/**
 * 空のマップを作成
 */
export function createEmptyMap(): GameMap {
	return [];
}

/**
 * タイトル画面の初期状態を作成
 */
export function createTitleScreenState(seed?: number): GameState {
	return {
		screen: "title",
		turn: "player",
		floor: INITIAL_FLOOR,
		map: createEmptyMap(),
		player: createInitialPlayer(),
		enemies: [],
		deck: createEmptyDeckState(),
		actionLog: [],
		rng: new RNG(seed),
	};
}

/**
 * 画面を変更
 */
export function changeScreen(state: GameState, screen: Screen): GameState {
	return { ...state, screen };
}

/**
 * ターンを変更
 */
export function changeTurn(state: GameState, turn: Turn): GameState {
	return { ...state, turn };
}

/**
 * 階層を設定
 */
export function setFloor(state: GameState, floor: number): GameState {
	return { ...state, floor };
}

/**
 * マップを設定
 */
export function setMap(state: GameState, map: GameMap): GameState {
	return { ...state, map };
}

/**
 * プレイヤーを更新
 */
export function updatePlayer(
	state: GameState,
	updater: (player: Player) => Player,
): GameState {
	return { ...state, player: updater(state.player) };
}

/**
 * 敵リストを設定
 */
export function setEnemies(state: GameState, enemies: Enemy[]): GameState {
	return { ...state, enemies };
}

/**
 * 敵を更新
 */
export function updateEnemy(
	state: GameState,
	enemyId: string,
	updater: (enemy: Enemy) => Enemy,
): GameState {
	return {
		...state,
		enemies: state.enemies.map((e) => (e.id === enemyId ? updater(e) : e)),
	};
}

/**
 * 敵を削除
 */
export function removeEnemy(state: GameState, enemyId: string): GameState {
	return {
		...state,
		enemies: state.enemies.filter((e) => e.id !== enemyId),
	};
}

/**
 * デッキ状態を設定
 */
export function setDeck(state: GameState, deck: DeckState): GameState {
	return { ...state, deck };
}

/**
 * 行動ログを追加
 */
export function addActionLog(
	state: GameState,
	message: string,
	maxEntries = 50,
): GameState {
	const entry: ActionLogEntry = {
		id: crypto.randomUUID(),
		message,
		timestamp: Date.now(),
	};
	const newLog = [entry, ...state.actionLog].slice(0, maxEntries);
	return { ...state, actionLog: newLog };
}

/**
 * 行動ログをクリア
 */
export function clearActionLog(state: GameState): GameState {
	return { ...state, actionLog: [] };
}
