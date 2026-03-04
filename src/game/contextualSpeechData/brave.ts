import type { SpeechEventType } from "../../types";
import type { ContextualSpeechEntry } from "./index";

export const contextualVariants: Partial<
	Record<SpeechEventType, readonly ContextualSpeechEntry[]>
> = {
	move_success: [
		{
			context: "hp_critical",
			variants: [
				"まだ…倒れるわけにはいかない",
				"這ってでも進むぞ",
				"ここで止まるな…前へ！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"油断するな…まだ戦える",
				"傷は浅い、進むぞ",
				"気を引き締めて行こう",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"ここまで来たか…負けないぞ",
				"深層だが、恐れはない！",
				"強敵が待っていようと！",
			],
		},
	],
	move_fail: [
		{
			context: "hp_critical",
			variants: [
				"くっ…この状態で行き止まりか",
				"焦るな…別の道があるはず",
				"体力がもたない…急がねば",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"行き止まりか…早く抜けたい",
				"ここで足止めは痛いな",
				"迂回するしかないか",
			],
		},
	],
	attack_miss: [
		{
			context: "hp_critical",
			variants: [
				"くそ…剣を振る力が…！",
				"次は必ず…当てる！",
				"手が震えて…いや、まだだ！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"焦りが出たか…落ち着け",
				"次こそ仕留める！",
				"甘い剣筋だった…集中しろ",
			],
		},
	],
	combo_activated: [
		{
			context: "hp_critical",
			variants: [
				"最後の力で…畳みかける！",
				"倒れる前に…決める！",
				"命を懸けた一撃だ！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"ここで決めるぞ！",
				"押し切る！止まるな！",
				"この勢いで一気に！",
			],
		},
		{
			context: "consecutive_combo",
			variants: [
				"止まらないぞ！さらに！",
				"まだまだ！続けろ！",
				"連続コンボだ！押し切る！",
			],
		},
	],
	enemy_defeated: [
		{
			context: "hp_critical",
			variants: [
				"倒した…が、体がもたない…",
				"ギリギリだ…次は耐えられるか",
				"勝ったが…剣を持つ手が震える",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"倒したが…油断はできない",
				"まだ敵はいるはずだ",
				"一体片付けた…気を抜くな",
			],
		},
	],
	damage_taken: [
		{
			context: "hp_critical",
			variants: [
				"がっ…！もう…限界が…",
				"視界が…霞む…",
				"まだだ…まだ倒れない…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"くっ…効いたな",
				"この痛みは…覚えておくぞ",
				"まだ耐えられる…が、気をつけろ",
			],
		},
	],
	trap_triggered: [
		{
			context: "hp_critical",
			variants: [
				"罠…！この状態で…！",
				"しまった…致命的だ…",
				"うぅ…この体が重い…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"罠か…余裕がないのに",
				"くそ、ここで余計なダメージを",
				"不覚…注意が足りなかった",
			],
		},
	],
	chest_opened: [
		{
			context: "hp_critical",
			variants: [
				"助かった…！生き延びられる",
				"これがなければ…終わりだった",
				"天の助けだ…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"ありがたい…態勢を立て直せる",
				"ここで回復できるのは大きい",
				"運が向いてきたか",
			],
		},
	],
	rest_area_used: [
		{
			context: "hp_critical",
			variants: [
				"助かった…ここで回復しないと",
				"体が…限界だった…",
				"生き延びた…休ませてくれ",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"ここで回復しておこう",
				"少し休めば…まだ戦える",
				"態勢を整えるぞ",
			],
		},
	],
	floor_reached: [
		{
			context: "hp_critical",
			variants: [
				"新しい階層…持つのか、この体",
				"ここまで来たが…厳しい",
				"まだ…進まなければ",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"新階層か…慎重に行こう",
				"気を引き締めて進むぞ",
				"ここからが正念場だ",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"深層に踏み込んだ…覚悟はできている",
				"ここからが真の戦いだ！",
				"どんな強敵が来ても負けない！",
			],
		},
	],
	jump_success: [
		{
			context: "hp_critical",
			variants: [
				"飛んだ…！体が悲鳴を上げている",
				"着地…なんとか持った",
				"無理をしたが…やるしかない",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"跳躍成功…だが慎重にいこう",
				"飛んだ！まだ体は動く",
				"勢いで突破だ！",
			],
		},
	],
};
