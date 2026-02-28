/**
 * セーブ・ロード機能
 * @see docs/spec/mvp/rules.md - セーブとログ
 */

import { getEnemyCount, INITIAL_FLOOR } from "../constants";
import { createInitialCounters } from "../game/cardAcquisition";
import { initCardIdCounterFromDeck } from "../game/deck";
import type {
	AcquisitionCounters,
	DeckState,
	GameState,
	Room,
	SpeechEventType,
	SpeechLogEntry,
} from "../types";
import { RNG } from "./rng";

const SAVE_KEY = "dungeon-cards-save";

const COORDINATE_KEY_PATTERN = /^\d+,\d+$/;

/**
 * rooms をバリデーションし、不正な要素を除外して安全な配列として再構築
 */
function sanitizeRooms(raw: unknown): Room[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item): Room[] => {
		if (item == null || typeof item !== "object") return [];
		const { x, y, width, height } = item as Record<string, unknown>;
		if (
			!Number.isInteger(x) ||
			(x as number) < 0 ||
			!Number.isInteger(y) ||
			(y as number) < 0 ||
			!Number.isInteger(width) ||
			(width as number) <= 0 ||
			!Number.isInteger(height) ||
			(height as number) <= 0
		) {
			return [];
		}
		return [
			{
				x: x as number,
				y: y as number,
				width: width as number,
				height: height as number,
			},
		];
	});
}

/**
 * acquisitionCounters のバリデーションに使用する敵タイプ一覧
 */
const ENEMY_TYPES = ["normal", "heavy", "scout", "miniboss", "boss"] as const;

/**
 * acquisitionCounters をバリデーションし、不正なら初期値にフォールバック
 */
function sanitizeAcquisitionCounters(raw: unknown): AcquisitionCounters {
	if (raw == null || typeof raw !== "object") return createInitialCounters();
	const data = raw as Record<string, unknown>;

	if (
		data.defeatCounts == null ||
		typeof data.defeatCounts !== "object" ||
		data.hitCounts == null ||
		typeof data.hitCounts !== "object"
	) {
		return createInitialCounters();
	}

	const defeatCounts = data.defeatCounts as Record<string, unknown>;
	const hitCounts = data.hitCounts as Record<string, unknown>;

	for (const key of ENEMY_TYPES) {
		const d = defeatCounts[key];
		const h = hitCounts[key];
		if (
			typeof d !== "number" ||
			!Number.isFinite(d) ||
			d < 0 ||
			typeof h !== "number" ||
			!Number.isFinite(h) ||
			h < 0
		) {
			return createInitialCounters();
		}
	}

	const initial = createInitialCounters();
	return {
		defeatCounts: Object.fromEntries(
			ENEMY_TYPES.map((k) => [k, Math.floor(defeatCounts[k] as number)]),
		) as typeof initial.defeatCounts,
		hitCounts: Object.fromEntries(
			ENEMY_TYPES.map((k) => [k, Math.floor(hitCounts[k] as number)]),
		) as typeof initial.hitCounts,
	};
}

function sanitizeRemnants(raw: unknown): Record<string, number> {
	const result: Record<string, number> = Object.create(null);
	if (raw == null || typeof raw !== "object") return result;
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!COORDINATE_KEY_PATTERN.test(key)) continue;
		const num = Number(value);
		if (Number.isFinite(num) && num >= 0) {
			result[key] = Math.floor(num);
		}
	}
	return result;
}

/**
 * visitedTiles をバリデーションし、安全なSetとして再構築
 */
function sanitizeVisitedTiles(raw: unknown): Set<string> {
	if (!Array.isArray(raw)) return new Set<string>();
	const result = new Set<string>();
	for (const item of raw) {
		if (typeof item === "string" && COORDINATE_KEY_PATTERN.test(item)) {
			result.add(item);
		}
	}
	return result;
}

/**
 * 旧セーブデータ用: マップ全体を訪問済みとするSetを生成
 */
function createFullyVisitedTiles(map: unknown): Set<string> {
	const result = new Set<string>();
	if (!Array.isArray(map)) return result;
	for (let y = 0; y < map.length; y++) {
		const row = map[y];
		if (!Array.isArray(row)) continue;
		for (let x = 0; x < row.length; x++) {
			result.add(`${x},${y}`);
		}
	}
	return result;
}

/**
 * speechLog をバリデーションし、不正なら null にフォールバック
 */
const VALID_SPEECH_EVENT_TYPES: ReadonlySet<SpeechEventType> = new Set([
	"move_success",
	"move_fail",
	"attack_miss",
	"combo_activated",
	"enemy_defeated",
	"damage_taken",
	"game_over",
	"trap_triggered",
	"treasure_found",
	"rest_area_used",
	"floor_reached",
	"jump_success",
]);

function sanitizeSpeechLog(raw: unknown): SpeechLogEntry | null {
	if (raw == null || typeof raw !== "object") return null;
	const data = raw as Record<string, unknown>;
	if (
		typeof data.message !== "string" ||
		typeof data.eventType !== "string" ||
		!VALID_SPEECH_EVENT_TYPES.has(data.eventType as SpeechEventType) ||
		typeof data.timestamp !== "number" ||
		!Number.isFinite(data.timestamp) ||
		data.timestamp < 0
	) {
		return null;
	}
	return raw as SpeechLogEntry;
}

