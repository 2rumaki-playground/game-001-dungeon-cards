/**
 * ゲーム状態管理
 * @see docs/spec/mvp/rules.md
 */

import {
	ENEMY_PARAMS,
	getEnemyComposition,
	INITIAL_FLOOR,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import type {
	ActionLogEntry,
	DeckState,
	Enemy,
	EnemyType,
	GameMap,
	GameState,
	Player,
	Position,
	Screen,
	Tile,
	Turn,
} from "../types";
import { RNG } from "../utils/rng";
import { createInitialDeckState, drawCards } from "./deck";
import { generateMapPlacement } from "./map";

const cloneRng = (rng: RNG): RNG => rng.clone();

/**
 * 座標リストから敵リストを生成
 */
export function createEnemiesFromPositions(
	positions: Position[],
	type: EnemyType = "normal",
): Enemy[] {
	const { hp } = ENEMY_PARAMS[type];
	return positions.map((position, index) => ({
		id: `enemy-${index + 1}`,
		type,
		position,
		hp,
		maxHp: hp,
	}));
}

/**
 * 階層に応じた敵リストを生成
 */
export function createEnemiesForFloor(
	positions: Position[],
	floor: number,
): Enemy[] {
	const composition = getEnemyComposition(floor);
	const types: EnemyType[] = [
		...Array<EnemyType>(composition.boss).fill("boss"),
		...Array<EnemyType>(composition.miniboss).fill("miniboss"),
		...Array<EnemyType>(composition.normal).fill("normal"),
		...Array<EnemyType>(composition.heavy).fill("heavy"),
		...Array<EnemyType>(composition.scout).fill("scout"),
	];
	return positions.map((position, index) => {
		const type = types[index] ?? "normal";
		const { hp } = ENEMY_PARAMS[type];
		return { id: `enemy-${index + 1}`, type, position, hp, maxHp: hp };
	});
}

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
		defeatedEnemyCount: 0,
		rewardState: null,
		isCleared: false,
	};
}

/**
 * ゲーム画面の初期状態を作成
 */
export function createInitialGameState(seed?: number): GameState {
	const rng = new RNG(seed);
	const { map, player, enemies } = generateMapPlacement(rng, INITIAL_FLOOR);
	const initialPlayer = createInitialPlayer();

	return {
		screen: "game",
		turn: "player",
		floor: INITIAL_FLOOR,
		map,
		player: { ...initialPlayer, position: player },
		enemies: createEnemiesForFloor(enemies, INITIAL_FLOOR),
		deck: createEmptyDeckState(),
		actionLog: [],
		rng,
		defeatedEnemyCount: 0,
		rewardState: null,
		isCleared: false,
	};
}

/**
 * タイトル画面から新規ゲームを開始
 */
export function startNewGame(state: GameState): GameState {
	const gameState = createInitialGameState(state.rng.seed);
	const deck = createInitialDeckState(gameState.rng);
	const deckWithHand = drawCards(deck, gameState.rng);
	return { ...gameState, deck: deckWithHand };
}

/**
 * ゲームオーバー画面からタイトル画面に戻る
 */
export function returnToTitle(_state: GameState): GameState {
	return createTitleScreenState();
}

/**
 * 画面を変更
 */
export function changeScreen(state: GameState, screen: Screen): GameState {
	return { ...state, screen, rng: cloneRng(state.rng) };
}

/**
 * ターンを変更
 */
export function changeTurn(state: GameState, turn: Turn): GameState {
	return { ...state, turn, rng: cloneRng(state.rng) };
}

/**
 * 階層を設定
 */
export function setFloor(state: GameState, floor: number): GameState {
	return { ...state, floor, rng: cloneRng(state.rng) };
}

/**
 * マップを設定
 */
export function setMap(state: GameState, map: GameMap): GameState {
	return { ...state, map, rng: cloneRng(state.rng) };
}

/**
 * 指定座標のタイルを更新（イミュータブル）
 */
export function setTile(
	state: GameState,
	x: number,
	y: number,
	tile: Tile,
): GameState {
	const newMap = state.map.map((row, ry) =>
		ry === y ? row.map((t, rx) => (rx === x ? tile : t)) : row,
	);
	return { ...state, map: newMap, rng: cloneRng(state.rng) };
}

/**
 * プレイヤーを更新
 */
export function updatePlayer(
	state: GameState,
	updater: (player: Player) => Player,
): GameState {
	return { ...state, player: updater(state.player), rng: cloneRng(state.rng) };
}

/**
 * 敵リストを設定
 */
export function setEnemies(state: GameState, enemies: Enemy[]): GameState {
	return { ...state, enemies, rng: cloneRng(state.rng) };
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
		rng: cloneRng(state.rng),
	};
}

/**
 * 敵を削除
 */
export function removeEnemy(state: GameState, enemyId: string): GameState {
	return {
		...state,
		enemies: state.enemies.filter((e) => e.id !== enemyId),
		rng: cloneRng(state.rng),
	};
}

/**
 * デッキ状態を設定
 */
export function setDeck(state: GameState, deck: DeckState): GameState {
	return { ...state, deck, rng: cloneRng(state.rng) };
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
	return { ...state, actionLog: newLog, rng: cloneRng(state.rng) };
}

/**
 * 行動ログをクリア
 */
export function clearActionLog(state: GameState): GameState {
	return { ...state, actionLog: [], rng: cloneRng(state.rng) };
}
