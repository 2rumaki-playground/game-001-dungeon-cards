/**
 * リザルト画面データ組み立て
 */

import {
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	ENEMY_TYPE_LABEL,
	RESULT_HIGHLIGHT_COUNT,
	RESULT_HIGHLIGHT_MIN,
	RESULT_MAX_SAME_TYPE,
} from "../constants";
import type {
	Card,
	GameState,
	HighlightEntry,
	ResultData,
	RunEvent,
	RunEventType,
} from "../types";
import { getCurrentSession } from "./playStats";

/**
 * イベントのスコア算出
 */
function scoreEvent(event: RunEvent): number {
	switch (event.type) {
		case "boss_defeated":
			return 100;
		case "miniboss_defeated":
			return 80;
		case "close_call_defeat":
			return 70;
		case "card_level_up":
			return 40 + event.detail.newLevel * 5;
		case "card_acquired":
			return 30;
	}
}

/**
 * イベントの表示テキスト生成
 */
export function formatHighlight(event: RunEvent): string {
	switch (event.type) {
		case "boss_defeated":
			return `${event.floor}F: ${ENEMY_TYPE_LABEL[event.detail.enemyType]}を撃破！`;
		case "miniboss_defeated":
			return `${event.floor}F: ${ENEMY_TYPE_LABEL[event.detail.enemyType]}を撃破！`;
		case "close_call_defeat":
			return `${event.floor}F: 瀕死で${ENEMY_TYPE_LABEL[event.detail.enemyType]}を撃破`;
		case "card_level_up":
			return `${event.floor}F: ${CARD_TYPE_SYMBOL[event.detail.cardType]}${CARD_TYPE_NAME[event.detail.cardType]}がLv.${event.detail.newLevel}に成長`;
		case "card_acquired":
			return `${event.floor}F: ${CARD_TYPE_SYMBOL[event.detail.cardType]}${CARD_TYPE_NAME[event.detail.cardType]}を獲得`;
	}
}

/**
 * ハイライト抽出
 * 1. スコア付与 → 降順ソート
 * 2. 同一type最大 RESULT_MAX_SAME_TYPE 件
 * 3. 上位 RESULT_HIGHLIGHT_COUNT 件
 * 4. floor昇順で再ソート
 */
export function extractHighlights(events: RunEvent[]): HighlightEntry[] {
	// スコア付与+降順ソート
	const scored = events
		.map((event) => ({
			event,
			text: formatHighlight(event),
			score: scoreEvent(event),
		}))
		.sort((a, b) => b.score - a.score);

	// 同一type制限
	const typeCounts = new Map<RunEventType, number>();
	const filtered: HighlightEntry[] = [];
	for (const entry of scored) {
		const count = typeCounts.get(entry.event.type) ?? 0;
		if (count >= RESULT_MAX_SAME_TYPE) continue;
		typeCounts.set(entry.event.type, count + 1);
		filtered.push(entry);
		if (filtered.length >= RESULT_HIGHLIGHT_COUNT) break;
	}

	// floor昇順で再ソート
	return filtered.sort((a, b) => a.event.floor - b.event.floor);
}

/**
 * MVP カード選出
 * 優先順位: defeatCount降順 → maxSingleDamage → index昇順
 * フォールバック: useCount降順
 */
export function selectMvpCard(hand: Card[]): Card | null {
	if (hand.length === 0) return null;

	// defeatCount > 0 のカードがある場合
	const withDefeats = hand.filter((c) => c.stats.defeatCount > 0);
	if (withDefeats.length > 0) {
		return withDefeats.sort((a, b) => {
			if (b.stats.defeatCount !== a.stats.defeatCount) {
				return b.stats.defeatCount - a.stats.defeatCount;
			}
			if (b.stats.maxSingleDamage !== a.stats.maxSingleDamage) {
				return b.stats.maxSingleDamage - a.stats.maxSingleDamage;
			}
			return hand.indexOf(a) - hand.indexOf(b);
		})[0];
	}

	// フォールバック: useCount降順
	const withUse = hand.filter((c) => c.stats.useCount > 0);
	if (withUse.length > 0) {
		return withUse.sort((a, b) => {
			if (b.stats.useCount !== a.stats.useCount) {
				return b.stats.useCount - a.stats.useCount;
			}
			return hand.indexOf(a) - hand.indexOf(b);
		})[0];
	}

	return hand[0];
}

/**
 * ResultData を組み立て
 */
export function buildResultData(
	state: GameState,
	result: "clear" | "death",
): ResultData {
	const session = getCurrentSession();
	return {
		result,
		maxFloor: session?.maxFloor ?? state.floor,
		totalTurns: session?.playerTurnCount ?? 0,
		totalDamageDealt: session?.totalDamageDealt ?? 0,
		totalDamageTaken: session?.totalDamageTaken ?? 0,
		hand: [...state.deck.hand],
		mvpCard: selectMvpCard(state.deck.hand),
		highlights: extractHighlights(state.eventLog),
		personality: state.personality,
		speechLog: state.speechLog,
	};
}

/**
 * ハイライトの最小件数（セクション表示判定用）
 */
export { RESULT_HIGHLIGHT_MIN };
