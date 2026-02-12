import { describe, expect, it } from "vitest";
import {
	ENEMY_PARAMS,
	HAND_LIMIT,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import { RNG } from "../utils/rng";
import {
	createDebugDeckState,
	createDebugEnemies,
	startNewGameWithDebugParams,
} from "./debugStart";

describe("debugStart", () => {
	describe("createDebugDeckState", () => {
		it("CardType別の枚数が正しい", () => {
			const rng = new RNG(42);
			const deck = createDebugDeckState({ attack: 5, move: 3, jump: 2 }, rng);

			const allCards = deck.drawPile;
			expect(allCards.filter((c) => c.type === "attack")).toHaveLength(5);
			expect(allCards.filter((c) => c.type === "move")).toHaveLength(3);
			expect(allCards.filter((c) => c.type === "jump")).toHaveLength(2);
			expect(allCards).toHaveLength(10);
		});

		it("空のcompositionでは空デッキを返す", () => {
			const rng = new RNG(42);
			const deck = createDebugDeckState({}, rng);
			expect(deck.drawPile).toHaveLength(0);
			expect(deck.hand).toHaveLength(0);
			expect(deck.discardPile).toHaveLength(0);
		});

		it("カードがシャッフルされる", () => {
			const rng1 = new RNG(42);
			const rng2 = new RNG(99);
			const composition = { attack: 5, move: 5 };

			const deck1 = createDebugDeckState(composition, rng1);
			const deck2 = createDebugDeckState(composition, rng2);

			const types1 = deck1.drawPile.map((c) => c.type);
			const types2 = deck2.drawPile.map((c) => c.type);
			// 異なるシードでは並び順が異なる（確率的だが10枚あればほぼ確実）
			expect(types1).not.toEqual(types2);
		});

		it("手札と捨て札は空", () => {
			const rng = new RNG(42);
			const deck = createDebugDeckState({ attack: 3 }, rng);
			expect(deck.hand).toHaveLength(0);
			expect(deck.discardPile).toHaveLength(0);
		});

		it("不正なカードタイプを指定した場合はエラーになる", () => {
			const rng = new RNG(42);
			expect(() => {
				createDebugDeckState({ foo: 1 } as any, rng);
			}).toThrow();
		});

		it("負の count を指定した場合はエラーになる", () => {
			const rng = new RNG(42);
			expect(() => {
				createDebugDeckState({ attack: -1 } as any, rng);
			}).toThrow();
		});

		it("小数の count を指定した場合はエラーになる", () => {
			const rng = new RNG(42);
			expect(() => {
				createDebugDeckState({ attack: 1.5 } as any, rng);
			}).toThrow();
		});

		it("NaN の count を指定した場合はエラーになる", () => {
			const rng = new RNG(42);
			expect(() => {
				createDebugDeckState({ attack: Number.NaN } as any, rng);
			}).toThrow();
		});
	});

	describe("createDebugEnemies", () => {
		const positions = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
			{ x: 3, y: 3 },
			{ x: 4, y: 4 },
		];

		it("EnemyType別に配置される", () => {
			const enemies = createDebugEnemies(positions, {
				boss: 1,
				normal: 2,
			});

			expect(enemies).toHaveLength(3);
			expect(enemies.filter((e) => e.type === "boss")).toHaveLength(1);
			expect(enemies.filter((e) => e.type === "normal")).toHaveLength(2);
		});

		it("HPがENEMY_PARAMSに基づく", () => {
			const enemies = createDebugEnemies(positions, {
				boss: 1,
				heavy: 1,
			});

			const boss = enemies.find((e) => e.type === "boss");
			const heavy = enemies.find((e) => e.type === "heavy");
			expect(boss?.hp).toBe(ENEMY_PARAMS.boss.hp);
			expect(boss?.maxHp).toBe(ENEMY_PARAMS.boss.hp);
			expect(heavy?.hp).toBe(ENEMY_PARAMS.heavy.hp);
			expect(heavy?.maxHp).toBe(ENEMY_PARAMS.heavy.hp);
		});

		it("位置数を超える敵は切り詰められる", () => {
			const twoPositions = [
				{ x: 1, y: 1 },
				{ x: 2, y: 2 },
			];
			const enemies = createDebugEnemies(twoPositions, {
				normal: 5,
			});

			expect(enemies).toHaveLength(2);
		});

		it("空のcompositionでは敵なし", () => {
			const enemies = createDebugEnemies(positions, {});
			expect(enemies).toHaveLength(0);
		});

		it("敵IDが連番で付与される", () => {
			const enemies = createDebugEnemies(positions, {
				normal: 3,
			});

			expect(enemies[0].id).toBe("enemy-1");
			expect(enemies[1].id).toBe("enemy-2");
			expect(enemies[2].id).toBe("enemy-3");
		});
	});

	describe("startNewGameWithDebugParams", () => {
		it("パラメータ未指定でもデフォルトで開始できる", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {});

			expect(result.screen).toBe("game");
			expect(result.player.hp).toBe(PLAYER_INITIAL_HP);
			expect(result.player.ap).toBe(MAX_AP);
			expect(result.deck.hand.length).toBeGreaterThan(0);
		});

		it("floorが指定される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, { floor: 10 });

			expect(result.floor).toBe(10);
		});

		it("playerHpが反映される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, { playerHp: 1 });

			expect(result.player.hp).toBe(1);
		});

		it("playerMaxHpが反映される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {
				playerMaxHp: 50,
			});

			expect(result.player.maxHp).toBe(50);
			// playerHp未指定時はmaxHpと同じ
			expect(result.player.hp).toBe(50);
		});

		it("playerApが反映される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, { playerAp: 2 });

			expect(result.player.ap).toBe(2);
		});

		it("playerApがmaxApでクランプされる", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, { playerAp: 10 });

			expect(result.player.ap).toBe(result.player.maxAp);
		});

		it("playerHpがmaxHpでクランプされる", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, { playerHp: 999 });

			expect(result.player.hp).toBe(result.player.maxHp);
		});

		it("deckが反映される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {
				deck: { attack: 10 },
			});

			const allCards = [
				...result.deck.drawPile,
				...result.deck.hand,
				...result.deck.discardPile,
			];
			expect(allCards.every((c) => c.type === "attack")).toBe(true);
			expect(allCards).toHaveLength(10);
		});

		it("enemiesが反映される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {
				enemies: { boss: 1 },
			});

			const bosses = result.enemies.filter(
				(e: { type: string }) => e.type === "boss",
			);
			expect(bosses).toHaveLength(1);
			expect(bosses[0].hp).toBe(ENEMY_PARAMS.boss.hp);
		});

		it("seedが反映される", () => {
			const state = createTestState();
			const result1 = startNewGameWithDebugParams(state, { seed: 100 });
			const result2 = startNewGameWithDebugParams(state, { seed: 100 });

			// 同じシードなら同じマップ
			expect(result1.player.position).toEqual(result2.player.position);
		});

		it("元のstateを変更しない（イミュータブル）", () => {
			const state = createTestState();
			const originalHp = state.player.hp;
			const originalFloor = state.floor;

			startNewGameWithDebugParams(state, {
				floor: 99,
				playerHp: 1,
			});

			expect(state.player.hp).toBe(originalHp);
			expect(state.floor).toBe(originalFloor);
		});

		it("手札がHAND_LIMITまで補充される", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {
				deck: { attack: 20 },
			});

			expect(result.deck.hand).toHaveLength(HAND_LIMIT);
		});

		it("デッキ枚数がHAND_LIMIT未満のとき全カードが手札に入る", () => {
			const state = createTestState();
			const result = startNewGameWithDebugParams(state, {
				deck: { attack: 2 },
			});

			expect(result.deck.hand).toHaveLength(2);
			expect(result.deck.drawPile).toHaveLength(0);
		});
	});
});
