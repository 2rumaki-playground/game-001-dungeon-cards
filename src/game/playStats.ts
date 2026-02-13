/**
 * プレイ統計アキュムレータ
 *
 * モジュールレベル変数で進行中のセッションを保持する。
 * GameStateとは独立して統計を蓄積し、セッション終了時にPlaySessionとして返却する。
 */

import type { CardType, DeathCause, PlayResult, PlaySession } from "../types";

/** 進行中のセッションデータ（内部用） */
type SessionAccumulator = {
	id: string;
	startedAt: number;
	maxFloor: number;
	cardUsage: Record<CardType, number>;
	totalDamageDealt: number;
	totalDamageTaken: number;
	turnCount: number;
};

let currentSession: SessionAccumulator | null = null;

/** 簡易ランID生成 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * セッション開始
 * @param initialFloor 開始時点の階層（デバッグ開始・途中再開時に指定）
 */
export function startSession(initialFloor = 1): void {
	currentSession = {
		id: generateId(),
		startedAt: Date.now(),
		maxFloor: initialFloor,
		cardUsage: { move: 0, attack: 0, strong_attack: 0, jump: 0, wait: 0 },
		totalDamageDealt: 0,
		totalDamageTaken: 0,
		turnCount: 0,
	};
}

/**
 * カード使用回数を記録
 */
export function recordCardUsage(cardType: CardType): void {
	if (!currentSession) return;
	currentSession.cardUsage[cardType]++;
}

/**
 * 与ダメージ累計を記録
 */
export function recordDamageDealt(damage: number): void {
	if (!currentSession) return;
	currentSession.totalDamageDealt += damage;
}

/**
 * 被ダメージ累計を記録
 */
export function recordDamageTaken(damage: number): void {
	if (!currentSession) return;
	currentSession.totalDamageTaken += damage;
}

/**
 * 到達階層を更新（最大値のみ保持）
 */
export function recordFloorReached(floor: number): void {
	if (!currentSession) return;
	if (floor > currentSession.maxFloor) {
		currentSession.maxFloor = floor;
	}
}

/**
 * ターン終了を記録
 */
export function recordTurnEnd(): void {
	if (!currentSession) return;
	currentSession.turnCount++;
}

/**
 * セッション終了し、PlaySessionを返却
 * セッション未開始時はnullを返す
 */
export function endSession(
	result: PlayResult,
	deathCause: DeathCause | null,
): PlaySession | null {
	if (!currentSession) return null;

	const session: PlaySession = {
		...currentSession,
		endedAt: Date.now(),
		result,
		deathCause,
	};

	currentSession = null;
	return session;
}

/**
 * セッションをリセット（テスト用）
 */
export function resetSession(): void {
	currentSession = null;
}

/**
 * 現在のセッション情報を取得（テスト用）
 */
export function getCurrentSession(): SessionAccumulator | null {
	return currentSession;
}
