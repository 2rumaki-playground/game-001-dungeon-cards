import type { SpeechEventType } from "../../types";
import type { ContextualSpeechEntry } from "./index";

export const contextualVariants: Partial<
	Record<SpeechEventType, readonly ContextualSpeechEntry[]>
> = {
	move_success: [
		{
			context: "hp_critical",
			variants: [
				"体が辛いけど…この先に何が？",
				"もう少しだけ…探索したい",
				"倒れる前に…何か見つかるかな",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"体力は気になるけど…好奇心が",
				"慎重に、でも探索は続けたい",
				"この先にどんな発見があるだろう",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"深層の構造は…興味深いな",
				"この先に何があるんだろう",
				"未知の領域…ワクワクする！",
			],
		},
	],
	move_fail: [
		{
			context: "hp_critical",
			variants: [
				"行き止まり…体力も限界だけど",
				"壁の向こうが気になるけど…無理か",
				"早く別の道を…体がもたない",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"ここは通れないか…別の道が気になる",
				"壁か…でもこの構造は面白いな",
				"迂回路にも何かあるかも",
			],
		},
	],
	attack_miss: [
		{
			context: "hp_critical",
			variants: [
				"外した…この状態でそれは…",
				"なぜ当たらない…集中が…",
				"もう一度…今度こそ",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"外れた…距離感がズレてるかな",
				"この敵の回避パターンは…手帳に記録",
				"なるほど、そう避けるのか",
			],
		},
	],
	combo_activated: [
		{
			context: "hp_critical",
			variants: [
				"このコンボで…なんとか…！",
				"最後の力で…実験成功！",
				"やった…まだ戦える…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"この組み合わせが効くんだ！",
				"面白い連携だ！手帳にメモしておこう",
				"なるほど、こう繋がるのか！",
			],
		},
		{
			context: "consecutive_combo",
			variants: [
				"連続コンボ！この仕組みは…！",
				"まだ繋がる？どこまで行くんだろう",
				"面白い！この連鎖の法則は…",
			],
		},
	],
	enemy_defeated: [
		{
			context: "hp_critical",
			variants: [
				"倒せた…けど体が限界だ",
				"勝ったが…この敵の謎は解けずじまい",
				"なんとか…もっと調べたかったけど",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"倒した！この敵の弱点は…なるほど",
				"興味深い戦闘だった…体力が心配だけど",
				"この敵のデータは貴重だ",
			],
		},
	],
	damage_taken: [
		{
			context: "hp_critical",
			variants: [
				"痛い…！この攻撃の原理が…いや、逃げないと",
				"もう耐えられない…かもしれない",
				"体が…でも、この攻撃パターンは…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"この攻撃は…なるほど、そういう仕組みか",
				"痛いけど…学びがある",
				"ダメージの仕組みが気になるけど…まず回復",
			],
		},
	],
	trap_triggered: [
		{
			context: "hp_critical",
			variants: [
				"罠…！この体力で…構造が気になるけど逃げないと",
				"面白い仕掛けだけど…倒れそう",
				"この罠の…いや、今は生き延びることが先",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"罠か！…この仕組みは初めて見るな",
				"なるほど、ここに仕掛けてあったか…体力が",
				"痛いけど…この罠の構造は興味深い",
			],
		},
	],
	treasure_found: [
		{
			context: "hp_critical",
			variants: [
				"宝箱！助かった…中身は何だろう",
				"回復…！生き延びて探索を続けられる",
				"ありがたい…まだ冒険を続けたい",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"おっ、宝箱！中身が気になる！",
				"回復できた！これで探索を続けられる",
				"この宝箱はどこから？…まあいいか、ありがたい",
			],
		},
	],
	rest_area_used: [
		{
			context: "hp_critical",
			variants: [
				"ここで休まないと…本当に危なかった",
				"回復…この場所の仕組みが気になるけど",
				"助かった…なぜここだけ安全なんだろう",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"休憩しながら手帳を整理しよう",
				"この休憩所の成り立ちが気になるな",
				"回復しつつ次の探索計画を",
			],
		},
	],
	floor_reached: [
		{
			context: "hp_critical",
			variants: [
				"新しい階層…探索したいけど体が…",
				"ここには何が？…でもまず回復を",
				"興味深いけど…体力が持つかな",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"新階層！何があるだろう…体力に注意しつつ",
				"この階の構造は…気をつけながら観察しよう",
				"どんな発見があるかな…慎重に行こう",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"深層に到達！未知の発見があるかも",
				"ここまで来た…何が待っているんだろう",
				"この深さの構造は…ワクワクする！",
			],
		},
	],
	jump_success: [
		{
			context: "hp_critical",
			variants: [
				"飛んだ…！体が悲鳴を…でも向こう側は？",
				"着地…なんとか。この先には何が",
				"跳躍成功…体力は限界だけど",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"飛べた！着地点には何があるかな",
				"跳躍成功！この距離感は面白いな",
				"向こう側に何が…見てみよう！",
			],
		},
	],
};
