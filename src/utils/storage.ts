/**
 * セーブ・ロード機能
 * @see docs/spec/mvp/rules.md - セーブとログ
 */

import { getEnemyCount, INITIAL_FLOOR } from "../constants";
import { initCardIdCounterFromDeck } from "../game/deck";
import type { GameState, Room } from "../types";
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
 * remnants をバリデーションし、安全な辞書として再構築
 */
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
 * ゲーム状態を保存
 */
export function saveGame(state: GameState): void {
	if (typeof localStorage === "undefined") return;

	try {
		const saveData = {
			...state,
			rng: state.rng.serialize(),
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

		// screen の検証（reward/victory画面はgameに復帰、撃破数もリセット）
		if (data.screen === "reward" || data.screen === "victory") {
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

		const state: GameState = {
			...data,
			enemies,
			actionLog,
			rooms: sanitizeRooms(data.rooms),
			rng: RNG.deserialize(data.rng),
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
			rewardState: null,
			remnants: sanitizeRemnants(data.remnants),
		};

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
