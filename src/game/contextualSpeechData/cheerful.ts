import type { SpeechEventType } from "../../types";
import type { ContextualSpeechEntry } from "./index";

export const contextualVariants: Partial<
	Record<SpeechEventType, readonly ContextualSpeechEntry[]>
> = {
	move_success: [
		{
			context: "hp_critical",
			variants: [
				"あと少し…頑張らないと…",
				"ふぅ…大丈夫、まだいける…",
				"笑顔で…いないと…ね",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"まだ大丈夫…だよね？",
				"ちょっとドキドキしてきた",
				"えへへ…気をつけて行こう",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"わぁ、こんな深くまで来ちゃった！",
				"すごいすごい！どんどん奥だね",
				"ここまで来たんだ…頑張ろう！",
			],
		},
	],
	move_fail: [
		{
			context: "hp_critical",
			variants: [
				"うぅ…行き止まり…どうしよう",
				"早く進まないと…体が…",
				"ここじゃない…急がないと…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"んー、こっちはダメかぁ…",
				"行き止まり…ちょっと焦るね",
				"別の道を探そう…急がなきゃ",
			],
		},
	],
	attack_miss: [
		{
			context: "hp_critical",
			variants: [
				"うぅ…外しちゃった…やばい",
				"当てないと…次は…",
				"手が震えて…でも頑張る！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"あちゃー…落ち着いて、落ち着いて",
				"次はちゃんと当てるから！",
				"うーん、ちょっと焦ってたかな",
			],
		},
	],
	combo_activated: [
		{
			context: "hp_critical",
			variants: [
				"今しかない…いっけー！",
				"最後の力で…えいっ！",
				"ここで決める…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"チャンス！ここで挽回！",
				"やるよー！負けないんだから！",
				"コンボで一気に！",
			],
		},
		{
			context: "consecutive_combo",
			variants: [
				"えー！まだ続くの！すごーい！",
				"止まらない止まらない！",
				"連続コンボ！最高！",
			],
		},
	],
	enemy_defeated: [
		{
			context: "hp_critical",
			variants: [
				"倒した…けど、体がフラフラ…",
				"やった…でも限界近い…",
				"なんとか…勝てた…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"やったー！…でもちょっとキツイかも",
				"勝った！…回復探さなきゃ",
				"ふぅ〜、危なかったね！",
			],
		},
	],
	damage_taken: [
		{
			context: "hp_critical",
			variants: [
				"いたっ…！もう…ダメかも…",
				"うぅ…がんばれ…がんばれ…",
				"痛い…でも…まだ…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"いたた…ちょっとマズイかも",
				"うぅ、結構効いた…",
				"大丈夫大丈夫…たぶん",
			],
		},
	],
	trap_triggered: [
		{
			context: "hp_critical",
			variants: [
				"きゃっ…！もう体力が…",
				"うそ…罠…この状態で…",
				"いたい…もう無理かも…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"わっ！罠だ…気をつけないと",
				"もう〜、余計なダメージ！",
				"びっくりした…体力が心配",
			],
		},
	],
	chest_opened: [
		{
			context: "hp_critical",
			variants: [
				"宝箱！助かったぁ…！",
				"やった…生き返る…！",
				"これがなかったら終わりだった…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"わーい！回復だ！助かる〜",
				"ラッキー！ちょうど欲しかった！",
				"やった〜、元気出てきた！",
			],
		},
	],
	rest_area_used: [
		{
			context: "hp_critical",
			variants: [
				"はぁ〜…助かった…",
				"ここで休めてよかった…本当に",
				"もうダメかと思った…回復！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"休憩〜！ちょうどよかった！",
				"ふぅ、これで安心だね！",
				"回復したら元気百倍！",
			],
		},
	],
	floor_reached: [
		{
			context: "hp_critical",
			variants: [
				"新しい階…大丈夫かな…",
				"次の階に来たけど…体力が…",
				"頑張れ…まだ…いけるよ…！",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"新しい階だ！…ちょっと不安だけど",
				"わくわく…いや、ちょっとドキドキ",
				"回復しながら進もう！",
			],
		},
		{
			context: "deep_floor",
			variants: [
				"こんな深くまで来ちゃった！",
				"どんどん奥に！冒険だね〜！",
				"深層だ〜！ワクワクが止まらない！",
			],
		},
	],
	jump_success: [
		{
			context: "hp_critical",
			variants: [
				"とりゃ…！着地…ふぅ…",
				"飛んだ…けど体が…",
				"なんとか…着地できた…",
			],
		},
		{
			context: "hp_tension",
			variants: [
				"えいっ！…ちょっとヒヤッとした",
				"ジャンプ成功！…ドキドキした〜",
				"飛べた！まだまだいける！",
			],
		},
	],
};
