import { ENEMY_PARAMS, MAX_AP, PLAYER_INITIAL_HP } from "../constants";
import { createFixedLayoutMap } from "../game/map";
import type {
	Card,
	CardType,
	Enemy,
	EnemyType,
	GameMap,
	GameState,
	Position,
} from "../types";
import { RNG } from "../utils/rng";

/**
 * テスト用の MAP_WIDTH x MAP_HEIGHT マップを生成（外周壁・内側床）
 */
export function createTestMap(): GameMap {
	return createFixedLayoutMap();
}

/**
 * テスト用のGameStateを生成
 */
export function createTestState(overrides?: Partial<GameState>): GameState {
	const map = createTestMap();
	return {
		screen: "game",
		turn: "player",
		floor: 1,
		map,
		rooms: [],
		player: {
			position: { x: 3, y: 3 },
			hp: PLAYER_INITIAL_HP,
			maxHp: PLAYER_INITIAL_HP,
			ap: MAX_AP,
			maxAp: MAX_AP,
		},
		enemies: [],
		deck: {
			drawPile: [],
			hand: [],
			discardPile: [],
		},
		actionLog: [],
		rng: new RNG(12345),
		defeatedEnemyCount: 0,
		rewardState: null,
		isCleared: false,
		remnants: {},
		visitedTiles: new Set<string>(),
		lastAttackerEnemyType: null,
		...overrides,
	};
}

/**
 * テスト用Enemyを生成
 *
 * - overrides で type / position を上書きした場合、その値に基づいて hp/maxHp を再計算する
 *   （ただし overrides で hp/maxHp を個別指定すればそちらが優先される）
 * - 呼び出しごとに一意な id を自動採番する（overrides.id で明示指定も可）
 */
let __testEnemySeq = 0;
export function resetTestEnemySeq(): void {
	__testEnemySeq = 0;
}
export function createTestEnemy(
	type: EnemyType = "normal",
	position: Position = { x: 4, y: 3 },
	overrides?: Partial<Enemy>,
): Enemy {
	__testEnemySeq++;
	const finalType = overrides?.type ?? type;
	const finalPosition = overrides?.position ?? position;
	const { hp: typeHp } = ENEMY_PARAMS[finalType];
	return {
		id: `enemy-${__testEnemySeq}`,
		type: finalType,
		position: finalPosition,
		hp: typeHp,
		maxHp: typeHp,
		...overrides,
	};
}

/**
 * テスト用の手札を生成
 */
export function createTestHand(cards: CardType[]): Card[] {
	return cards.map((type, i) => ({
		id: `test-card-${i}`,
		type,
	}));
}
