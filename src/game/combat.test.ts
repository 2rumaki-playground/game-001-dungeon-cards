import { beforeEach, describe, expect, it } from "vitest";
import {
	CLEAR_FLOOR,
	ENEMY_ATTACK_DAMAGE,
	ENEMY_HP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
} from "../constants";
import {
	createTestEnemy,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import { RNG } from "../utils/rng";
import {
	applyDamageToEnemy,
	applyDamageToPlayer,
	applyEnemyDamageToPlayer,
	checkGameOver,
	isDefeated,
} from "./combat";

beforeEach(() => resetTestEnemySeq());

describe("isDefeated", () => {
	it.each([
		["HP0", 0, true],
		["HP負", -1, true],
		["HP1以上", 1, false],
		["最大HP", PLAYER_INITIAL_HP, false],
	] as [
		string,
		number,
		boolean,
	][])("%sの場合を正しく判定する", (_, hp, expected) => {
		expect(isDefeated(hp)).toBe(expected);
	});
});

describe("applyDamageToEnemy", () => {
	it("敵のHPからダメージ量を減算する", () => {
		const enemy = createTestEnemy();
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.enemies[0].hp).toBe(ENEMY_HP - PLAYER_ATTACK_DAMAGE);
	});

	it("HP0以下の敵をマップから除去する", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.enemies).toHaveLength(0);
	});

	it("敵撃破時に行動ログを記録する", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.actionLog.length).toBeGreaterThan(0);
		expect(result.state.actionLog[0].message).toBe("敵を倒した");
	});

	it("ダメージ時に行動ログを記録する", () => {
		const enemy = createTestEnemy();
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.actionLog.length).toBeGreaterThan(0);
		expect(result.state.actionLog[0].message).toBe("敵にダメージを与えた");
	});

	it("複数の敵のうち1体にダメージを与えても他の敵は影響を受けない", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 });
		const enemy2 = createTestEnemy("normal", { x: 2, y: 3 });
		const state = createTestState({ enemies: [enemy1, enemy2] });
		const result = applyDamageToEnemy(state, enemy1.id, PLAYER_ATTACK_DAMAGE);

		const resultEnemy2 = result.state.enemies.find((e) => e.id === enemy2.id);
		expect(resultEnemy2).toBeDefined();
		expect(resultEnemy2?.hp).toBe(ENEMY_HP);
	});

	it("存在しない敵IDを指定した場合、状態が変更されない", () => {
		const state = createTestState();
		const result = applyDamageToEnemy(
			state,
			"nonexistent",
			PLAYER_ATTACK_DAMAGE,
		);

		expect(result.state).toBe(state);
		expect(result.state.actionLog).toHaveLength(0);
		expect(result.overkill).toBe(0);
		expect(result.defeated).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const enemy = createTestEnemy();
		const state = createTestState({ enemies: [enemy] });
		const originalHp = state.enemies[0].hp;

		applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(state.enemies[0].hp).toBe(originalHp);
	});

	it("敵撃破時にdefeatedEnemyCountがインクリメントされる", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		expect(state.defeatedEnemyCount).toBe(0);

		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);
		expect(result.state.defeatedEnemyCount).toBe(1);
	});

	it.each([
		["20F", CLEAR_FLOOR, true],
		["20F以外", 10, false],
	] as [
		string,
		number,
		boolean,
	][])("%sでボス撃破時のisCleared", (_, floor, expected) => {
		const enemy = createTestEnemy("boss", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy], floor });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.isCleared).toBe(expected);
	});

	it("敵撃破時にremnantsに撃破座標が記録される", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.remnants["4,3"]).toBe(1);
	});

	it("同一座標で2体撃破するとremnantsのカウントが2になる", () => {
		const enemy1 = createTestEnemy(
			"normal",
			{ x: 4, y: 3 },
			{ id: "e1", hp: 1 },
		);
		const enemy2 = createTestEnemy(
			"normal",
			{ x: 4, y: 3 },
			{ id: "e2", hp: 1 },
		);
		const state = createTestState({ enemies: [enemy1, enemy2] });
		let result = applyDamageToEnemy(state, enemy1.id, PLAYER_ATTACK_DAMAGE);
		result = applyDamageToEnemy(result.state, enemy2.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.remnants["4,3"]).toBe(2);
	});

	it("ダメージのみ（非撃破）ではremnantsが変わらない", () => {
		const enemy = createTestEnemy();
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.remnants).toEqual({});
	});

	it("ダメージのみ（非撃破）ではdefeatedEnemyCountが変わらない", () => {
		const enemy = createTestEnemy();
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.defeatedEnemyCount).toBe(0);
	});
});

describe("applyDamageToEnemy - オーバーキル", () => {
	it("ちょうど撃破時はoverkill=0, defeated=true", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, 1);

		expect(result.overkill).toBe(0);
		expect(result.defeated).toBe(true);
	});

	it("オーバーキル時はoverkill=超過分, defeated=true", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, 3);

		expect(result.overkill).toBe(2);
		expect(result.defeated).toBe(true);
	});

	it("非撃破時はoverkill=0, defeated=false", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, 1);

		expect(result.overkill).toBe(0);
		expect(result.defeated).toBe(false);
	});

	it("敵不在時はoverkill=0, defeated=false", () => {
		const state = createTestState();
		const result = applyDamageToEnemy(state, "nonexistent", 1);

		expect(result.overkill).toBe(0);
		expect(result.defeated).toBe(false);
	});
});

