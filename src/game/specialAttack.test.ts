import { describe, expect, it } from "vitest";
import { PLAYER_STRONG_ATTACK_DAMAGE } from "../constants";
import {
	createTestEnemy,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Card } from "../types";
import { executeAttack, executeStrongAttack } from "./action";
import {
	applyKnockback,
	applyPierce,
	executeShockwave,
	findAttackTarget,
	findExtendedRangeTarget,
	getShockwaveTargets,
} from "./specialAttack";

function makeCard(overrides?: Partial<Card>): Card {
	return { id: "card-1", type: "attack", level: 1, exp: 0, ...overrides };
}

describe("findAttackTarget", () => {
	it("隣接1マスに敵がいる場合に発見する", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = findAttackTarget(state, "right", 1);
		expect(result).not.toBeNull();
		expect(result?.enemyId).toBe(enemy.id);
	});

	it("射程2で2マス先の敵を発見する", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = findAttackTarget(state, "right", 2);
		expect(result).not.toBeNull();
		expect(result?.enemyId).toBe(enemy.id);
	});

	it("射程1で2マス先の敵は発見しない", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = findAttackTarget(state, "right", 1);
		expect(result).toBeNull();
	});

	it("壁で走査が止まる", () => {
		// (3,3) → right: (4,3) floor, (5,3) floor, (6,3) wall
		// 壁の先に敵はいないが壁で止まる
		const state = createTestState({ enemies: [] });
		const result = findAttackTarget(state, "right", 10);
		expect(result).toBeNull();
	});

	it("壁の手前の敵を発見する", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = findAttackTarget(state, "right", 10);
		expect(result).not.toBeNull();
		expect(result?.enemyId).toBe(enemy.id);
	});

	it("マップ外方向では発見しない", () => {
		const state = createTestState({
			player: { position: { x: 0, y: 0 }, hp: 10, maxHp: 10 },
		});
		const result = findAttackTarget(state, "left", 1);
		expect(result).toBeNull();
	});

	it("敵がいない方向ではnullを返す", () => {
		const state = createTestState({ enemies: [] });
		const result = findAttackTarget(state, "right", 1);
		expect(result).toBeNull();
	});
});

describe("findExtendedRangeTarget", () => {
	it("2マス先までの敵を探す", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });
		const result = findExtendedRangeTarget(state, "right");
		expect(result).not.toBeNull();
		expect(result?.enemyId).toBe(enemy.id);
	});

	it("1マス先の敵が優先される", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy1, enemy2] });
		const result = findExtendedRangeTarget(state, "right");
		expect(result?.enemyId).toBe(enemy1.id);
	});

	it("壁越しの敵は発見しない", () => {
		// 壁の直後に敵がいるケースをシミュレート
		// テストマップ(7x7): 外周壁、内側(1,1)-(5,5)が床
		// プレイヤー(3,3)→right→(4,3)床,(5,3)床,(6,3)壁
		// 壁の先にはマップ外しかないが、壁で走査停止を確認
		const state = createTestState({ enemies: [] });
		const result = findExtendedRangeTarget(state, "right");
		expect(result).toBeNull();
	});
});

describe("applyPierce", () => {
	it("撃破位置の先にいる敵にoverkillダメージを適用する", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 3 });
		const state = createTestState({ enemies: [enemy] });

		const result = applyPierce(state, "right", 2, { x: 4, y: 3 }, "card-1");
		const target = result.enemies.find((e) => e.id === enemy.id);
		expect(target).toBeDefined();
		expect(target?.hp).toBe(3 - 2);
	});

	it("overkillが0の場合は何もしない", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });

		const result = applyPierce(state, "right", 0, { x: 4, y: 3 }, "card-1");
		expect(result).toBe(state);
	});

	it("先に敵がいない場合は状態が変わらない", () => {
		const state = createTestState({ enemies: [] });
		const result = applyPierce(state, "right", 5, { x: 4, y: 3 }, "card-1");
		// ログが追加されない＝stateと同じ
		expect(result.enemies).toHaveLength(0);
	});

	it("壁を越えて貫通しない", () => {
		// プレイヤー(3,3), 撃破位置(5,3), 壁(6,3), 壁の先はマップ外
		const state = createTestState({ enemies: [] });
		const result = applyPierce(state, "right", 5, { x: 5, y: 3 }, "card-1");
		expect(result.enemies).toHaveLength(0);
	});

	it("貫通ダメージで敵を撃破できる", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 1 });
		const state = createTestState({ enemies: [enemy] });

		const result = applyPierce(state, "right", 2, { x: 4, y: 3 }, "card-1");
		expect(result.enemies).toHaveLength(0);
	});
});

