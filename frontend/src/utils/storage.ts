/**
 * セーブ・ロード機能
 * @see docs/spec/mvp/rules.md - セーブとログ
 */

import type { GameState } from "../types";
import { RNG } from "./rng";

const SAVE_KEY = "dungeon-cards-save";

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
			!data.player ||
			typeof data.player.hp !== "number" || // 最低限の構造チェック
			!data.rng ||
			typeof data.rng.seed !== "number" ||
			typeof data.rng.state !== "number"
		) {
			console.warn("Invalid save data format: missing required properties");
			return null;
		}

		// screen の検証
		if (
			data.screen !== "title" &&
			data.screen !== "game" &&
			data.screen !== "gameOver"
		) {
			console.warn(`Invalid screen value: ${data.screen}`);
			return null;
		}

		return {
			...data,
			rng: RNG.deserialize(data.rng),
		};
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
