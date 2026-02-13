/**
 * カード予約キュー管理
 * @see https://github.com/2rumaki-playground/game-001-dungeon-cards-02/issues/263
 */

import type { Card, Direction } from "../types";
import { getEffectiveCardCost } from "./debugCheats";

/** 予約済みカードエントリ */
export type QueuedCard = {
	card: Card;
	direction?: Direction;
};

/**
 * キュー内カードの合計APコストを計算
 */
export function getQueuedApCost(queue: QueuedCard[]): number {
	return queue.reduce(
		(sum, entry) => sum + getEffectiveCardCost(entry.card.type),
		0,
	);
}

/**
 * キューからカードID→実行順序番号(1始まり)のMapを構築
 */
export function buildQueuedCardIndexMap(
	queue: QueuedCard[],
): Map<string, number> {
	const map = new Map<string, number>();
	for (let i = 0; i < queue.length; i++) {
		const item = queue[i]!;
		map.set(item.card.id, i + 1);
	}
	return map;
}

/**
 * カードを予約キューに追加可能か判定
 * @param currentAp 現在のAP（先行カード消費分は反映済みの状態AP）
 * @param queue 現在のキュー
 * @param card 予約したいカード
 * @returns 予約可能ならtrue
 */
export function canEnqueueCard(
	currentAp: number,
	queue: QueuedCard[],
	card: Card,
): boolean {
	const pendingCost = getQueuedApCost(queue);
	const availableAp = currentAp - pendingCost;
	return availableAp >= getEffectiveCardCost(card.type);
}
