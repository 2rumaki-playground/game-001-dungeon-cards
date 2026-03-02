/**
 * 敵AI分析ロジック（DEV環境限定）
 *
 * 各敵の行動判定理由・移動候補・攻撃範囲を計算する純関数群。
 * PixiJS無依存でテスト可能。
 */

import {
	BOSS_SKILL,
	ENEMY_PARAMS,
	ENEMY_TYPE_LABEL,
	RANGED_SHOOT_RANGE,
	SUMMONER_COOLDOWN,
} from "../constants";
import type { Direction, Enemy, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	canEnemyMoveTo,
	getRetreatPosition,
	hasLineOfSight,
	pickMoveDirection,
} from "./enemyAi";
import { isInBounds } from "./map";
import { isAdjacent, manhattanDistance } from "./positionUtils";
import { findRoomAt, isInRoom } from "./roomUtils";

/** 行動判定結果 */
export type EnemyDecision =
	| { type: "attack"; reason: string }
	| { type: "shoot"; reason: string }
	| { type: "retreat"; reason: string }
	| { type: "move"; reason: string; direction: Direction }
	| { type: "wait_room"; reason: string }
	| { type: "wait_out_of_range"; reason: string }
	| { type: "wait_no_move"; reason: string }
	| { type: "wait_no_target"; reason: string }
	| { type: "summon"; reason: string };

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
 * 召喚敵のAI分析
 */
export function analyzeSummonerEnemy(
	state: GameState,
	enemy: Enemy,
): EnemyAiAnalysis {
	const label = ENEMY_TYPE_LABEL[enemy.type];
	const params = ENEMY_PARAMS[enemy.type];
	const distance = manhattanDistance(enemy.position, state.player.position);
	// 召喚敵は攻撃しないため、attackRangeは空
	const attackRange: Position[] = [];

	// 部屋内 & プレイヤー不在 → 待機
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

	// 索敵範囲外 → 待機
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

	// 隣接 → 後退
	if (isAdjacent(enemy.position, state.player.position)) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "retreat",
				reason: `${label}: 隣接, 後退`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 召喚ターン（cooldown=0）
	if ((enemy.summonCooldown ?? SUMMONER_COOLDOWN) <= 0) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "summon",
				reason: `${label}: 召喚ターン`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 非召喚ターン → 待機
	return {
		enemyId: enemy.id,
		decision: {
			type: "wait_no_move",
			reason: `${label}: 待機（cooldown=${enemy.summonCooldown ?? SUMMONER_COOLDOWN}）`,
		},
		moveCandidates: [],
		attackRange,
	};
}

/**
 * 1体の敵のAI分析
 */
export function analyzeEnemy(state: GameState, enemy: Enemy): EnemyAiAnalysis {
	if (enemy.type === "summoner") {
		return analyzeSummonerEnemy(state, enemy);
	}

	const params = ENEMY_PARAMS[enemy.type];
	const label = ENEMY_TYPE_LABEL[enemy.type];
	const distance = manhattanDistance(enemy.position, state.player.position);
	const mapWidth = state.map[0]?.length ?? 0;
	const mapHeight = state.map.length;

	// 射撃敵は専用の分析パス
	if (enemy.type === "ranged") {
		return analyzeRangedEnemy(state, enemy);
	}

	const attackRange = getAttackRange(enemy.position, mapWidth, mapHeight);

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
 * 射撃敵のAI分析
 */
function analyzeRangedEnemy(state: GameState, enemy: Enemy): EnemyAiAnalysis {
	const params = ENEMY_PARAMS[enemy.type];
	const label = ENEMY_TYPE_LABEL[enemy.type];
	const distance = manhattanDistance(enemy.position, state.player.position);
	const mapWidth = state.map[0]?.length ?? 0;
	const mapHeight = state.map.length;

	// 射撃敵の攻撃範囲は「射程 + 直線条件 + 壁遮蔽なし」の射撃可能タイルとする
	const attackRange: Position[] = [];
	for (let y = 0; y < mapHeight; y++) {
		for (let x = 0; x < mapWidth; x++) {
			const pos: Position = { x, y };
			const d = manhattanDistance(enemy.position, pos);
			if (d === 0) continue;
			if (d > RANGED_SHOOT_RANGE) continue;
			if (pos.x !== enemy.position.x && pos.y !== enemy.position.y) continue;
			if (!hasLineOfSight(state, enemy.position, pos)) continue;
			attackRange.push(pos);
		}
	}

	// 隣接 → 部屋境界に関係なく行動（後退/射撃）
	if (isAdjacent(enemy.position, state.player.position)) {
		const retreatPos = getRetreatPosition(state, enemy);
		if (retreatPos) {
			return {
				enemyId: enemy.id,
				decision: {
					type: "retreat",
					reason: `${label}: 後退（隣接）`,
				},
				moveCandidates: [],
				attackRange,
			};
		}
		return {
			enemyId: enemy.id,
			decision: {
				type: "shoot",
				reason: `${label}: 射撃（隣接, 後退不可, ATK:${params.attackDamage}）`,
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

	// 索敵範囲外
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

	// 非隣接: 射程内 + 射線あり
	if (
		distance <= RANGED_SHOOT_RANGE &&
		hasLineOfSight(state, enemy.position, state.player.position)
	) {
		return {
			enemyId: enemy.id,
			decision: {
				type: "shoot",
				reason: `${label}: 射撃（距離${distance}, ATK:${params.attackDamage}）`,
			},
			moveCandidates: [],
			attackRange,
		};
	}

	// 射程外 or 射線なし → 待機
	return {
		enemyId: enemy.id,
		decision: {
			type: "wait_no_target",
			reason: `${label}: 待機（射程外 or 射線なし, 距離${distance}）`,
		},
		moveCandidates: [],
		attackRange,
	};
}

/**
 * 全敵のAI分析
 */
export function analyzeAllEnemies(state: GameState): EnemyAiAnalysis[] {
	return state.enemies.map((enemy) => analyzeEnemy(state, enemy));
}