describe("Lv3攻撃カード: 貫通", () => {
	it("撃破時に余剰ダメージが奥の敵に伝播する", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemy1, enemy2],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 3, exp: 4 })],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(true);

		// enemy1が撃破され（Lv3: dmg=1+1=2, hp1なのでoverkill=1）
		// enemy2にoverkill=1が伝播
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].id).toBe(enemy2.id);
		expect(result.enemies[0].hp).toBe(3 - 1);
	});

	it("撃破しなければ貫通しない", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 5 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemy1, enemy2],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 3, exp: 4 })],
				usedCardIds: [],
			},
		});

		const { state: result } = executeAttack(state, "atk-1", "right");
		// enemy1生存→overkill=0→貫通なし
		expect(result.enemies).toHaveLength(2);
		expect(result.enemies[1].hp).toBe(3); // enemy2はノーダメージ
	});

	it("Lv1-2では貫通が発動しない", () => {
		const enemy1 = createTestEnemy("scout", { x: 4, y: 3 }, { hp: 1 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemy1, enemy2],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 2, exp: 2 })],
				usedCardIds: [],
			},
		});

		const { state: result } = executeAttack(state, "atk-1", "right");
		// Lv2: dmg=1+1=2, hp=1, overkill=1 だが貫通なし
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].hp).toBe(3); // enemy2ノーダメージ
	});
});

describe("Lv5攻撃カード: 射程延長 + 貫通", () => {
	it("2マス先の敵を攻撃できる", () => {
		const enemy = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 5 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 5, exp: 16 })],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(true);
		// Lv5: dmg=1+3=4
		expect(result.enemies[0].hp).toBe(5 - 4);
	});

	it("1マス先の敵が優先される", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 5 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 }, { hp: 5 });
		const state = createTestState({
			enemies: [enemy1, enemy2],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 5, exp: 16 })],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(true);
		expect(result.enemies.find((e) => e.id === enemy1.id)?.hp).toBe(5 - 4);
		expect(result.enemies.find((e) => e.id === enemy2.id)?.hp).toBe(5);
	});

	it("射程延長ヒット+貫通が発動する", () => {
		// 2マス先の敵を撃破して、さらに奥に貫通
		const enemy1 = createTestEnemy("scout", { x: 5, y: 3 }, { hp: 1 });
		const state = createTestState({
			enemies: [enemy1],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 5, exp: 16 })],
				usedCardIds: [],
			},
		});

		const {
			state: result,
			hit,
			overkill,
		} = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(true);
		expect(overkill).toBe(4 - 1); // dmg=4, hp=1
		expect(result.enemies).toHaveLength(0);
	});

	it("敵がいない場合は空振り", () => {
		const state = createTestState({
			enemies: [],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 5, exp: 16 })],
				usedCardIds: [],
			},
		});

		const { hit } = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(false);
	});

	it("壁越しの敵は攻撃できない", () => {
		// プレイヤー(3,3)→right, (4,3)床,(5,3)床,(6,3)壁
		// 射程2なので(4,3),(5,3)のみ探索
		const state = createTestState({
			enemies: [],
			deck: {
				hand: [makeCard({ id: "atk-1", type: "attack", level: 5, exp: 16 })],
				usedCardIds: [],
			},
		});

		const { hit } = executeAttack(state, "atk-1", "right");
		expect(hit).toBe(false);
	});
});

