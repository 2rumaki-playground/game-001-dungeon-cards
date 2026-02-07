import { describe, expect, it } from "vitest";
import {
	BSP_MAP_HEIGHT,
	BSP_MAP_WIDTH,
	BSP_MAX_DEPTH,
	BSP_MIN_PARTITION_SIZE,
	BSP_MIN_ROOM_SIZE,
} from "../constants";
import type { GameMap, Tile } from "../types";
import { RNG } from "../utils/rng";
import {
	type BSPNode,
	buildBSPTree,
	connectSiblings,
	generateBSPMap,
	placeRoomInPartition,
	type Rectangle,
	splitPartition,
} from "./bsp";

describe("bsp", () => {
	describe("splitPartition", () => {
		it("縦分割で2つのパーティションに分割される", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 10, height: 7 };
			const rng = new RNG(42);
			const result = splitPartition(partition, "vertical", rng);

			expect(result).not.toBeNull();
			if (!result) return;

			const [left, right] = result;
			expect(left.width + right.width).toBe(partition.width);
			expect(left.height).toBe(partition.height);
			expect(right.height).toBe(partition.height);
			expect(left.x).toBe(partition.x);
			expect(right.x).toBe(partition.x + left.width);
			expect(left.width).toBeGreaterThanOrEqual(BSP_MIN_PARTITION_SIZE);
			expect(right.width).toBeGreaterThanOrEqual(BSP_MIN_PARTITION_SIZE);
		});

		it("横分割で2つのパーティションに分割される", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 7, height: 10 };
			const rng = new RNG(42);
			const result = splitPartition(partition, "horizontal", rng);

			expect(result).not.toBeNull();
			if (!result) return;

			const [top, bottom] = result;
			expect(top.height + bottom.height).toBe(partition.height);
			expect(top.width).toBe(partition.width);
			expect(bottom.width).toBe(partition.width);
			expect(top.y).toBe(partition.y);
			expect(bottom.y).toBe(partition.y + top.height);
			expect(top.height).toBeGreaterThanOrEqual(BSP_MIN_PARTITION_SIZE);
			expect(bottom.height).toBeGreaterThanOrEqual(BSP_MIN_PARTITION_SIZE);
		});

		it("パーティションが小さすぎる場合はnullを返す", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 8, height: 5 };
			const rng = new RNG(42);
			// width=8, 最小=5なので8-5=3 < 5でnull
			// 実際は minSplit=5, maxSplit=8-5=3 なので minSplit > maxSplit
			const result = splitPartition(partition, "vertical", rng);
			expect(result).toBeNull();
		});

		it("ちょうど最小サイズ×2のパーティションは分割できる", () => {
			const partition: Rectangle = {
				x: 0,
				y: 0,
				width: BSP_MIN_PARTITION_SIZE * 2,
				height: 7,
			};
			const rng = new RNG(42);
			const result = splitPartition(partition, "vertical", rng);

			expect(result).not.toBeNull();
			if (!result) return;

			// 唯一の分割点なので両方ともちょうど最小サイズ
			expect(result[0].width).toBe(BSP_MIN_PARTITION_SIZE);
			expect(result[1].width).toBe(BSP_MIN_PARTITION_SIZE);
		});
	});

	describe("buildBSPTree", () => {
		it("最大深度で分割が停止する", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 20, height: 20 };
			const rng = new RNG(42);
			const tree = buildBSPTree(partition, 0, BSP_MAX_DEPTH, rng);

			function getMaxDepth(node: BSPNode, depth: number): number {
				if (!node.left && !node.right) return depth;
				let maxD = depth;
				if (node.left) maxD = Math.max(maxD, getMaxDepth(node.left, depth + 1));
				if (node.right)
					maxD = Math.max(maxD, getMaxDepth(node.right, depth + 1));
				return maxD;
			}

			expect(getMaxDepth(tree, 0)).toBeLessThanOrEqual(BSP_MAX_DEPTH);
		});

		it("末端ノードは最小パーティションサイズ以上", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 20, height: 20 };
			const rng = new RNG(42);
			const tree = buildBSPTree(partition, 0, BSP_MAX_DEPTH, rng);

			function checkLeafSizes(node: BSPNode): void {
				if (!node.left && !node.right) {
					expect(node.partition.width).toBeGreaterThanOrEqual(
						BSP_MIN_PARTITION_SIZE,
					);
					expect(node.partition.height).toBeGreaterThanOrEqual(
						BSP_MIN_PARTITION_SIZE,
					);
					return;
				}
				if (node.left) checkLeafSizes(node.left);
				if (node.right) checkLeafSizes(node.right);
			}

			checkLeafSizes(tree);
		});

		it("小さすぎるパーティションでは分割しない", () => {
			const partition: Rectangle = {
				x: 0,
				y: 0,
				width: BSP_MIN_PARTITION_SIZE,
				height: BSP_MIN_PARTITION_SIZE,
			};
			const rng = new RNG(42);
			const tree = buildBSPTree(partition, 0, BSP_MAX_DEPTH, rng);

			expect(tree.left).toBeUndefined();
			expect(tree.right).toBeUndefined();
		});
	});

	describe("placeRoomInPartition", () => {
		it("部屋が最小サイズ以上", () => {
			const partition: Rectangle = { x: 0, y: 0, width: 7, height: 7 };
			const rng = new RNG(42);
			const room = placeRoomInPartition(partition, rng);

			expect(room.width).toBeGreaterThanOrEqual(BSP_MIN_ROOM_SIZE);
			expect(room.height).toBeGreaterThanOrEqual(BSP_MIN_ROOM_SIZE);
		});

		it("部屋の壁込み外形がパーティション内に収まる", () => {
			const partition: Rectangle = { x: 2, y: 3, width: 8, height: 6 };

			for (let i = 0; i < 20; i++) {
				const room = placeRoomInPartition(partition, new RNG(i));
				// 部屋の壁込み外形: (room.x - 1, room.y - 1) からの (room.width + 2, room.height + 2)
				// マップ座標での外形左上 = room.x - 1, room.y - 1
				// パーティション左上のマップ座標 = partition.x + 1
				// 外形左上 >= パーティション左上のマップ座標
				const outerMapX = room.x - 1;
				const outerMapY = room.y - 1;
				const outerW = room.width + 2;
				const outerH = room.height + 2;
				const partMapX = partition.x + 1;
				const partMapY = partition.y + 1;

				expect(outerMapX).toBeGreaterThanOrEqual(partMapX);
				expect(outerMapY).toBeGreaterThanOrEqual(partMapY);
				expect(outerMapX + outerW).toBeLessThanOrEqual(
					partMapX + partition.width,
				);
				expect(outerMapY + outerH).toBeLessThanOrEqual(
					partMapY + partition.height,
				);
			}
		});

		it("最小パーティションにちょうど最小部屋が収まる", () => {
			const partition: Rectangle = {
				x: 0,
				y: 0,
				width: BSP_MIN_PARTITION_SIZE,
				height: BSP_MIN_PARTITION_SIZE,
			};
			const rng = new RNG(42);
			const room = placeRoomInPartition(partition, rng);

			expect(room.width).toBe(BSP_MIN_ROOM_SIZE);
			expect(room.height).toBe(BSP_MIN_ROOM_SIZE);
		});
	});

	describe("connectSiblings", () => {
		it("通路が床タイルで描画される", () => {
			const width = 15;
			const height = 15;
			const map = Array.from({ length: height }, () =>
				Array.from({ length: width }, () => ({ type: "wall" }) as Tile),
			) as GameMap;

			// 2つの部屋を持つノードを作成
			const left: BSPNode = {
				partition: { x: 0, y: 0, width: 7, height: 13 },
				room: { x: 3, y: 3, width: 3, height: 3 },
			};
			const right: BSPNode = {
				partition: { x: 7, y: 0, width: 6, height: 13 },
				room: { x: 10, y: 10, width: 3, height: 3 },
			};

			// 部屋を描画
			for (const node of [left, right]) {
				if (node.room) {
					for (let y = node.room.y; y < node.room.y + node.room.height; y++) {
						for (let x = node.room.x; x < node.room.x + node.room.width; x++) {
							map[y][x] = { type: "floor" };
						}
					}
				}
			}

			connectSiblings(map, left, right);

			// 通路が存在することを確認（2部屋間の床タイル数が増えている）
			let floorCount = 0;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (map[y][x].type === "floor") floorCount++;
				}
			}
			// 部屋の床タイル（3*3*2=18）+ 通路の床タイル
			expect(floorCount).toBeGreaterThan(18);
		});

		it("通路が外周壁を侵さない", () => {
			const width = 15;
			const height = 15;
			const map = Array.from({ length: height }, () =>
				Array.from({ length: width }, () => ({ type: "wall" }) as Tile),
			) as GameMap;

			const left: BSPNode = {
				partition: { x: 0, y: 0, width: 7, height: 13 },
				room: { x: 2, y: 2, width: 3, height: 3 },
			};
			const right: BSPNode = {
				partition: { x: 7, y: 0, width: 6, height: 13 },
				room: { x: 10, y: 10, width: 3, height: 3 },
			};

			connectSiblings(map, left, right);

			// 外周は壁のまま
			for (let x = 0; x < width; x++) {
				expect(map[0][x].type).toBe("wall");
				expect(map[height - 1][x].type).toBe("wall");
			}
			for (let y = 0; y < height; y++) {
				expect(map[y][0].type).toBe("wall");
				expect(map[y][width - 1].type).toBe("wall");
			}
		});
	});

	describe("generateBSPMap", () => {
		it("マップが正しく生成される", () => {
			const rng = new RNG(42);
			const map = generateBSPMap(BSP_MAP_WIDTH, BSP_MAP_HEIGHT, rng, 5);

			expect(map).not.toBeNull();
			if (!map) return;

			expect(map.length).toBe(BSP_MAP_HEIGHT);
			for (const row of map) {
				expect(row.length).toBe(BSP_MAP_WIDTH);
			}
		});

		it("外周が壁タイルである", () => {
			const rng = new RNG(42);
			const map = generateBSPMap(BSP_MAP_WIDTH, BSP_MAP_HEIGHT, rng, 5);
			if (!map) return;

			for (let x = 0; x < BSP_MAP_WIDTH; x++) {
				expect(map[0][x].type).toBe("wall");
				expect(map[BSP_MAP_HEIGHT - 1][x].type).toBe("wall");
			}
			for (let y = 0; y < BSP_MAP_HEIGHT; y++) {
				expect(map[y][0].type).toBe("wall");
				expect(map[y][BSP_MAP_WIDTH - 1].type).toBe("wall");
			}
		});

		it("十分な床タイルが生成される", () => {
			const rng = new RNG(42);
			const requiredTiles = 5;
			const map = generateBSPMap(
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
				rng,
				requiredTiles,
			);

			expect(map).not.toBeNull();
			if (!map) return;

			let floorCount = 0;
			for (let y = 0; y < BSP_MAP_HEIGHT; y++) {
				for (let x = 0; x < BSP_MAP_WIDTH; x++) {
					if (map[y][x].type === "floor") floorCount++;
				}
			}
			expect(floorCount).toBeGreaterThanOrEqual(requiredTiles);
		});

		it("異なるシードで異なるマップが生成される", () => {
			// 分割の多様性を検証するため、十分大きなマップサイズを使用
			const testSize = 15;
			const map1 = generateBSPMap(testSize, testSize, new RNG(42), 5);
			const map2 = generateBSPMap(testSize, testSize, new RNG(999), 5);

			expect(map1).not.toBeNull();
			expect(map2).not.toBeNull();
			if (!map1 || !map2) return;

			let different = false;
			for (let y = 0; y < testSize && !different; y++) {
				for (let x = 0; x < testSize && !different; x++) {
					if (map1[y][x].type !== map2[y][x].type) {
						different = true;
					}
				}
			}
			expect(different).toBe(true);
		});

		it("同じシードで同じマップが生成される（再現性）", () => {
			const map1 = generateBSPMap(
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
				new RNG(12345),
				5,
			);
			const map2 = generateBSPMap(
				BSP_MAP_WIDTH,
				BSP_MAP_HEIGHT,
				new RNG(12345),
				5,
			);

			expect(map1).not.toBeNull();
			expect(map2).not.toBeNull();
			if (!map1 || !map2) return;

			for (let y = 0; y < BSP_MAP_HEIGHT; y++) {
				for (let x = 0; x < BSP_MAP_WIDTH; x++) {
					expect(map1[y][x].type).toBe(map2[y][x].type);
				}
			}
		});

		it("床タイル数が不足する場合はnullを返す", () => {
			const rng = new RNG(42);
			// 非常に大きな数を要求
			const map = generateBSPMap(BSP_MAP_WIDTH, BSP_MAP_HEIGHT, rng, 1000);
			expect(map).toBeNull();
		});

		it("マップサイズが小さすぎる場合はnullを返す", () => {
			const rng = new RNG(42);
			// 最小サイズ = BSP_MIN_PARTITION_SIZE + 2 = 7
			expect(generateBSPMap(6, 12, rng, 5)).toBeNull();
			expect(generateBSPMap(12, 6, rng, 5)).toBeNull();
			expect(generateBSPMap(3, 3, rng, 5)).toBeNull();
		});

		it("複数シードで安定して生成できる", () => {
			let successCount = 0;
			for (let seed = 0; seed < 50; seed++) {
				const rng = new RNG(seed);
				const map = generateBSPMap(BSP_MAP_WIDTH, BSP_MAP_HEIGHT, rng, 5);
				if (map) successCount++;
			}
			// 大多数のシードで生成できるはず
			expect(successCount).toBeGreaterThanOrEqual(45);
		});
	});
});
