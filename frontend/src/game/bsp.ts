/**
 * BSP（Binary Space Partitioning）によるマップ生成
 * @see docs/spec/mapgen.md
 */

import {
	BSP_CORRIDOR_WIDTH,
	BSP_MAX_DEPTH,
	BSP_MIN_PARTITION_SIZE,
	BSP_MIN_ROOM_SIZE,
} from "../constants";
import type { GameMap, Tile } from "../types";
import type { RNG } from "../utils/rng";

/** パーティション矩形（内側領域基準） */
export type Rectangle = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** 部屋（マップ座標基準、内部床サイズ） */
export type Room = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** BSP木ノード */
export type BSPNode = {
	partition: Rectangle;
	room?: Room;
	left?: BSPNode;
	right?: BSPNode;
};

/**
 * パーティションを二分割する
 * @returns 分割後の2つのパーティション、または分割不可の場合null
 */
export function splitPartition(
	partition: Rectangle,
	direction: "horizontal" | "vertical",
	rng: RNG,
): [Rectangle, Rectangle] | null {
	if (direction === "vertical") {
		// 縦分割: 左右に分ける
		const minSplit = BSP_MIN_PARTITION_SIZE;
		const maxSplit = partition.width - BSP_MIN_PARTITION_SIZE;
		if (minSplit > maxSplit) return null;

		const split = rng.randomInt(minSplit, maxSplit + 1);
		return [
			{
				x: partition.x,
				y: partition.y,
				width: split,
				height: partition.height,
			},
			{
				x: partition.x + split,
				y: partition.y,
				width: partition.width - split,
				height: partition.height,
			},
		];
	}

	// 横分割: 上下に分ける
	const minSplit = BSP_MIN_PARTITION_SIZE;
	const maxSplit = partition.height - BSP_MIN_PARTITION_SIZE;
	if (minSplit > maxSplit) return null;

	const split = rng.randomInt(minSplit, maxSplit + 1);
	return [
		{ x: partition.x, y: partition.y, width: partition.width, height: split },
		{
			x: partition.x,
			y: partition.y + split,
			width: partition.width,
			height: partition.height - split,
		},
	];
}

/**
 * 再帰的にBSP木を構築する
 */
export function buildBSPTree(
	partition: Rectangle,
	depth: number,
	maxDepth: number,
	rng: RNG,
): BSPNode {
	if (depth >= maxDepth) {
		return { partition };
	}

	// 分割方向: 縦横交互 + ランダム要素
	const baseDirection: "horizontal" | "vertical" =
		depth % 2 === 0 ? "vertical" : "horizontal";
	const direction =
		rng.random() < 0.3
			? baseDirection === "vertical"
				? "horizontal"
				: "vertical"
			: baseDirection;

	const result = splitPartition(partition, direction, rng);

	// 分割不可の場合、逆方向を試す
	if (!result) {
		const altDirection = direction === "vertical" ? "horizontal" : "vertical";
		const altResult = splitPartition(partition, altDirection, rng);
		if (!altResult) {
			return { partition };
		}
		return {
			partition,
			left: buildBSPTree(altResult[0], depth + 1, maxDepth, rng),
			right: buildBSPTree(altResult[1], depth + 1, maxDepth, rng),
		};
	}

	return {
		partition,
		left: buildBSPTree(result[0], depth + 1, maxDepth, rng),
		right: buildBSPTree(result[1], depth + 1, maxDepth, rng),
	};
}

/**
 * パーティション内にランダムな位置・サイズの部屋を配置する
 * 部屋の内部サイズはBSP_MIN_ROOM_SIZE以上、壁込み外形がパーティション内に収まる範囲
 */
export function placeRoomInPartition(partition: Rectangle, rng: RNG): Room {
	// 壁込み外形サイズ = 内部サイズ + 2
	// 外形がパーティション内に収まる → 内部最大サイズ = パーティションサイズ - 2
	const maxRoomW = partition.width - 2;
	const maxRoomH = partition.height - 2;

	const roomW = rng.randomInt(BSP_MIN_ROOM_SIZE, maxRoomW + 1);
	const roomH = rng.randomInt(BSP_MIN_ROOM_SIZE, maxRoomH + 1);

	// 壁込み外形がパーティションに収まる範囲でランダム配置
	// 外形サイズ = roomW + 2, roomH + 2
	// パーティション座標からマップ座標への変換: +1（外周壁オフセット）
	// 外形の左上がパーティション内に収まる範囲: [partition.x, partition.x + partition.width - (roomW + 2)]
	const outerW = roomW + 2;
	const outerH = roomH + 2;
	const maxOuterX = partition.x + partition.width - outerW;
	const maxOuterY = partition.y + partition.height - outerH;
	const outerX = rng.randomInt(partition.x, maxOuterX + 1);
	const outerY = rng.randomInt(partition.y, maxOuterY + 1);

	// 部屋の内部床の左上（マップ座標）= 外形左上 + 1（外周壁） + 1（部屋壁）
	const mapX = outerX + 1 + 1;
	const mapY = outerY + 1 + 1;

	return { x: mapX, y: mapY, width: roomW, height: roomH };
}

/**
 * BSP木のすべての末端ノードに部屋を配置する
 */
