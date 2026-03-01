/**
 * ゲーム状態管理
 * @see docs/spec/mvp/rules.md
 */

import {
	ACTION_LOG_LIMIT,
	DEFAULT_PERSONALITY,
	ENEMY_PARAMS,
	getEnemyComposition,
	INITIAL_FLOOR,
	PERSONALITIES,
	PLAYER_INITIAL_HP,
	SUMMONER_COOLDOWN,
} from "../constants";
import type {
	ActionLogEntry,
	ComboHistory,
	DeckState,
	Enemy,
	EnemyType,
	GameMap,
	GameState,
	LogActor,
	Player,
	Position,
	Screen,
	SpeechEventType,
	Tile,
	Turn,
} from "../types";
import { RNG } from "../utils/rng";
import { createInitialCounters } from "./cardAcquisition";
import { createInitialDeckState } from "./deck";
import { createEmptyVisitedTiles, revealAtPosition } from "./fogOfWar";
import { generateMapPlacement } from "./map";
import { positionToKey } from "./positionUtils";

const cloneRng = (rng: RNG): RNG => rng.clone();

/**
 * 指定座標に撃破残骸を追加
 */
export function addRemnant(state: GameState, position: Position): GameState {
	const key = positionToKey(position);
	const rawCurrent = state.remnants?.[key];
	const numericCurrent = Number(rawCurrent);
	const current =
		Number.isFinite(numericCurrent) && numericCurrent >= 0
			? Math.floor(numericCurrent)
			: 0;
	const newRemnants: typeof state.remnants = Object.assign(
		Object.create(null),
		state.remnants,
	);
	newRemnants[key] = current + 1;
	return {
		...state,
		remnants: newRemnants,
		rng: cloneRng(state.rng),
	};
}

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
		...Array<EnemyType>(composition.summoner).fill("summoner"),
	];
	return positions.map((position, index) => {
		const type = types[index] ?? "normal";
		const { hp } = ENEMY_PARAMS[type];
		const enemy: Enemy = {
			id: `enemy-${index + 1}`,
			type,
			position,
			hp,
			maxHp: hp,
		};
		if (type === "summoner") {
			enemy.summonCooldown = SUMMONER_COOLDOWN;
		}
		return enemy;
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
	};
}

/**
 * 空のデッキ状態を作成
 */
export function createEmptyDeckState(): DeckState {
	return {
		hand: [],
		usedCardIds: [],
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
		rooms: [],
		player: createInitialPlayer(),
		enemies: [],
		deck: createEmptyDeckState(),
		actionLog: [],
		rng: new RNG(seed),
		defeatedEnemyCount: 0,
		isCleared: false,
		remnants: {},
		visitedTiles: createEmptyVisitedTiles(),
		lastAttackerEnemyType: null,
		acquisitionCounters: createInitialCounters(),
		cardExchangeState: null,
		comboHistory: null,
		personality: DEFAULT_PERSONALITY,
		speechLog: null,
		achievedMilestones: new Set(),
		pendingMilestone: null,
	};
}

/**
 * ゲーム画面の初期状態を作成
 */
export function createInitialGameState(
	seed?: number,
	floor: number = INITIAL_FLOOR,
): GameState {
	const rng = new RNG(seed);
	const normalizedFloor = Number.isFinite(floor)
		? Math.floor(floor)
		: INITIAL_FLOOR;
	const safeFloor = Math.max(INITIAL_FLOOR, normalizedFloor);
	const { map, rooms, player, enemies } = generateMapPlacement(rng, safeFloor);
	const initialPlayer = createInitialPlayer();

	const personality =
		PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];

	return {
		screen: "game",
		turn: "player",
		floor: safeFloor,
		map,
		rooms,
		player: { ...initialPlayer, position: player },
		enemies: createEnemiesForFloor(enemies, safeFloor),
		deck: createEmptyDeckState(),
		actionLog: [],
		rng,
		defeatedEnemyCount: 0,
		isCleared: false,
		remnants: {},
		visitedTiles: revealAtPosition(
			createEmptyVisitedTiles(),
			player,
			rooms,
			map,
		),
		lastAttackerEnemyType: null,
		acquisitionCounters: createInitialCounters(),
		cardExchangeState: null,
		comboHistory: null,
		personality,
		speechLog: null,
		achievedMilestones: new Set(),
		pendingMilestone: null,
	};
}

/**
 * タイトル画面から新規ゲームを開始
 */
export function startNewGame(state: GameState): GameState {
	const gameState = createInitialGameState(state.rng.seed);
	const deck = createInitialDeckState();
	return { ...gameState, deck };
}

/**
 * 指定階層から新規ゲームを開始（デバッグ用）
 */
export function startNewGameAtFloor(
	state: GameState,
	floor: number,
): GameState {
	const gameState = createInitialGameState(state.rng.seed, floor);
	const deck = createInitialDeckState();
	return { ...gameState, deck };
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
 * 訪問済みタイルを設定
 */
export function setVisitedTiles(
	state: GameState,
	visitedTiles: Set<string>,
): GameState {
	return { ...state, visitedTiles, rng: cloneRng(state.rng) };
}

/**
 * コンボ履歴を更新
 */
export function updateComboHistory(
	state: GameState,
	history: ComboHistory | null,
): GameState {
	return { ...state, comboHistory: history, rng: cloneRng(state.rng) };
}

/**
 * 行動ログを追加
 */
export function addActionLog(
	state: GameState,
	message: string,
	actor: LogActor = "system",
	maxEntries = ACTION_LOG_LIMIT,
): GameState {
	const entry: ActionLogEntry = {
		id: crypto.randomUUID(),
		actor,
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

/**
 * 発話ログを設定
 */
export function setSpeechLog(
	state: GameState,
	eventType: SpeechEventType,
	message: string,
): GameState {
	return {
		...state,
		speechLog: { message, eventType, timestamp: Date.now() },
		rng: cloneRng(state.rng),
	};
}

/**
 * 発話ログをクリア
 */
export function clearSpeechLog(state: GameState): GameState {
	return { ...state, speechLog: null, rng: cloneRng(state.rng) };
}
