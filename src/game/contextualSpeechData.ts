/**
 * 状況依存セリフ（コンテキスト発話）データ
 * HP残量・階層・コンボ連続などの状況に応じた発話バリエーション
 */

import type { Personality, SpeechEventType } from "../types";

/**
 * 発話コンテキスト種別
 * - hp_critical: HP ≤ maxHp × 0.25（瀕死）
 * - hp_tension: HP < maxHp × 0.75（緊張）
 * - deep_floor: floor ≥ DEEP_FLOOR_THRESHOLD
 * - consecutive_combo: 直前の発話が combo_activated
 */
export type SpeechContext =
	| "hp_critical"
	| "hp_tension"
	| "deep_floor"
	| "consecutive_combo";

export type ContextualSpeechEntry = {
	context: SpeechContext;
	variants: readonly string[];
};

/**
 * コンテキスト別発話バリエーション
 *
 * 各エントリは優先度順（hp_critical > hp_tension > deep_floor > consecutive_combo）
 * に並べる。最初にマッチしたコンテキストのバリエーションが使用される。
 */
export const CONTEXTUAL_SPEECH_VARIANTS: Record<
	Personality,
	Partial<Record<SpeechEventType, readonly ContextualSpeechEntry[]>>
> = {
	brave: {
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
		treasure_found: [
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
	},

	cautious: {
		move_success: [
			{
				context: "hp_critical",
				variants: [
					"回復手段を…最優先で探さないと",
					"このままでは持たない…慎重に",
					"一歩一歩…生き延びることを優先",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"体力に不安がある…注意して進もう",
					"回復の機会を見逃さないように",
					"リスクを最小限に抑えて進む",
				],
			},
			{
				context: "deep_floor",
				variants: [
					"深層だ…より慎重に進む必要がある",
					"この先は未知の領域…油断禁物",
					"データが少ない…観察を怠るな",
				],
			},
		],
		move_fail: [
			{
				context: "hp_critical",
				variants: [
					"行き止まり…体力が持たない",
					"迂回は体力を消耗する…最短ルートを",
					"時間がない…別の道を急いで",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"余計な消耗は避けたいが…迂回するか",
					"想定外のルート封鎖…計画を修正",
					"効率的な迂回路を検討する",
				],
			},
		],
		attack_miss: [
			{
				context: "hp_critical",
				variants: [
					"外した…一撃が命取りになりかねない",
					"この状態でミスは致命的…",
					"集中力が…落ちている",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"外した…焦りが出ているか",
					"冷静に…次は確実に仕留める",
					"ミスの原因を分析…距離か角度か",
				],
			},
		],
		combo_activated: [
			{
				context: "hp_critical",
				variants: [
					"ここで決めなければ…後がない",
					"最後のチャンス…逃さない",
					"計算通り…これが最善手だ",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"この好機を逃すな",
					"計算通りの連携…畳みかける",
					"効率的に仕留める",
				],
			},
			{
				context: "consecutive_combo",
				variants: [
					"連続コンボ…計算通りだ",
					"想定した最良の展開",
					"この連携が最適解だ",
				],
			},
		],
		enemy_defeated: [
			{
				context: "hp_critical",
				variants: [
					"排除したが…次の戦闘に耐えられるか",
					"辛うじて勝利…撤退も検討すべきか",
					"一体処理…だが余裕がない",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"排除完了…だが体力の消耗が気になる",
					"一体減った…残りの脅威を確認",
					"倒したが、回復を優先すべきか",
				],
			},
		],
		damage_taken: [
			{
				context: "hp_critical",
				variants: [
					"危険域に入った…撤退を検討",
					"これ以上の被弾は許されない",
					"残りHP…厳しい数値だ",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"被弾…HPの管理を徹底しないと",
					"ダメージ蓄積が気になる",
					"防御を見直す必要がある",
				],
			},
		],
		trap_triggered: [
			{
				context: "hp_critical",
				variants: [
					"罠…！この体力で…致命的だ",
					"見落とした…最悪のタイミング",
					"眼鏡越しに見えなかった…不覚",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"確認が甘かった…体力に余裕がないのに",
					"この消耗は計画外だ",
					"罠の配置パターンを記録…次は回避する",
				],
			},
		],
		treasure_found: [
			{
				context: "hp_critical",
				variants: [
					"回復…！これで生存確率が上がる",
					"この状況での回復は極めて重要だ",
					"助かった…計画を立て直せる",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"回復の機会…最大限活用する",
					"体力を回復して計画を再構築",
					"この回復で行動の選択肢が広がる",
				],
			},
		],
		rest_area_used: [
			{
				context: "hp_critical",
				variants: [
					"全回復…これで建て直せる",
					"ここで回復できなければ詰んでいた",
					"態勢を完全に立て直す",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"回復と同時に次の計画を練る",
					"ここで万全の状態に戻す",
					"休息を最大限活用する",
				],
			},
		],
		floor_reached: [
			{
				context: "hp_critical",
				variants: [
					"新階層…この体力で切り抜けられるか",
					"まず回復手段の確保が最優先",
					"危険な状態で未知の階層…最悪の状況だ",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"新階層か…体力に不安がある",
					"偵察しつつ回復の機会を探す",
					"慎重に…無理は禁物だ",
				],
			},
			{
				context: "deep_floor",
				variants: [
					"深層に到達…データを蓄積して進む",
					"ここからは経験のない領域だ",
					"未知の脅威に備えて慎重に",
				],
			},
		],
		jump_success: [
			{
				context: "hp_critical",
				variants: [
					"着地…体への負担が大きい",
					"跳躍は体力を消耗する…慎重に",
					"無事着地…だが余裕がない",
				],
			},
			{
				context: "hp_tension",
				variants: [
					"着地成功…リスクは承知の上だった",
					"跳躍は計算通り…だが体力が気になる",
					"想定ルートを通過できた",
				],
			},
		],
	},

	cheerful: {
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
		treasure_found: [
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
	},

	stoic: {
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
		treasure_found: [
			{
				context: "hp_critical",
				variants: ["…助かる", "これで…まだ戦える", "…命拾いした"],
			},
			{
				context: "hp_tension",
				variants: ["…回復する", "丁度良い", "…ありがたい"],
			},
		],
		rest_area_used: [
			{
				context: "hp_critical",
				variants: ["…助かった", "ここで…回復する", "…限界だった"],
			},
			{
				context: "hp_tension",
				variants: ["…休む", "態勢を整える", "…一息"],
			},
		],
		floor_reached: [
			{
				context: "hp_critical",
				variants: [
					"…新たな階層。体が重い",
					"持つのか…この先",
					"…まだ終われない",
				],
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
	},

	curious: {
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
	},
} as const;
