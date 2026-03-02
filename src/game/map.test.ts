import { describe, expect, it } from "vitest";
import {
	BSP_MAP_HEIGHT,
	BSP_MAP_WIDTH,
	getCrackedWallCount,
	getEnemyCount,
	getMapSize,
	getSpecialTileCount,
	MAP_HEIGHT,
	MAP_WIDTH,
} from "../constants";
import { RNG } from "../utils/rng";
import {
	createFixedLayoutMap,
	generateBSPMapPlacement,
	generateMapPlacement,
	isInBounds,
} from "./map";
import { findRoomAt } from "./roomUtils";

describe("isInBounds", () => {
	const map = createFixedLayoutMap(5, 5);

	it("マップ内の座標はtrueを返す", () => {
		expect(isInBounds(map, 0, 0)).toBe(true);
		expect(isInBounds(map, 2, 2)).toBe(true);
		expect(isInBounds(map, 4, 4)).toBe(true);
	});

	it("負の座標はfalseを返す", () => {
		expect(isInBounds(map, -1, 0)).toBe(false);
		expect(isInBounds(map, 0, -1)).toBe(false);
		expect(isInBounds(map, -1, -1)).toBe(false);
	});

	it("マップサイズ以上の座標はfalseを返す", () => {
		expect(isInBounds(map, 5, 0)).toBe(false);
		expect(isInBounds(map, 0, 5)).toBe(false);
		expect(isInBounds(map, 5, 5)).toBe(false);
	});

	it("境界値（最大インデックス）はtrueを返す", () => {
		expect(isInBounds(map, 4, 4)).toBe(true);
	});

	it("空マップはfalseを返す", () => {
		const emptyMap: ReturnType<typeof createFixedLayoutMap> = [];
		expect(isInBounds(emptyMap, 0, 0)).toBe(false);
	});
});

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
		it("プレイヤー/階段/敵/特殊タイルの配置が重複しない", () => {
			const rng = new RNG(12345);
			const floor = 1;
			const { map, player, stairs, enemies, specialTiles } =
				generateMapPlacement(rng, floor);

			const positions = [
				`${player.x},${player.y}`,
				`${stairs.x},${stairs.y}`,
				...enemies.map((enemy) => `${enemy.x},${enemy.y}`),
				...specialTiles.map((st) => `${st.position.x},${st.position.y}`),
			];
			const unique = new Set(positions);
			expect(unique.size).toBe(positions.length);

			expect(map[player.y][player.x].type).toBe("floor");
			expect(map[stairs.y][stairs.x].type).toBe("stairs");
			for (const enemy of enemies) {
				expect(map[enemy.y][enemy.x].type).toBe("floor");
			}
			for (const st of specialTiles) {
				expect(map[st.position.y][st.position.x].type).toBe(st.type);
			}
		});

		it("特殊タイルの配置数が階層に応じて正しい", () => {
			const rng = new RNG(42);
			const floor = 1;
			const { specialTiles } = generateMapPlacement(rng, floor);

			expect(specialTiles.length).toBe(getSpecialTileCount(floor));
		});
	});

	describe("generateMapPlacement - 階層別サイズ", () => {
		it("階層1のマップは9x9", () => {
			const rng = new RNG(42);
			const { map } = generateMapPlacement(rng, 1);
			expect(map.length).toBe(9);
			expect(map[0].length).toBe(9);
		});

		it("階層3のマップは11x11", () => {
			const rng = new RNG(42);
			const { map } = generateMapPlacement(rng, 3);
			expect(map.length).toBe(11);
			expect(map[0].length).toBe(11);
		});

		it("階層5のマップは13x13", () => {
			const rng = new RNG(42);
			const { map } = generateMapPlacement(rng, 5);
			expect(map.length).toBe(13);
			expect(map[0].length).toBe(13);
		});

		it("階層7のマップは15x15", () => {
			const rng = new RNG(42);
			const { map } = generateMapPlacement(rng, 7);
			expect(map.length).toBe(15);
			expect(map[0].length).toBe(15);
		});
	});

	describe("generateMapPlacement - 階層別敵数", () => {
		it("階層1: 敵3体", () => {
			const rng = new RNG(42);
			const { enemies } = generateMapPlacement(rng, 1);
			expect(enemies.length).toBe(3);
		});

		it("階層3: 敵4体", () => {
			const rng = new RNG(42);
			const { enemies } = generateMapPlacement(rng, 3);
			expect(enemies.length).toBe(4);
		});

		it("階層5: 敵5体", () => {
			const rng = new RNG(42);
			const { enemies } = generateMapPlacement(rng, 5);
			expect(enemies.length).toBe(5);
		});

		it("階層7: 敵6体", () => {
			const rng = new RNG(42);
			const { enemies } = generateMapPlacement(rng, 7);
			expect(enemies.length).toBe(6);
		});

		it("複数シードで各階層のマップが安定して生成できる", () => {
			for (const floor of [1, 3, 5, 7]) {
				for (let seed = 0; seed < 10; seed++) {
					const rng = new RNG(seed);
					const result = generateMapPlacement(rng, floor);
					const expectedSize = getMapSize(floor);
					expect(result.map.length).toBe(expectedSize.height);
					expect(result.map[0].length).toBe(expectedSize.width);
					expect(result.enemies.length).toBe(getEnemyCount(floor));
				}
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

		it("プレイヤー/階段/敵/特殊タイルの配置が重複しない", () => {
			const rng = new RNG(42);
			const floor = 1;
			const { map, player, stairs, enemies, specialTiles } =
				generateBSPMapPlacement(rng, BSP_MAP_WIDTH, BSP_MAP_HEIGHT, floor);

			const positions = [
				`${player.x},${player.y}`,
				`${stairs.x},${stairs.y}`,
				...enemies.map((enemy) => `${enemy.x},${enemy.y}`),
				...specialTiles.map((st) => `${st.position.x},${st.position.y}`),
			];
			const unique = new Set(positions);
			expect(unique.size).toBe(positions.length);

			expect(map[player.y][player.x].type).toBe("floor");
			expect(map[stairs.y][stairs.x].type).toBe("stairs");
			for (const enemy of enemies) {
				expect(map[enemy.y][enemy.x].type).toBe("floor");
			}
			for (const st of specialTiles) {
				expect(map[st.position.y][st.position.x].type).toBe(st.type);
			}
		});

		it("敵の数が正しい", () => {
			const rng = new RNG(42);
			const floor = 1;
			const { enemies } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
				floor,
			);

			expect(enemies.length).toBe(getEnemyCount(floor));
		});

		it("特殊タイルの配置数が正しい", () => {
			const rng = new RNG(42);
			const floor = 1;
			const { specialTiles } = generateBSPMapPlacement(
				rng,
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
				floor,
			);

			expect(specialTiles.length).toBe(getSpecialTileCount(floor));
		});

		it("リトライ上限到達時は指定サイズの固定マップにフォールバックする", () => {
			const rng = new RNG(42);
			// BSP_MIN_PARTITION_SIZE(5)+2未満のサイズでBSP生成が必ず失敗する
			// フォールバック時も渡されたサイズで固定マップが生成される
			const result = generateBSPMapPlacement(rng, 6, 6, 1);

			expect(result.map.length).toBe(6);
			for (const row of result.map) {
				expect(row.length).toBe(6);
			}
		});

		it("複数シードで安定して生成できる", () => {
			const floor = 1;
			for (let seed = 0; seed < 20; seed++) {
				const rng = new RNG(seed);
				const { map, player, stairs, enemies, specialTiles } =
					generateBSPMapPlacement(rng, BSP_MAP_WIDTH, BSP_MAP_HEIGHT, floor);

				expect(map.length).toBe(BSP_MAP_HEIGHT);
				expect(map[player.y][player.x].type).toBe("floor");
				expect(map[stairs.y][stairs.x].type).toBe("stairs");
				expect(enemies.length).toBe(getEnemyCount(floor));
				expect(specialTiles.length).toBe(getSpecialTileCount(floor));
			}
		});

		it("cracked_wallの配置数がmin(target, 候補数)と一致する", () => {
			for (const floor of [5, 7, 10]) {
				const target = getCrackedWallCount(floor);
				for (let seed = 0; seed < 20; seed++) {
					const rng = new RNG(seed);
					const { width, height } = getMapSize(floor);
					const { map, rooms } = generateBSPMapPlacement(
						rng,
						width,
						height,
						floor,
					);
					// 配置済みcracked_wall数をカウント
					let crackedWallCount = 0;
					// 候補壁タイル数をカウント（cracked_wall/wallで異なる2部屋を隔てるもの）
					let candidateCount = 0;
					for (let y = 1; y < height - 1; y++) {
						for (let x = 1; x < width - 1; x++) {
							const tile = map[y][x].type;
							if (tile === "cracked_wall") {
								crackedWallCount++;
							}
							if (tile !== "wall" && tile !== "cracked_wall") continue;
							const roomL = findRoomAt({ x: x - 1, y }, rooms);
							const roomR = findRoomAt({ x: x + 1, y }, rooms);
							const roomT = findRoomAt({ x, y: y - 1 }, rooms);
							const roomB = findRoomAt({ x, y: y + 1 }, rooms);
							if (
								(roomL && roomR && roomL !== roomR) ||
								(roomT && roomB && roomT !== roomB)
							) {
								candidateCount++;
							}
						}
					}
					expect(crackedWallCount).toBe(Math.min(target, candidateCount));
				}
			}
		});

		it("cracked_wallは外周1マスには配置されない", () => {
			for (const floor of [5, 7]) {
				for (let seed = 0; seed < 20; seed++) {
					const rng = new RNG(seed);
					const { width, height } = getMapSize(floor);
					const { map } = generateBSPMapPlacement(rng, width, height, floor);
					for (let x = 0; x < width; x++) {
						expect(map[0][x].type).not.toBe("cracked_wall");
						expect(map[height - 1][x].type).not.toBe("cracked_wall");
					}
					for (let y = 0; y < height; y++) {
						expect(map[y][0].type).not.toBe("cracked_wall");
						expect(map[y][width - 1].type).not.toBe("cracked_wall");
					}
				}
			}
		});

		it("階層1-4ではcracked_wallが配置されない", () => {
			for (const floor of [1, 2, 3, 4]) {
				const rng = new RNG(42);
				const { width, height } = getMapSize(floor);
				const { map } = generateBSPMapPlacement(rng, width, height, floor);
				for (const row of map) {
					for (const tile of row) {
						expect(tile.type).not.toBe("cracked_wall");
					}
				}
			}
		});

		it("階段が部屋内に配置される", () => {
			for (let seed = 0; seed < 20; seed++) {
				const rng = new RNG(seed);
				const { rooms, stairs } = generateBSPMapPlacement(
					rng,
					BSP_MAP_WIDTH,
					BSP_MAP_HEIGHT,
					1,
				);
				const inRoom = rooms.some(
					(room) =>
						stairs.x >= room.x &&
						stairs.x < room.x + room.width &&
						stairs.y >= room.y &&
						stairs.y < room.y + room.height,
				);
				expect(inRoom).toBe(true);
			}
		});
	});
});
