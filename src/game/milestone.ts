/**
 * マイルストーン判定ロジック
 * プレイヤーの成長や節目に応じたマイルストーンを判定する
 */

import { MILESTONE_DEFEAT_COUNT } from "../constants";
import type { GameState, MilestoneType, SpeechEventType } from "../types";

/**
 * acquisitionCounters.defeatCounts の合計を算出
 */
export function getTotalDefeatCount(state: GameState): number {
	const { defeatCounts } = state.acquisitionCounters;
	let total = 0;
	for (const count of Object.values(defeatCounts)) {
		total += count;
	}
	return total;
}

/**
 * 未達成のマイルストーンを1つ返す（またはnull）
 *
 * イベント種別に応じて対象のマイルストーンのみ判定する。
 * 複数該当する場合は優先度の高いもの（first_defeat > ten_defeats）を返す。
 */
export function checkMilestone(
	state: GameState,
	eventType: SpeechEventType,
): MilestoneType | null {
	const { achievedMilestones } = state;

	switch (eventType) {
		case "enemy_defeated": {
			const total = getTotalDefeatCount(state);
			if (!achievedMilestones.has("first_defeat") && total === 1) {
				return "first_defeat";
			}
			if (
				!achievedMilestones.has("ten_defeats") &&
				total === MILESTONE_DEFEAT_COUNT
			) {
				return "ten_defeats";
			}
			return null;
		}
		case "trap_triggered": {
			if (!achievedMilestones.has("first_trap")) {
				return "first_trap";
			}
			return null;
		}
		case "game_over": {
			if (!achievedMilestones.has("last_word")) {
				return "last_word";
			}
			return null;
		}
		case "floor_reached": {
			if (!achievedMilestones.has("first_floor_clear")) {
				return "first_floor_clear";
			}
			return null;
		}
		default:
			return null;
	}
}
