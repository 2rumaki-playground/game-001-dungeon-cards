/**
 * プレイ統計のlocalStorage永続化
 * @see docs/spec/constants.md - プレイ統計
 */

import { MAX_PLAY_SESSIONS } from "../constants";
import type { PlaySession } from "../types";

const STATS_KEY = "dungeon-cards-stats";

/**
 * セッションデータのバリデーション
 */
function isValidSession(value: unknown): value is PlaySession {
	if (value == null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const s = value as Record<string, unknown>;

	if (
		typeof s.id !== "string" ||
		typeof s.startedAt !== "number" ||
		typeof s.endedAt !== "number" ||
		typeof s.maxFloor !== "number" ||
		!(s.result === "clear" || s.result === "death") ||
		typeof s.totalDamageDealt !== "number" ||
		typeof s.totalDamageTaken !== "number" ||
		typeof s.turnCount !== "number"
	) {
		return false;
	}

	const deathCause = s.deathCause;
	if (
		deathCause !== null &&
		deathCause !== "enemy_attack" &&
		deathCause !== "trap" &&
		deathCause !== "unknown"
	) {
		return false;
	}

	const cardUsage = s.cardUsage as unknown;
	if (
		cardUsage == null ||
		typeof cardUsage !== "object" ||
		Array.isArray(cardUsage)
	) {
		return false;
	}
	for (const key of Object.keys(cardUsage as Record<string, unknown>)) {
		const v = (cardUsage as Record<string, unknown>)[key];
		if (typeof v !== "number") {
			return false;
		}
	}

	return true;
}

/**
 * 全セッションを読み込む
 */
export function loadPlaySessions(): PlaySession[] {
	if (typeof localStorage === "undefined") return [];

	const json = localStorage.getItem(STATS_KEY);
	if (!json) return [];

	try {
		const data = JSON.parse(json);
		if (!Array.isArray(data)) return [];
		return data.filter(isValidSession);
	} catch (e) {
		console.error("Failed to load play sessions", e);
		return [];
	}
}

/**
 * セッションを追加保存（上限超過時は古いものを削除）
 */
export function savePlaySession(session: PlaySession): void {
	if (typeof localStorage === "undefined") return;

	try {
		const sessions = loadPlaySessions();
		sessions.push(session);
		// 上限超過時は古いものから削除
		while (sessions.length > MAX_PLAY_SESSIONS) {
			sessions.shift();
		}
		localStorage.setItem(STATS_KEY, JSON.stringify(sessions));
	} catch (e) {
		console.error("Failed to save play session", e);
	}
}

/**
 * 全セッションを削除
 */
export function clearPlaySessions(): void {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(STATS_KEY);
}
