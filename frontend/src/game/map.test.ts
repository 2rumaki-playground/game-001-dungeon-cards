import { describe, expect, it } from "vitest";
import {
	BSP_MAP_HEIGHT,
	BSP_MAP_WIDTH,
	ENEMY_COUNT,
	MAP_HEIGHT,
	MAP_WIDTH,
} from "../constants";
import { RNG } from "../utils/rng";
import {
	createFixedLayoutMap,
	generateBSPMapPlacement,
	generateMapPlacement,
} from "./map";

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

	describe("generateBSPMapPlacement", () => {
		it("BSPマップが正しいサイズで生成される", () => {
			const rng = new RNG(42);
			const { map } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
			);

			expect(map.length).toBe(BSP_MAP_HEIGHT);
			for (const row of map) {
				expect(row.length).toBe(BSP_MAP_WIDTH);
			}
		});

		it("外周が壁タイルである", () => {
			const rng = new RNG(42);
			const { map } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
			);

			for (let x = 0; x < BSP_MAP_WIDTH; x++) {
				expect(map[0][x].type).toBe("wall");
				expect(map[BSP_MAP_HEIGHT - 1][x].type).toBe("wall");
			}
			for (let y = 0; y < BSP_MAP_HEIGHT; y++) {
				expect(map[y][0].type).toBe("wall");
				expect(map[y][BSP_MAP_WIDTH - 1].type).toBe("wall");
			}
		});

		it("プレイヤー/階段/敵の配置が重複しない", () => {
			const rng = new RNG(42);
			const { map, player, stairs, enemies } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
			);

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

		it("敵の数が正しい", () => {
			const rng = new RNG(42);
			const { enemies } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
			);

			expect(enemies.length).toBe(ENEMY_COUNT);
		});

		it("複数シードで安定して生成できる", () => {
			for (let seed = 0; seed < 20; seed++) {
				const rng = new RNG(seed);
				const { map, player, stairs, enemies } = generateBSPMapPlacement(
					rng,
					BSP_MAP_WIDTH,
					BSP_MAP_HEIGHT,
				);

				expect(map.length).toBe(BSP_MAP_HEIGHT);
				expect(map[player.y][player.x].type).toBe("floor");
				expect(map[stairs.y][stairs.x].type).toBe("stairs");
				expect(enemies.length).toBe(ENEMY_COUNT);
			}
		});
	});
});
