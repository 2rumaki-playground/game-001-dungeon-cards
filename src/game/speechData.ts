/**
 * キャラクター発話データ辞書
 * イベント種別ごとの発話バリエーションを定義
 */

import type { SpeechEventType } from "../types";

export const SPEECH_VARIANTS: Record<SpeechEventType, readonly string[]> = {
	move_success: ["よし、進もう", "この先は…", "慎重にいこう"],
	move_fail: ["行き止まりか…", "ここは通れない", "別の道を探そう"],
	attack_miss: ["空振りだ！", "くっ、外した", "手応えがない…"],
	combo_activated: ["今だ！畳みかける！", "チャンスだ！", "連続攻撃！"],
	enemy_defeated: ["やった！", "倒したぞ", "まだ先がある"],
	damage_taken: ["くっ…！", "痛い！", "まだ耐えられる"],
	game_over: ["ここまでか…", "無念…", "次こそは…"],
	trap_triggered: ["しまった、罠だ！", "うわっ！", "不覚…！"],
	treasure_found: ["お、宝箱だ！", "ありがたい", "回復できた"],
	rest_area_used: ["少し休もう", "体力が戻った", "ふぅ、一息つける"],
	floor_reached: ["新しい階層だ", "ここからが本番", "気を引き締めよう"],
	jump_success: ["突っ込むぞ！", "一気に行く！", "ここを抜ける！"],
} as const;
