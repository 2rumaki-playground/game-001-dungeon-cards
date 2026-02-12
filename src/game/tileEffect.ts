/**
 * 特殊タイル効果処理
 * @see docs/spec/mapgen.md - 特殊タイル
 */

import { TRAP_DAMAGE, TREASURE_HEAL } from "../constants";
import type { GameState, SpecialTileType, TileType } from "../types";
import { applyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { addActionLog, setTile, updatePlayer } from "./state";

/** タイル効果の発動結果 */
export type TileEffectResult = {
	state: GameState;
	triggeredTile: SpecialTileType | null;
	gameOver: boolean;
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
 */
export function applyTileEffect(state: GameState): TileEffectResult {
	const { x, y } = state.player.position;
	const tile = state.map[y][x];

	if (!isSpecialTile(tile.type)) {
		return { state, triggeredTile: null, gameOver: false };
	}

	const tileType = tile.type;
	let next = setTile(state, x, y, { type: "floor" });

	switch (tileType) {
		case "trap": {
			next = applyDamageToPlayer(next, TRAP_DAMAGE);
			next = addActionLog(next, "罠を踏んだ！", "player");
			next = checkGameOver(next);
			return {
				state: next,
				triggeredTile: "trap",
				gameOver: isDefeated(next.player.hp),
			};
		}
		case "treasure": {
			const healed = Math.min(
				next.player.hp + TREASURE_HEAL,
				next.player.maxHp,
			);
			next = updatePlayer(next, (p) => ({ ...p, hp: healed }));
			next = addActionLog(next, "宝箱を開けた！", "player");
			return { state: next, triggeredTile: "treasure", gameOver: false };
		}
		case "rest_area": {
			next = updatePlayer(next, (p) => ({ ...p, hp: p.maxHp }));
			next = addActionLog(next, "休憩所で回復した！", "player");
			return { state: next, triggeredTile: "rest_area", gameOver: false };
		}
	}
}
