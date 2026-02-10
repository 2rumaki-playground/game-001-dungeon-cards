import { MAX_AP, PLAYER_INITIAL_HP } from "../constants";
import { createFixedLayoutMap } from "../game/map";
import type { GameMap, GameState } from "../types";
import { RNG } from "../utils/rng";

/**
 * テスト用の7x7マップを生成（外周壁・内側床）
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
		...overrides,
	};
}
