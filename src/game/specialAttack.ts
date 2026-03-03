/**
 * カードレベル特殊効果（貫通・射程延長・ノックバック・衝撃波）
 * @see docs/spec/cards.md
 */

import { ATTACK_EXTENDED_RANGE } from "../constants";
import type { Direction, GameMap, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { applyDamageToEnemy } from "./combat";
import { findEnemyAt, hasEnemyAt } from "./enemyUtils";
import { isInBounds, isWallTile } from "./map";
import { addActionLog, setTile, updateEnemy } from "./state";

/**
 * 指定方向に走査し、最初の敵を見つける。
 * 壁またはマップ外で走査を停止する。
 */
export function findAttackTarget(
	state: GameState,
	direction: Direction,
	range: number,
): { enemyId: string; position: Position } | null {
	const delta = DIRECTION_DELTA[direction];
	const px = state.player.position.x;
	const py = state.player.position.y;

	for (let i = 1; i <= range; i++) {
		const nx = px + delta.x * i;
		const ny = py + delta.y * i;

		if (!isInBounds(state.map, nx, ny)) {
			return null;
		}

		if (isWallTile(state.map[ny][nx])) {
			return null;
		}

		const enemy = findEnemyAt(state.enemies, nx, ny);
		if (enemy) {
			return { enemyId: enemy.id, position: { x: nx, y: ny } };
		}
	}

	return null;
}

/**
 * 攻撃方向に射程延長して最初の敵を探す（Lv5用）
 */
export function findExtendedRangeTarget(
	state: GameState,
	direction: Direction,
): { enemyId: string; position: Position } | null {
	return findAttackTarget(state, direction, ATTACK_EXTENDED_RANGE);
}

/**
 * 貫通: 撃破した敵の先にいる次の敵にoverkillダメージを適用する。
 * 伝播は1回のみ。
 */
export function applyPierce(
	state: GameState,
	direction: Direction,
	overkill: number,
	fromPosition: Position,
	attackCardId: string,
): GameState {
	if (overkill <= 0) return state;

	const delta = DIRECTION_DELTA[direction];
	let cx = fromPosition.x + delta.x;
	let cy = fromPosition.y + delta.y;

	while (isInBounds(state.map, cx, cy)) {
		if (isWallTile(state.map[cy][cx])) {
			break;
		}

		const enemy = findEnemyAt(state.enemies, cx, cy);
		if (enemy) {
			const next = addActionLog(state, "貫通！", "system");
			const result = applyDamageToEnemy(next, enemy.id, overkill, attackCardId);
			return result.state;
		}

		cx += delta.x;
		cy += delta.y;
	}

	return state;
}

/**
 * ノックバック: 敵を攻撃方向に1マス吹き飛ばす。
 * ノックバック先が移動不可の場合は何もしない。
 */
export function applyKnockback(
	state: GameState,
	enemyId: string,
	direction: Direction,
): GameState {
	const enemy = state.enemies.find((e) => e.id === enemyId);
	if (!enemy) return state;

	const delta = DIRECTION_DELTA[direction];
	const kx = enemy.position.x + delta.x;
	const ky = enemy.position.y + delta.y;

	if (!canKnockbackTo(state.map, state, kx, ky)) {
		return state;
	}

	let next = updateEnemy(state, enemyId, (e) => ({
		...e,
		position: { x: kx, y: ky },
	}));
	next = addActionLog(next, "敵を吹き飛ばした", "system");
	return next;
}

/**
 * ノックバック先に移動できるか判定
 */
function canKnockbackTo(
	map: GameMap,
	state: GameState,
	x: number,
	y: number,
): boolean {
	if (!isInBounds(map, x, y)) return false;
	if (isWallTile(map[y][x])) return false;
	if (state.player.position.x === x && state.player.position.y === y)
		return false;
	if (hasEnemyAt(state.enemies, x, y)) return false;
	return true;
}

/**
 * 衝撃波のターゲット座標を計算する。
 * 正面 + サイド(反時計回り) + サイド(時計回り) の3マスを返す。
 */
export function getShockwaveTargets(
	playerPos: Position,
	direction: Direction,
): Position[] {
	const delta = DIRECTION_DELTA[direction];
	const front = {
		x: playerPos.x + delta.x,
		y: playerPos.y + delta.y,
	};
	const sideCounterClockwise = {
		x: playerPos.x + -delta.y,
		y: playerPos.y + delta.x,
	};
	const sideClockwise = {
		x: playerPos.x + delta.y,
		y: playerPos.y + -delta.x,
	};
	return [front, sideCounterClockwise, sideClockwise];
}

/**
 * 衝撃波を実行する。
 * 正面にひび割れ壁がある場合は破壊して終了（hit:false, crackedWallDestroyed:true）。
 * それ以外は正面に敵が必須。正面→サイド(反時計回り)→サイド(時計回り)の順にダメージ。
 * 衝撃波後、生存した敵にノックバック。
 */
export function executeShockwave(
	state: GameState,
	direction: Direction,
	damage: number,
	attackCardId: string,
): {
	state: GameState;
	hit: boolean;
	enemyId: string | null;
	overkill: number;
	defeated: boolean;
	crackedWallDestroyed: boolean;
} {
	const targets = getShockwaveTargets(state.player.position, direction);
	const frontPos = targets[0];

	// 正面に敵が必須（ひび割れ壁の場合は破壊して終了）
	if (!isInBounds(state.map, frontPos.x, frontPos.y)) {
		return {
			state,
			hit: false,
			enemyId: null,
			overkill: 0,
			defeated: false,
			crackedWallDestroyed: false,
		};
	}
	if (state.map[frontPos.y][frontPos.x].type === "wall") {
		return {
			state,
			hit: false,
			enemyId: null,
			overkill: 0,
			defeated: false,
			crackedWallDestroyed: false,
		};
	}
	// 正面がひび割れ壁の場合は破壊して miss 扱い（ログは呼び出し元で付与）
	if (state.map[frontPos.y][frontPos.x].type === "cracked_wall") {
		const s = setTile(state, frontPos.x, frontPos.y, { type: "floor" });
		return {
			state: s,
			hit: false,
			enemyId: null,
			overkill: 0,
			defeated: false,
			crackedWallDestroyed: true,
		};
	}
	const frontEnemy = findEnemyAt(state.enemies, frontPos.x, frontPos.y);
	if (!frontEnemy) {
		return {
			state,
			hit: false,
			enemyId: null,
			overkill: 0,
			defeated: false,
			crackedWallDestroyed: false,
		};
	}

	let next = addActionLog(state, "衝撃波！", "system");

	// 各ターゲットにダメージを適用し、生存した敵のIDを記録
	const survivingEnemies: string[] = [];
	let frontOverkill = 0;
	let frontDefeated = false;

	for (const pos of targets) {
		if (!isInBounds(next.map, pos.x, pos.y)) continue;
		if (isWallTile(next.map[pos.y][pos.x])) continue;

		const enemy = findEnemyAt(next.enemies, pos.x, pos.y);
		if (!enemy) continue;

		const result = applyDamageToEnemy(next, enemy.id, damage, attackCardId);
		next = result.state;

		// 正面敵のoverkill・撃破状態を記録
		if (enemy.id === frontEnemy.id) {
			frontOverkill = result.overkill;
			frontDefeated = result.defeated;
		}

		if (!result.defeated) {
			survivingEnemies.push(enemy.id);
		}
	}

	// 生存した敵にノックバック（正面→サイドの順）
	for (const id of survivingEnemies) {
		next = applyKnockback(next, id, direction);
	}

	return {
		state: next,
		hit: true,
		enemyId: frontEnemy.id,
		overkill: frontOverkill,
		defeated: frontDefeated,
		crackedWallDestroyed: false,
	};
}