describe("applyKnockback", () => {
	it("敵を攻撃方向に1マス吹き飛ばす", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({ enemies: [enemy] });

		const result = applyKnockback(state, enemy.id, "right");
		const moved = result.enemies.find((e) => e.id === enemy.id);
		expect(moved?.position).toEqual({ x: 5, y: 3 });
	});

	it("壁がある場合はノックバックしない", () => {
		// (5,3)の敵→right→(6,3)は壁
		const enemy = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy] });

		const result = applyKnockback(state, enemy.id, "right");
		const notMoved = result.enemies.find((e) => e.id === enemy.id);
		expect(notMoved?.position).toEqual({ x: 5, y: 3 });
	});

	it("他の敵がいる場合はノックバックしない", () => {
		const enemy1 = createTestEnemy("normal", { x: 4, y: 3 });
		const enemy2 = createTestEnemy("normal", { x: 5, y: 3 });
		const state = createTestState({ enemies: [enemy1, enemy2] });

		const result = applyKnockback(state, enemy1.id, "right");
		const notMoved = result.enemies.find((e) => e.id === enemy1.id);
		expect(notMoved?.position).toEqual({ x: 4, y: 3 });
	});

	it("プレイヤーがいる場合はノックバックしない", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({
			enemies: [enemy],
			player: { position: { x: 5, y: 3 }, hp: 10, maxHp: 10 },
		});

		const result = applyKnockback(state, enemy.id, "right");
		const notMoved = result.enemies.find((e) => e.id === enemy.id);
		expect(notMoved?.position).toEqual({ x: 4, y: 3 });
	});

	it("存在しない敵IDでは状態が変わらない", () => {
		const state = createTestState({ enemies: [] });
		const result = applyKnockback(state, "nonexistent", "right");
		expect(result).toBe(state);
	});
});

describe("getShockwaveTargets", () => {
	it("right方向: 正面+上+下", () => {
		const targets = getShockwaveTargets({ x: 3, y: 3 }, "right");
		expect(targets).toEqual([
			{ x: 4, y: 3 }, // front
			{ x: 3, y: 4 }, // sideLeft (perpendicular)
			{ x: 3, y: 2 }, // sideRight (perpendicular)
		]);
	});

	it("up方向: 正面+右+左", () => {
		const targets = getShockwaveTargets({ x: 3, y: 3 }, "up");
		expect(targets).toEqual([
			{ x: 3, y: 2 }, // front
			{ x: 4, y: 3 }, // sideLeft (-delta.y=1, delta.x=0)
			{ x: 2, y: 3 }, // sideRight (delta.y=-1, -delta.x=0)
		]);
	});

	it("down方向: 正面+左+右", () => {
		const targets = getShockwaveTargets({ x: 3, y: 3 }, "down");
		expect(targets).toEqual([
			{ x: 3, y: 4 }, // front
			{ x: 2, y: 3 }, // sideLeft (-delta.y=-1, delta.x=0)
			{ x: 4, y: 3 }, // sideRight (delta.y=1, -delta.x=0)
		]);
	});

	it("left方向: 正面+下+上", () => {
		const targets = getShockwaveTargets({ x: 3, y: 3 }, "left");
		expect(targets).toEqual([
			{ x: 2, y: 3 }, // front
			{ x: 3, y: 2 }, // sideLeft
			{ x: 3, y: 4 }, // sideRight
		]);
	});
});

describe("executeShockwave", () => {
	it("正面+左右の敵にダメージを与える", () => {
		const enemyFront = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 5 });
		const enemySide1 = createTestEnemy("normal", { x: 3, y: 4 }, { hp: 3 });
		const enemySide2 = createTestEnemy("normal", { x: 3, y: 2 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemyFront, enemySide1, enemySide2],
		});

		const { state: result, hit } = executeShockwave(
			state,
			"right",
			3,
			"card-1",
		);
		expect(hit).toBe(true);
		expect(result.enemies.find((e) => e.id === enemyFront.id)?.hp).toBe(5 - 3);
		// サイドの敵はHP3-3=0で撃破
		expect(result.enemies.find((e) => e.id === enemySide1.id)).toBeUndefined();
		expect(result.enemies.find((e) => e.id === enemySide2.id)).toBeUndefined();
	});

	it("正面に敵がいない場合は空振り", () => {
		const enemySide = createTestEnemy("normal", { x: 3, y: 4 }, { hp: 3 });
		const state = createTestState({ enemies: [enemySide] });

		const { state: result, hit } = executeShockwave(
			state,
			"right",
			3,
			"card-1",
		);
		expect(hit).toBe(false);
		// サイドの敵はノーダメージ
		expect(result.enemies.find((e) => e.id === enemySide.id)?.hp).toBe(3);
	});

	it("正面が壁の場合は空振り", () => {
		// プレイヤー(1,1)→left→(0,1)は壁
		const state = createTestState({
			player: { position: { x: 1, y: 1 }, hp: 10, maxHp: 10 },
			enemies: [],
		});

		const { hit } = executeShockwave(state, "left", 3, "card-1");
		expect(hit).toBe(false);
	});

	it("生存した敵にノックバックが適用される", () => {
		const enemy = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 10 });
		const state = createTestState({ enemies: [enemy] });

		const { state: result, hit } = executeShockwave(
			state,
			"right",
			3,
			"card-1",
		);
		expect(hit).toBe(true);
		// HP10-3=7で生存、ノックバックで(5,3)へ
		const moved = result.enemies.find((e) => e.id === enemy.id);
		expect(moved?.hp).toBe(10 - 3);
		expect(moved?.position).toEqual({ x: 5, y: 3 });
	});

	it("サイドが壁/マップ外でも正面のダメージは適用される", () => {
		// プレイヤー(1,1)→down→正面(1,2), サイド左(2,1), サイド右(0,1)壁
		const enemy = createTestEnemy("normal", { x: 1, y: 2 }, { hp: 3 });
		const state = createTestState({
			player: { position: { x: 1, y: 1 }, hp: 10, maxHp: 10 },
			enemies: [enemy],
		});

		const { state: result, hit } = executeShockwave(state, "down", 3, "card-1");
		expect(hit).toBe(true);
		// 正面の敵は撃破
		expect(result.enemies.find((e) => e.id === enemy.id)).toBeUndefined();
	});
});