export function placeRoomsInTree(node: BSPNode, rng: RNG): void {
	if (!node.left && !node.right) {
		node.room = placeRoomInPartition(node.partition, rng);
		return;
	}
	if (node.left) placeRoomsInTree(node.left, rng);
	if (node.right) placeRoomsInTree(node.right, rng);
}

/**
 * ノードから部屋の中心座標を取得する（通路接続用）
 * 末端ノードは自分の部屋、中間ノードは子孫の部屋から取得
 */
function getRoomCenter(node: BSPNode): { x: number; y: number } {
	if (node.room) {
		return {
			x: Math.floor(node.room.x + node.room.width / 2),
			y: Math.floor(node.room.y + node.room.height / 2),
		};
	}
	// 中間ノードの場合、左の子孫から部屋を探す
	if (node.left) return getRoomCenter(node.left);
	if (node.right) return getRoomCenter(node.right);
	// ここには到達しないはず
	return {
		x: Math.floor(node.partition.x + node.partition.width / 2) + 1,
		y: Math.floor(node.partition.y + node.partition.height / 2) + 1,
	};
}

/**
 * 兄弟ノード間の通路を生成する（L字型または直線）
 * マップの壁タイルを床タイルに書き換える
 */
export function connectSiblings(
	map: GameMap,
	left: BSPNode,
	right: BSPNode,
): void {
	const c1 = getRoomCenter(left);
	const c2 = getRoomCenter(right);

	// L字型通路: まずx方向、次にy方向
	const startX = Math.min(c1.x, c2.x);
	const endX = Math.max(c1.x, c2.x);
	const startY = Math.min(c1.y, c2.y);
	const endY = Math.max(c1.y, c2.y);

	// 水平方向
	for (let x = startX; x <= endX; x++) {
		for (let w = 0; w < BSP_CORRIDOR_WIDTH; w++) {
			const y = c1.y + w;
			if (y >= 1 && y < map.length - 1 && x >= 1 && x < map[0].length - 1) {
				map[y][x] = { type: "floor" };
			}
		}
	}

	// 垂直方向
	for (let y = startY; y <= endY; y++) {
		for (let w = 0; w < BSP_CORRIDOR_WIDTH; w++) {
			const x = c2.x + w;
			if (y >= 1 && y < map.length - 1 && x >= 1 && x < map[0].length - 1) {
				map[y][x] = { type: "floor" };
			}
		}
	}
}

/**
 * BSP木を走査し、兄弟ノード間を通路で接続する
 */
export function connectAllRooms(map: GameMap, node: BSPNode): void {
	if (node.left && node.right) {
		connectAllRooms(map, node.left);
		connectAllRooms(map, node.right);
		connectSiblings(map, node.left, node.right);
	}
}

/**
 * 部屋をマップに描画する（内部は床タイル）
 */
function carveRoom(map: GameMap, room: Room): void {
	for (let y = room.y; y < room.y + room.height; y++) {
		for (let x = room.x; x < room.x + room.width; x++) {
			map[y][x] = { type: "floor" };
		}
	}
}

/**
 * BSP木のすべての部屋をマップに描画する
 */
function carveAllRooms(map: GameMap, node: BSPNode): void {
	if (node.room) {
		carveRoom(map, node.room);
	}
	if (node.left) carveAllRooms(map, node.left);
	if (node.right) carveAllRooms(map, node.right);
}

/** BSPマップ生成結果 */
export type BSPMapResult = {
	map: GameMap;
	rooms: Room[];
};

/**
 * BSP木からすべてのRoomを収集する
 */
export function collectRooms(node: BSPNode): Room[] {
	const rooms: Room[] = [];
	if (node.room) {
		rooms.push(node.room);
	}
	if (node.left) rooms.push(...collectRooms(node.left));
	if (node.right) rooms.push(...collectRooms(node.right));
	return rooms;
}

/**
 * BSPアルゴリズムによるマップ生成
 * @returns 生成されたGameMapとRoom情報、または床タイル不足の場合null
 */
export function generateBSPMap(
	width: number,
	height: number,
	rng: RNG,
	requiredFloorTiles: number,
): BSPMapResult | null {
	// 入力バリデーション: 外周壁2マス + 最小パーティションサイズが必要
	const minSize = BSP_MIN_PARTITION_SIZE + 2;
	if (width < minSize || height < minSize) {
		return null;
	}

	// 壁で埋めたマップを初期化
	const map: GameMap = [];
	for (let y = 0; y < height; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ type: "wall" });
		}
		map.push(row);
	}

	// 内側領域（外周1マスを除く）
	const innerPartition: Rectangle = {
		x: 0,
		y: 0,
		width: width - 2,
		height: height - 2,
	};

	// BSP木構築
	const tree = buildBSPTree(innerPartition, 0, BSP_MAX_DEPTH, rng);

	// 部屋配置
	placeRoomsInTree(tree, rng);

	// 部屋をマップに描画
	carveAllRooms(map, tree);

	// 通路接続
	connectAllRooms(map, tree);

	// 床タイル数チェック
	let floorCount = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (map[y][x].type === "floor") floorCount++;
		}
	}

	if (floorCount < requiredFloorTiles) {
		return null;
	}

	const rooms = collectRooms(tree);
	return { map, rooms };
}