/**
 * ゲーム状態を保存
 */
export function saveGame(state: GameState): void {
	if (typeof localStorage === "undefined") return;

	try {
		const saveData = {
			...state,
			rng: state.rng.serialize(),
			visitedTiles: Array.from(state.visitedTiles),
		};
		localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
	} catch (e) {
		console.error("Failed to save game state", e);
	}
}

/**
 * ゲーム状態を読み込み
 */
export function loadGame(): GameState | null {
	if (typeof localStorage === "undefined") return null;

	const json = localStorage.getItem(SAVE_KEY);
	if (!json) return null;

	try {
		const data = JSON.parse(json);

		// 必須プロパティの検証
		if (
			typeof data.floor !== "number" ||
			!Number.isFinite(data.floor) ||
			!Number.isInteger(data.floor) ||
			data.floor < INITIAL_FLOOR ||
			!data.player ||
			typeof data.player.hp !== "number" || // 最低限の構造チェック
			!data.rng ||
			typeof data.rng.seed !== "number" ||
			typeof data.rng.state !== "number"
		) {
			console.warn("Invalid save data format: missing required properties");
			return null;
		}

		// screen の検証（victory/exchange画面はgameに復帰、撃破数もリセット）
		if (data.screen === "victory" || data.screen === "exchange") {
			data.screen = "game";
			data.defeatedEnemyCount = 0;
		}
		if (
			data.screen !== "title" &&
			data.screen !== "game" &&
			data.screen !== "gameOver"
		) {
			console.warn(`Invalid screen value: ${data.screen}`);
			return null;
		}

		// 旧セーブデータの後方互換: type未設定の敵に"normal"を補完
		const enemies = Array.isArray(data.enemies)
			? data.enemies.map((e: Record<string, unknown>) => ({
					...e,
					type: e.type ?? "normal",
				}))
			: data.enemies;

		// 旧セーブデータの後方互換: usedCardIdsが未設定の場合は空配列を補完
		if (data.deck && typeof data.deck === "object") {
			if (!Array.isArray(data.deck.usedCardIds)) {
				data.deck.usedCardIds = [];
			}
		}

		// 旧セーブデータの後方互換:
		// - actor 未設定または不正値のログに "system" を補完
		// - actionLog が配列でない場合は空配列にフォールバック
		const actionLog = Array.isArray(data.actionLog)
			? data.actionLog
					.filter(
						(entry: unknown): entry is Record<string, unknown> =>
							entry != null &&
							typeof entry === "object" &&
							!Array.isArray(entry),
					)
					.map((entry: Record<string, unknown>) => {
						const actorValue = (entry as { actor?: unknown }).actor;
						const validActor =
							actorValue === "player" ||
							actorValue === "enemy" ||
							actorValue === "system"
								? actorValue
								: "system";
						return {
							...entry,
							actor: validActor,
						};
					})
			: [];

		// 旧セーブデータ互換: visitedTilesがない場合はマップ全体を訪問済みに
		const visitedTiles = Array.isArray(data.visitedTiles)
			? sanitizeVisitedTiles(data.visitedTiles)
			: createFullyVisitedTiles(data.map);

		const state: GameState = {
			...data,
			enemies,
			actionLog,
			rooms: sanitizeRooms(data.rooms),
			rng: RNG.deserialize(data.rng),
			visitedTiles,
			isCleared: data.isCleared === true,
			defeatedEnemyCount:
				typeof data.defeatedEnemyCount === "number" &&
				Number.isFinite(data.defeatedEnemyCount) &&
				data.defeatedEnemyCount >= 0
					? Math.min(
							Math.floor(data.defeatedEnemyCount),
							getEnemyCount(data.floor),
						)
					: 0,
			remnants: sanitizeRemnants(data.remnants),
			acquisitionCounters: sanitizeAcquisitionCounters(
				data.acquisitionCounters,
			),
			cardExchangeState: null,
			comboHistory: null,
			speechLog: sanitizeSpeechLog(data.speechLog),
		};

		// 旧セーブデータ互換: 3ゾーン形式のデッキを手札形式に変換
		if (
			state.deck &&
			(Array.isArray((state.deck as Record<string, unknown>).drawPile) ||
				Array.isArray((state.deck as Record<string, unknown>).discardPile))
		) {
			const oldDeck = state.deck as Record<string, unknown>;
			const drawPile = Array.isArray(oldDeck.drawPile) ? oldDeck.drawPile : [];
			const hand = Array.isArray(oldDeck.hand) ? oldDeck.hand : [];
			const discardPile = Array.isArray(oldDeck.discardPile)
				? oldDeck.discardPile
				: [];
			state.deck = {
				hand: [...drawPile, ...hand, ...discardPile],
				usedCardIds: [],
			} as DeckState;
		}

		// カードIDカウンターをデッキの最大IDで初期化
		if (state.deck) {
			initCardIdCounterFromDeck(state.deck);
		}

		return state;
	} catch (e) {
		console.error("Failed to load save data", e);
		return null;
	}
}

/**
 * セーブデータが存在するか確認
 */
export function hasSaveData(): boolean {
	if (typeof localStorage === "undefined") return false;
	return localStorage.getItem(SAVE_KEY) !== null;
}

/**
 * セーブデータを削除
 */
export function deleteSaveData(): void {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(SAVE_KEY);
}