describe("Lv3強攻撃カード: ノックバック", () => {
	it("攻撃後に生存した敵を1マス吹き飛ばす", () => {
		const enemy = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 10 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 3,
						exp: 4,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		const moved = result.enemies.find((e) => e.id === enemy.id);
		// Lv3: dmg=3+1=4, 生存(hp=6), ノックバックで(5,3)へ
		expect(moved?.hp).toBe(10 - (PLAYER_STRONG_ATTACK_DAMAGE + 1));
		expect(moved?.position).toEqual({ x: 5, y: 3 });
	});

	it("撃破時はノックバックしない", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { hp: 1 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 3,
						exp: 4,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		expect(result.enemies).toHaveLength(0);
	});

	it("ノックバック先が壁の場合はノックバックしない", () => {
		// (5,3)の敵→right→(6,3)は壁
		const enemy = createTestEnemy("heavy", { x: 5, y: 3 }, { hp: 10 });
		const state = createTestState({
			enemies: [enemy],
			player: { position: { x: 4, y: 3 }, hp: 10, maxHp: 10 },
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 3,
						exp: 4,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		const notMoved = result.enemies.find((e) => e.id === enemy.id);
		expect(notMoved?.position).toEqual({ x: 5, y: 3 });
	});

	it("Lv1-2ではノックバックが発動しない", () => {
		const enemy = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 10 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 2,
						exp: 2,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		const notMoved = result.enemies.find((e) => e.id === enemy.id);
		expect(notMoved?.position).toEqual({ x: 4, y: 3 });
	});
});

describe("Lv5強攻撃カード: 衝撃波", () => {
	it("正面+左右の敵にダメージを与える", () => {
		const enemyFront = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 10 });
		const enemySide = createTestEnemy("normal", { x: 3, y: 4 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemyFront, enemySide],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 5,
						exp: 16,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		// Lv5: dmg=3+3=6
		const front = result.enemies.find((e) => e.id === enemyFront.id);
		expect(front?.hp).toBe(10 - 6);
		// サイドの敵はHP3-6=撃破
		expect(result.enemies.find((e) => e.id === enemySide.id)).toBeUndefined();
	});

	it("正面に敵がいない場合は空振り", () => {
		const enemySide = createTestEnemy("normal", { x: 3, y: 4 }, { hp: 3 });
		const state = createTestState({
			enemies: [enemySide],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 5,
						exp: 16,
					}),
				],
				usedCardIds: [],
			},
		});

		const { hit } = executeStrongAttack(state, "strong-1", "right");
		expect(hit).toBe(false);
	});

	it("衝撃波後に生存した敵がノックバックされる", () => {
		const enemy = createTestEnemy("heavy", { x: 4, y: 3 }, { hp: 15 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 5,
						exp: 16,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);
		expect(hit).toBe(true);
		const moved = result.enemies.find((e) => e.id === enemy.id);
		expect(moved?.hp).toBe(15 - 6);
		expect(moved?.position).toEqual({ x: 5, y: 3 });
	});

	it("カードが使用済みになる", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 });
		const state = createTestState({
			enemies: [enemy],
			deck: {
				hand: [
					makeCard({
						id: "strong-1",
						type: "strong_attack",
						level: 5,
						exp: 16,
					}),
				],
				usedCardIds: [],
			},
		});

		const { state: result } = executeStrongAttack(state, "strong-1", "right");
		expect(result.deck.usedCardIds).toContain("strong-1");
	});
});
