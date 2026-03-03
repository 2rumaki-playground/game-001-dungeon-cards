import { describe, expect, it } from "vitest";
import type { Enemy } from "../types";
import { findEnemyAt, hasEnemyAt } from "./enemyUtils";

const enemies: Enemy[] = [
	{
		id: "e1",
		type: "normal",
		position: { x: 2, y: 3 },
		hp: 3,
		maxHp: 3,
	},
	{
		id: "e2",
		type: "heavy",
		position: { x: 5, y: 1 },
		hp: 5,
		maxHp: 5,
	},
];

describe("findEnemyAt", () => {
	it("指定座標に敵がいる場合その敵を返す", () => {
		expect(findEnemyAt(enemies, 2, 3)).toBe(enemies[0]);
	});

	it("指定座標に敵がいない場合undefinedを返す", () => {
		expect(findEnemyAt(enemies, 0, 0)).toBeUndefined();
	});

	it("空配列の場合undefinedを返す", () => {
		expect(findEnemyAt([], 2, 3)).toBeUndefined();
	});
});

describe("hasEnemyAt", () => {
	it("指定座標に敵がいる場合trueを返す", () => {
		expect(hasEnemyAt(enemies, 2, 3)).toBe(true);
	});

	it("指定座標に敵がいない場合falseを返す", () => {
		expect(hasEnemyAt(enemies, 0, 0)).toBe(false);
	});

	it("excludeIdで指定した敵を除外して判定する", () => {
		expect(hasEnemyAt(enemies, 2, 3, "e1")).toBe(false);
	});

	it("excludeIdで指定した以外の敵がいればtrueを返す", () => {
		expect(hasEnemyAt(enemies, 5, 1, "e1")).toBe(true);
	});
});
