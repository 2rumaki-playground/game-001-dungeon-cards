import { describe, expect, it } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH } from "../constants";
import { createFixedLayoutMap, generateMapPlacement } from "./map";
import { RNG } from "../utils/rng";

describe("map", () => {
	describe("createFixedLayoutMap", () => {
		it("外周が壁、内側が床の固定レイアウト", () => {
			const map = createFixedLayoutMap();
			expect(map.length).toBe(MAP_HEIGHT);
			for (const row of map) {
				expect(row.length).toBe(MAP_WIDTH);
			}

			for (let y = 0; y < MAP_HEIGHT; y++) {
				for (let x = 0; x < MAP_WIDTH; x++) {
					const isBoundary =
						x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
					const expected = isBoundary ? "wall" : "floor";
					expect(map[y][x].type).toBe(expected);
				}
			}
		});
	});

	describe("generateMapPlacement", () => {
		it("プレイヤー/階段/敵の配置が重複しない", () => {
			const rng = new RNG(12345);
			const { map, player, stairs, enemies } = generateMapPlacement(rng);

			const positions = [
				`${player.x},${player.y}`,
				`${stairs.x},${stairs.y}`,
				...enemies.map((enemy) => `${enemy.x},${enemy.y}`),
			];
			const unique = new Set(positions);
			expect(unique.size).toBe(positions.length);

			expect(map[player.y][player.x].type).toBe("floor");
			expect(map[stairs.y][stairs.x].type).toBe("stairs");
			for (const enemy of enemies) {
				expect(map[enemy.y][enemy.x].type).toBe("floor");
			}
		});
	});
});
