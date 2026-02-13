/**
 * 敵AI分析ロジック（DEV環境限定）
 *
 * 各敵の行動判定理由・移動候補・攻撃範囲を計算する純関数群。
 * PixiJS無依存でテスト可能。
 */

import { BOSS_SKILL, ENEMY_PARAMS, ENEMY_TYPE_LABEL } from "../constants";
import type { Direction, Enemy, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { canEnemyMoveTo, pickMoveDirection } from "./enemyAi";
import { isInBounds } from "./map";
import { isAdjacent, manhattanDistance } from "./positionUtils";
import { findRoomAt, isInRoom } from "./roomUtils";

/** 行動判定結果 */
export type EnemyDecision =
	| { type: "attack"; reason: string }
	| { type: "move"; reason: string; direction: Direction }
	| { type: "wait_room"; reason: string }
	| { type: "wait_out_of_range"; reason: string }
	| { type: "wait_no_move"; reason: string }
	| { type: "skill_pending"; reason: string };

/** 移動候補タイル */
export type MoveCandidateTile = {
	position: Position;
	isBestChoice: boolean;
};

/** 1体の敵のAI分析結果 */
export type EnemyAiAnalysis = {
	enemyId: string;
	decision: EnemyDecision;
	moveCandidates: MoveCandidateTile[];
	attackRange: Position[];
};

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export const DIRECTION_LABEL: Record<Direction, string> = {
	up: "上",
	down: "下",
	left: "左",
	right: "右",
};

/**
 * 敵の攻撃範囲（隣接4タイル）をマップ内に限定して返す
 */
function getAttackRange(
	enemyPos: Position,
	mapWidth: number,
	mapHeight: number,
): Position[] {
	const tiles: Position[] = [];
	for (const dir of DIRECTIONS) {
		const delta = DIRECTION_DELTA[dir];
		const x = enemyPos.x + delta.x;
		const y = enemyPos.y + delta.y;
		if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
			tiles.push({ x, y });
		}
	}
	return tiles;
}

/**
 * 敵の移動候補タイルを計算
 */
function getMoveCandidates(
	state: GameState,
	enemy: Enemy,
	bestDirection: Direction | null,
): MoveCandidateTile[] {
	const candidates: MoveCandidateTile[] = [];
	for (const dir of DIRECTIONS) {
		const delta = DIRECTION_DELTA[dir];
		const nx = enemy.position.x + delta.x;
		const ny = enemy.position.y + delta.y;
		if (isInBounds(state.map, nx, ny) && canEnemyMoveTo(state, enemy, nx, ny)) {
			candidates.push({
				position: { x: nx, y: ny },
				isBestChoice: dir === bestDirection,
			});
		}
	}
	return candidates;
}

/**
 * 1体の敵のAI分析
 */
export function analyzeEnemy(state: GameState, enemy: Enemy): EnemyAiAnalysis {
	const params = ENEMY_PARAMS[enemy.type];
	const label = ENEMY_TYPE_LABEL[enemy.type];
	const distance = manhattanDistance(enemy.position, state.player.position);
	const mapWidth = state.map[0]?.length ?? 0;
	const mapHeight = state.map.length;
	const attackRange = getAttackRange(enemy.position, mapWidth, mapHeight);

	// スキル予告中
	if (enemy.pendingSkill) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "skill_pending",
				reason: `${label}: スキル予告中（${enemy.pendingSkill.type}）`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 隣接 → 攻撃
	if (isAdjacent(enemy.position, state.player.position)) {
		const enrageBonus = enemy.enraged ? BOSS_SKILL.enrageBonusDamage : 0;
		const atk = params.attackDamage + enrageBonus;
		return {
			enemyId: enemy.id,
			decision: {
				type: "attack",
				reason: `${label}: 隣接, ATK:${atk}`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 部屋内 & プレイヤー不在
	const enemyRoom = findRoomAt(enemy.position, state.rooms);
	if (enemyRoom !== null && !isInRoom(state.player.position, enemyRoom)) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "wait_room",
				reason: `${label}: 部屋内待機（プレイヤー不在）`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 索敵範囲チェック
	if (distance > params.senseRange) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "wait_out_of_range",
				reason: `${label}: 索敵外（距離${distance}, 範囲${params.senseRange}）`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 移動不可（moveDistance=0）
	if (params.moveDistance === 0) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "wait_no_move",
				reason: `${label}: 移動不可（moveDistance=0）`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 索敵範囲内 → 移動
	const bestDir = pickMoveDirection(state, enemy);
	const moveCandidates = getMoveCandidates(state, enemy, bestDir);

	if (bestDir) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "move",
				reason: `${label}: 追従（距離${distance}, BFS:${DIRECTION_LABEL[bestDir]}）`,
				direction: bestDir,
			},
			moveCandidates,
			attackRange,
		};
	}

	// BFSで移動先が見つからない（全方向ブロック）
	return {
		enemyId: enemy.id,
		decision: {
			type: "wait_no_move",
			reason: `${label}: 移動先なし（全方向ブロック）`,
		},
		moveCandidates,
		attackRange,
	};
}

/**
 * 全敵のAI分析
 */
export function analyzeAllEnemies(state: GameState): EnemyAiAnalysis[] {
	return state.enemies.map((enemy) => analyzeEnemy(state, enemy));
}
