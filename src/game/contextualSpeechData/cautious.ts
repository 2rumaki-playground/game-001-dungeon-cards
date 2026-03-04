import type { SpeechEventType } from "../../types";
import type { ContextualSpeechEntry } from "./index";

export const contextualVariants: Partial<
	Record<SpeechEventType, readonly ContextualSpeechEntry[]>
> = {
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
	chest_opened: [
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
};
