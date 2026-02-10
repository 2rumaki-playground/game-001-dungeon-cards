/**
 * プレースホルダーPNG生成スクリプト
 * 64x64 の単色PNGを public/assets/ に生成する
 *
 * 使い方: node scripts/generate-placeholders.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SIZE = 64;

/**
 * 64x64 単色PNGのバイナリを生成
 * @param {number} hexColor - 0xRRGGBB形式の色
 * @returns {Buffer}
 */
function createSolidPng(hexColor) {
	const r = (hexColor >> 16) & 0xff;
	const g = (hexColor >> 8) & 0xff;
	const b = hexColor & 0xff;

	// 非圧縮ピクセルデータ（各行にフィルターバイト0を先頭に付加）
	const rawData = Buffer.alloc(SIZE * (1 + SIZE * 3));
	for (let y = 0; y < SIZE; y++) {
		const rowOffset = y * (1 + SIZE * 3);
		rawData[rowOffset] = 0; // フィルター: None
		for (let x = 0; x < SIZE; x++) {
			const pixelOffset = rowOffset + 1 + x * 3;
			rawData[pixelOffset] = r;
			rawData[pixelOffset + 1] = g;
			rawData[pixelOffset + 2] = b;
		}
	}

	const compressed = deflateSync(rawData);

	// PNG構築
	const chunks = [];

	// シグネチャ
	chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

	// IHDR
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(SIZE, 0); // width
	ihdr.writeUInt32BE(SIZE, 4); // height
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // color type: RGB
	ihdr[10] = 0; // compression
	ihdr[11] = 0; // filter
	ihdr[12] = 0; // interlace
	chunks.push(createChunk("IHDR", ihdr));

	// IDAT
	chunks.push(createChunk("IDAT", compressed));

	// IEND
	chunks.push(createChunk("IEND", Buffer.alloc(0)));

	return Buffer.concat(chunks);
}

/**
 * PNGチャンクを作成
 * @param {string} type - 4文字のチャンクタイプ
 * @param {Buffer} data - チャンクデータ
 * @returns {Buffer}
 */
function createChunk(type, data) {
	const typeBuffer = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);

	const crcData = Buffer.concat([typeBuffer, data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(crcData), 0);

	return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * CRC32計算
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
	}
	return (c ^ 0xffffffff) >>> 0;
}

// CRC32テーブル
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	crcTable[n] = c;
}

// 生成対象の定義
// 色値: src/constants.ts の COLORS、パス: src/ui/assetLoader.ts の *_ASSET_PATHS と同期すること
const assets = [
	{ path: "tiles/floor.png", color: 0x3a3a3a },       // COLORS.floor
	{ path: "tiles/wall.png", color: 0x1a1a1a },        // COLORS.wall
	{ path: "tiles/stairs.png", color: 0x4a6a4a },      // COLORS.stairs
	{ path: "tiles/trap.png", color: 0x9b59b6 },        // COLORS.trap
	{ path: "tiles/treasure.png", color: 0xccaa44 },    // COLORS.treasure
	{ path: "tiles/rest_area.png", color: 0x44aa88 },   // COLORS.restArea
	{ path: "player.png", color: 0x4a8cca },            // COLORS.player
	{ path: "enemies/normal.png", color: 0xca4a4a },    // COLORS.enemyNormal
	{ path: "enemies/heavy.png", color: 0x8855aa },     // COLORS.enemyHeavy
	{ path: "enemies/scout.png", color: 0x88cc44 },     // COLORS.enemyScout
	{ path: "enemies/miniboss.png", color: 0xdd8833 },  // COLORS.enemyMiniboss
	{ path: "enemies/boss.png", color: 0xdd3333 },      // COLORS.enemyBoss
];

const baseDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets");

for (const { path, color } of assets) {
	const fullPath = join(baseDir, path);
	mkdirSync(dirname(fullPath), { recursive: true });
	const png = createSolidPng(color);
	writeFileSync(fullPath, png);
	const hex = `#${color.toString(16).padStart(6, "0")}`;
	console.log(`  ${path} (${hex})`);
}

console.log(`\n${assets.length} 個のプレースホルダーPNGを生成しました`);
