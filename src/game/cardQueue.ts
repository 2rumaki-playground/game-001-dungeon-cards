/**
 * カード予約キュー管理
 * @see https://github.com/2rumaki-playground/game-001-dungeon-cards/issues/263
 */

import type { Card, DeckState, Direction } from "../types";

/** 予約済みカードエントリ */
export type QueuedCard = {
	card: Card;
	direction?: Direction;
};

/**
 * キューからカードID→実行順序番号(1始まり)のMapを構築
 */
export function buildQueuedCardIndexMap(
	queue: QueuedCard[],
): Map<string, number> {
	const map = new Map<string, number>();
	for (let i = 0; i < queue.length; i++) {
		const item = queue[i];
		if (!item) continue;
		map.set(item.card.id, i + 1);
	}
	return map;
}

/**
 * カードを予約キューに追加可能か判定
 * @param queue 現在のキュー
 * @param card 予約したいカード
 * @param deck デッキ状態（使用済みカード判定用）
 * @returns 予約可能ならtrue
 */
export function canEnqueueCard(
	queue: QueuedCard[],
	card: Card,
	deck?: DeckState,
): boolean {
	// 使用済みカードは予約不可
	if (deck?.usedCardIds.includes(card.id)) {
		return false;
	}
	// キュー内に同じカードがあれば予約不可
	if (queue.some((entry) => entry.card.id === card.id)) {
		return false;
	}
	return true;
}
