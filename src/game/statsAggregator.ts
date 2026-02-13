/**
 * プレイ統計の集計ロジック
 *
 * PlaySession[]から統計を算出する純粋関数群。
 */

import type { CardType, DeathCause, PlaySession } from "../types";

/** 統計ダッシュボードの集計結果 */
export type AggregatedStats = {
	/** 総プレイ回数 */
	totalPlays: number;
	/** クリア回数 */
	clearCount: number;
	/** クリア率（0-1、セッション0件時はnull） */
	clearRate: number | null;
	/** 到達階層の分布（key: 階層番号, value: 回数） */
	floorDistribution: Map<number, number>;
	/** カード別使用回数（降順ソート済み、使用回数0は除外） */
	cardUsageRanking: { cardType: CardType; count: number }[];
	/** 死因ランキング（降順ソート済み） */
	deathCauseRanking: { cause: DeathCause; count: number }[];
	/** 階層別死亡分布（key: 階層番号, value: 死亡回数） */
	deathFloorDistribution: Map<number, number>;
	/** 平均ラン時間（ミリ秒、セッション0件時はnull） */
	averageRunTime: number | null;
	/** 最高到達階層 */
	maxFloorReached: number;
	/** 平均到達階層（セッション0件時はnull） */
	averageMaxFloor: number | null;
};

/**
 * プレイセッション配列から統計を集計する
 */
export function aggregateStats(sessions: PlaySession[]): AggregatedStats {
	if (sessions.length === 0) {
		return {
			totalPlays: 0,
			clearCount: 0,
			clearRate: null,
			floorDistribution: new Map(),
			cardUsageRanking: [],
			deathCauseRanking: [],
			deathFloorDistribution: new Map(),
			averageRunTime: null,
			maxFloorReached: 0,
			averageMaxFloor: null,
		};
	}

	const totalPlays = sessions.length;
	const clearCount = sessions.filter((s) => s.result === "clear").length;
	const clearRate = clearCount / totalPlays;

	// 到達階層分布
	const floorDistribution = new Map<number, number>();
	for (const s of sessions) {
		floorDistribution.set(
			s.maxFloor,
			(floorDistribution.get(s.maxFloor) ?? 0) + 1,
		);
	}

	// カード別使用回数
	const cardTotals = new Map<CardType, number>();
	for (const s of sessions) {
		for (const [type, count] of Object.entries(s.cardUsage)) {
			const cardType = type as CardType;
			cardTotals.set(cardType, (cardTotals.get(cardType) ?? 0) + count);
		}
	}
	const cardUsageRanking = [...cardTotals.entries()]
		.filter(([, count]) => count > 0)
		.map(([cardType, count]) => ({ cardType, count }))
		.sort((a, b) => b.count - a.count);

	// 死因ランキング
	const deathCauseTotals = new Map<DeathCause, number>();
	const deathFloorDistribution = new Map<number, number>();
	for (const s of sessions) {
		if (s.result === "death") {
			deathCauseTotals.set(
				s.deathCause,
				(deathCauseTotals.get(s.deathCause) ?? 0) + 1,
			);
			deathFloorDistribution.set(
				s.maxFloor,
				(deathFloorDistribution.get(s.maxFloor) ?? 0) + 1,
			);
		}
	}
	const deathCauseRanking = [...deathCauseTotals.entries()]
		.map(([cause, count]) => ({ cause, count }))
		.sort((a, b) => b.count - a.count);

	// 平均ラン時間
	const totalRunTime = sessions.reduce(
		(sum, s) => sum + (s.endedAt - s.startedAt),
		0,
	);
	const averageRunTime = totalRunTime / totalPlays;

	// 最高・平均到達階層
	const maxFloorReached = Math.max(...sessions.map((s) => s.maxFloor));
	const averageMaxFloor =
		sessions.reduce((sum, s) => sum + s.maxFloor, 0) / totalPlays;

	return {
		totalPlays,
		clearCount,
		clearRate,
		floorDistribution,
		cardUsageRanking,
		deathCauseRanking,
		deathFloorDistribution,
		averageRunTime,
		maxFloorReached,
		averageMaxFloor,
	};
}

/**
 * ミリ秒を「○分○秒」形式に変換
 */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}分${seconds}秒`;
}