describe("applyDamageToPlayer", () => {
	it("プレイヤーのHPからダメージ量を減算する", () => {
		const state = createTestState();
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
	});

	it("ダメージ時に行動ログを記録する", () => {
		const state = createTestState();
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("プレイヤーがダメージを受けた");
	});

	it("HPが0以下になっても状態を返す（ゲームオーバー判定は別関数）", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalHp = state.player.hp;

		applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(state.player.hp).toBe(originalHp);
	});
});

describe("checkGameOver", () => {
	it.each([
		["HP0", 0],
		["HP負", -2],
	] as [
		string,
		number,
	][])("プレイヤー%sでゲームオーバー画面に遷移する", (_, hp) => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = checkGameOver(state);

		expect(result.screen).toBe("gameOver");
	});

	it("ゲームオーバー時に行動ログを記録する", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 0,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = checkGameOver(state);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("ゲームオーバー");
	});

	it("プレイヤーHP1以上の場合、状態が変更されない", () => {
		const state = createTestState();
		const result = checkGameOver(state);

		expect(result.screen).toBe("game");
		expect(result.actionLog).toHaveLength(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 0,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const originalScreen = state.screen;

		checkGameOver(state);

		expect(state.screen).toBe(originalScreen);
	});
});

describe("applyDamageToEnemy - カードドロップ", () => {
	it("敵撃破時に撃破カウンターが更新される", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.acquisitionCounters.defeatCounts.normal).toBe(1);
	});

	it("boss撃破時にcardExchangeQueueにエントリが追加される", () => {
		const enemy = createTestEnemy("boss", { x: 4, y: 3 }, { hp: 1 });
		// boss(100%)は必ずドロップ
		const state = createTestState({ enemies: [enemy] });
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.cardExchangeQueue).toHaveLength(1);
		expect(result.state.cardExchangeQueue[0].acquiredCardType).toBe("wait");
		expect(result.state.cardExchangeQueue[0].defeatedEnemyType).toBe("boss");
	});

	it("ドロップ確率に応じてcardExchangeQueueが変化する", () => {
		// normal(25%)を多数のseedで試す
		let withDrop = 0;
		let withoutDrop = 0;
		for (let seed = 0; seed < 100; seed++) {
			const enemy = createTestEnemy(
				"normal",
				{ x: 4, y: 3 },
				{
					id: `enemy-test-${seed}`,
					hp: 1,
				},
			);
			const state = createTestState({
				enemies: [enemy],
				rng: new RNG(seed),
			});
			const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);
			if (result.state.cardExchangeQueue.length > 0) {
				withDrop++;
			} else {
				withoutDrop++;
			}
		}
		// 当選と落選の両方が発生する
		expect(withDrop).toBeGreaterThan(0);
		expect(withoutDrop).toBeGreaterThan(0);
	});
});

describe("applyDamageToEnemy - XP付与", () => {
	it("敵撃破時にattackCardIdを渡すとカードのXPが増加する", () => {
		const card = {
			id: "atk-1",
			type: "attack" as const,
			level: 1,
			exp: 0,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({
			enemies: [enemy],
			deck: { hand: [card], usedCardIds: [] },
		});
		const result = applyDamageToEnemy(
			state,
			enemy.id,
			PLAYER_ATTACK_DAMAGE,
			"atk-1",
		);

		expect(result.state.deck.hand[0].exp).toBe(1);
	});

	it("敵撃破時にattackCardId未指定だとXP変化なし", () => {
		const card = {
			id: "atk-1",
			type: "attack" as const,
			level: 1,
			exp: 0,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({
			enemies: [enemy],
			deck: { hand: [card], usedCardIds: [] },
		});
		const result = applyDamageToEnemy(state, enemy.id, PLAYER_ATTACK_DAMAGE);

		expect(result.state.deck.hand[0].exp).toBe(0);
	});

	it("非撃破時にはXPが付与されない", () => {
		const card = {
			id: "atk-1",
			type: "attack" as const,
			level: 1,
			exp: 0,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({
			enemies: [enemy],
			deck: { hand: [card], usedCardIds: [] },
		});
		const result = applyDamageToEnemy(
			state,
			enemy.id,
			PLAYER_ATTACK_DAMAGE,
			"atk-1",
		);

		expect(result.state.deck.hand[0].exp).toBe(0);
	});

	it("レベルアップ時にログが記録される", () => {
		const card = {
			id: "atk-1",
			type: "attack" as const,
			level: 1,
			exp: 1,
			stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		};
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({
			enemies: [enemy],
			deck: { hand: [card], usedCardIds: [] },
		});
		const result = applyDamageToEnemy(
			state,
			enemy.id,
			PLAYER_ATTACK_DAMAGE,
			"atk-1",
		);

		const levelUpLog = result.state.actionLog.find((l) =>
			l.message.includes("Lv."),
		);
		expect(levelUpLog).toBeDefined();
	});
});

describe("applyEnemyDamageToPlayer", () => {
	it("HPが減少した場合、hitCounterが更新される", () => {
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(
			state,
			ENEMY_ATTACK_DAMAGE,
			"normal",
		);

		expect(result.acquisitionCounters.hitCounts.normal).toBe(1);
	});

	it("lastAttackerEnemyTypeが設定される", () => {
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(
			state,
			ENEMY_ATTACK_DAMAGE,
			"miniboss",
		);

		expect(result.lastAttackerEnemyType).toBe("miniboss");
	});

	it("ダメージ0でもlastAttackerEnemyTypeが設定される", () => {
		const state = createTestState();
		const result = applyEnemyDamageToPlayer(state, 0, "normal");

		expect(result.lastAttackerEnemyType).toBe("normal");
		expect(result.acquisitionCounters.hitCounts.normal).toBe(0);
	});
});
