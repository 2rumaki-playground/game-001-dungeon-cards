/**
 * 特殊タイル効果処理
 * @see docs/spec/mapgen.md - 特殊タイル
 */

import { TRAP_DAMAGE, TREASURE_HEAL } from "../constants";
import type { GameState, SpecialTileType, TileType } from "../types";
import { applyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { addSpeechLog } from "./speech";
import { addActionLog, setTile, updatePlayer } from "./state";

/** タイル効果の発動結果 */
export type TileEffectResult = {
	state: GameState;
	triggeredTile: SpecialTileType | null;
	gameOver: boolean;
	/** 効果発動前のHP */
	hpBefore: number;
	/** 効果発動後のHP */
	hpAfter: number;
};

/**
 * 指定タイル種別が特殊タイルかどうかを判定
 */
function isSpecialTile(type: TileType): type is SpecialTileType {
	return type === "trap" || type === "treasure" || type === "rest_area";
}

/**
 * プレイヤーの現在位置のタイル効果を発動する
 *
 * - 床/壁/階段 → 効果なし
 * - 罠 → ダメージ + タイルをfloorに
 * - 宝箱 → HP回復（maxHp上限） + タイルをfloorに
 * - 休憩所 → HP全回復 + タイルをfloorに
 *
 * @param options.applyDamage ダメージ適用関数（DI用、デフォルトは applyDamageToPlayer）
 */
export function applyTileEffect(
	state: GameState,
	options?: {
		applyDamage?: (state: GameState, damage: number) => GameState;
	},
): TileEffectResult {
	const { x, y } = state.player.position;
	const tile = state.map[y][x];
	const hpBefore = state.player.hp;

	if (!isSpecialTile(tile.type)) {
		return {
			state,
			triggeredTile: null,
			gameOver: false,
			hpBefore,
			hpAfter: hpBefore,
		};
	}

	const tileType = tile.type;
	let next = setTile(state, x, y, { type: "floor" });
	const applyDmg = options?.applyDamage ?? applyDamageToPlayer;

	switch (tileType) {
		case "trap": {
			next = applyDmg(next, TRAP_DAMAGE);
			next = addActionLog(next, "罠を踏んだ！", "player");
			next = addSpeechLog(next, "trap_triggered");
			next = checkGameOver(next);
			return {
				state: next,
				triggeredTile: "trap",
				gameOver: isDefeated(next.player.hp),
				hpBefore,
				hpAfter: next.player.hp,
			};
		}
		case "treasure": {
			const healed = Math.min(
				next.player.hp + TREASURE_HEAL,
				next.player.maxHp,
			);
			next = updatePlayer(next, (p) => ({ ...p, hp: healed }));
			next = addActionLog(next, "宝箱を開けた！", "player");
			next = addSpeechLog(next, "treasure_found");
			return {
				state: next,
				triggeredTile: "treasure",
				gameOver: false,
				hpBefore,
				hpAfter: next.player.hp,
			};
		}
		case "rest_area": {
			next = updatePlayer(next, (p) => ({ ...p, hp: p.maxHp }));
			next = addActionLog(next, "休憩所で回復した！", "player");
			next = addSpeechLog(next, "rest_area_used");
			return {
				state: next,
				triggeredTile: "rest_area",
				gameOver: false,
				hpBefore,
				hpAfter: next.player.hp,
			};
		}
	}
}
