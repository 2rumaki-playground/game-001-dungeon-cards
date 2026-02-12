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
		...overrides,
	};
}

/**
 * テスト用Enemyを生成
 */
export function createTestEnemy(
	type: EnemyType = "normal",
	position: Position = { x: 4, y: 3 },
	overrides?: Partial<Enemy>,
): Enemy {
	const { hp } = ENEMY_PARAMS[type];
	return {
		id: `enemy-${position.x}-${position.y}`,
		type,
		position,
		hp,
		maxHp: hp,
		...overrides,
	};
}

/**
 * テスト用の手札を生成
 */
export function createTestHand(cards: CardType[]): Card[] {
	return cards.map((type, i) => ({
		id: `card-${i}`,
		type,
	}));
}
