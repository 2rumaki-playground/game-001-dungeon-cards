import type { SpeechEventType } from "../../types";
import type { ContextualSpeechEntry } from "./index";

export const contextualVariants: Partial<
	Record<SpeechEventType, readonly ContextualSpeechEntry[]>
> = {
	move_success: [
		{
			context: "hp_critical",
			variants: ["…限界が近い", "…まだ動ける", "…止まれば、終わる"],
		},
		{
			context: "hp_tension",
			variants: ["…注意が必要だ", "傷が響く", "…油断するな"],
		},
		{
			context: "deep_floor",
			variants: ["…深層か", "ここからが本番", "…気を緩めるな"],
		},
	],
	move_fail: [
		{
			context: "hp_critical",
			variants: ["…壁か。体力が…", "急がねば", "…別の道を"],
		},
		{
			context: "hp_tension",
			variants: ["…迂回する", "壁…想定内だ", "…回り道か"],
		},
	],
	attack_miss: [
		{
			context: "hp_critical",
			variants: ["…外した。致命的だ", "集中が…", "…次で決める"],
		},
		{
			context: "hp_tension",
			variants: ["…甘い", "修正する", "…次は外さない"],
		},
	],
	combo_activated: [
		{
			context: "hp_critical",
			variants: ["…最後の力で", "ここで…決める", "…退けない"],
		},
		{
			context: "hp_tension",
			variants: ["…畳みかける", "好機…逃さない", "…一気に"],
		},
		{
			context: "consecutive_combo",
			variants: ["…まだ続く", "止めない", "…連撃"],
		},
	],
	enemy_defeated: [
		{
			context: "hp_critical",
			variants: ["…倒した。だが体が…", "辛勝…次は分からない", "…ギリギリだ"],
		},
		{
			context: "hp_tension",
			variants: ["…片付けた", "一体減った", "…油断するな"],
		},
	],
	damage_taken: [
		{
			context: "hp_critical",
			variants: ["…深い", "…まだ…立てる", "限界が…近い"],
		},
		{
			context: "hp_tension",
			variants: ["…響くな", "浅くはない", "…耐える"],
		},
	],
	trap_triggered: [
		{
			context: "hp_critical",
			variants: ["…罠。致命的だ", "…不覚", "この状態で…"],
		},
		{
			context: "hp_tension",
			variants: ["…罠か", "注意が足りない", "…余計な消耗"],
		},
	],
	chest_opened: [
		{
			context: "hp_critical",
			variants: ["…助かる", "これで…まだ戦える", "…命拾いした"],
		},
		{
			context: "hp_tension",
			variants: ["…回復する", "丁度良い", "…ありがたい"],
		},
	],
	floor_reached: [
		{
			context: "hp_critical",
			variants: ["…新たな階層。体が重い", "持つのか…この先", "…まだ終われない"],
		},
		{
			context: "hp_tension",
			variants: ["…次の階層", "気を緩めるな", "…慎重に"],
		},
		{
			context: "deep_floor",
			variants: ["…深層か", "ここからが真の戦場", "…かつての戦場を思い出す"],
		},
	],
	jump_success: [
		{
			context: "hp_critical",
			variants: ["…着地。体が軋む", "…無理をした", "なんとか…"],
		},
		{
			context: "hp_tension",
			variants: ["…飛んだ", "着地…問題ない", "…突破"],
		},
	],
};
