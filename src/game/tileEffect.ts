/**
 * 特殊タイル効果処理
 * @see docs/spec/mapgen.md - 特殊タイル
 */

import { TRAP_DAMAGE } from "../constants";
import type {
	ChestRarity,
	GameState,
	SpecialTileType,
	TileType,
} from "../types";
import { isChestTileType } from "../types";
import { rollChestContent } from "./chestDrop";
import { applyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { positionToKey } from "./positionUtils";
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
	return type === "trap" || isChestTileType(type) || type === "rest_area";
}

/**
 * 宝箱タイルタイプからレアリティを逆引き
 */
function tileTypeToChestRarity(
	type: "chest_common" | "chest_rare" | "chest_epic",
): ChestRarity {
	switch (type) {
		case "chest_common":
			return "common";
		case "chest_rare":
			return "rare";
		case "chest_epic":
			return "epic";
	}
}

/**
 * プレイヤーの現在位置のタイル効果を発動する
 *
 * - 床/壁/階段 → 効果なし
 * - 罠 → ダメージ + タイルをfloorに
 * - 宝箱 → HP回復またはスクロール（カード交換） + タイルをfloorに
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
		case "chest_common":
		case "chest_rare":
		case "chest_epic": {
			const key = positionToKey({ x, y });
			const meta = next.chestMeta[key];
			const rarity = tileTypeToChestRarity(tileType);
			const enemyType = meta?.defeatedEnemyType ?? "normal";
			const content = rollChestContent(next.rng, rarity, enemyType);

			if (content.type === "heal") {
				const healAmount = content.healAmount;
				if (healAmount == null) {
					// 全回復
					next = updatePlayer(next, (p) => ({ ...p, hp: p.maxHp }));
				} else {
					const healed = Math.min(
						next.player.hp + healAmount,
						next.player.maxHp,
					);
					next = updatePlayer(next, (p) => ({ ...p, hp: healed }));
				}
				next = addActionLog(next, "宝箱を開けた！回復の光だ！", "player");
			} else if (content.cardExchangeEntry) {
				next = {
					...next,
					cardExchangeQueue: [
						...next.cardExchangeQueue,
						content.cardExchangeEntry,
					],
				};
				next = addActionLog(
					next,
					"宝箱を開けた！魔法のスクロールだ！",
					"player",
				);
			}

			// chestMetaからエントリ削除
			const newChestMeta = { ...next.chestMeta };
			delete newChestMeta[key];
			next = { ...next, chestMeta: newChestMeta };

			next = addSpeechLog(next, "chest_opened");
			return {
				state: next,
				triggeredTile: tileType,
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
