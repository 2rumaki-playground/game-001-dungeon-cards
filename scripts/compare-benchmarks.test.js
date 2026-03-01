import { describe, expect, it } from "vitest";
import {
	compareBenchmarks,
	compareBundles,
	determineBestUnit,
	formatBytes,
	formatByteDiff,
	formatBytesInUnit,
	formatTime,
	formatTimeDiff,
	normalizeChunkName,
} from "./compare-benchmarks.js";

describe("normalizeChunkName", () => {
	it("ハッシュ付きチャンク名からハッシュを除去して.jsを保持する", () => {
		expect(normalizeChunkName("index-AbCdEf12.js")).toBe("index.js");
	});

	it("base64urlハッシュ（ハイフン・アンダースコア含む）を正しく除去する", () => {
		expect(normalizeChunkName("index-DsCQ-ht-.js")).toBe("index.js");
		expect(normalizeChunkName("index-Ab_d-f12.js")).toBe("index.js");
	});

	it("ハッシュなしの名前はそのまま返す", () => {
		expect(normalizeChunkName("browserAll")).toBe("browserAll");
		expect(normalizeChunkName("pixi")).toBe("pixi");
	});

	it(".css拡張子にも対応する", () => {
		expect(normalizeChunkName("style-AbCdEf12.css")).toBe("style.css");
	});
});

describe("formatBytes", () => {
	it("MB単位でフォーマットする", () => {
		expect(formatBytes(1048576)).toBe("1.00 MB");
		expect(formatBytes(2621440)).toBe("2.50 MB");
	});

	it("KB単位でフォーマットする", () => {
		expect(formatBytes(1024)).toBe("1.0 KB");
		expect(formatBytes(126259)).toBe("123.3 KB");
	});

	it("B単位でフォーマットする", () => {
		expect(formatBytes(170)).toBe("170 B");
		expect(formatBytes(0)).toBe("0 B");
	});
});

describe("formatTime", () => {
	it("常にms単位で表示する", () => {
		expect(formatTime(1.5)).toBe("1.500");
		expect(formatTime(10)).toBe("10.000");
		expect(formatTime(1)).toBe("1.000");
		expect(formatTime(0.1)).toBe("0.100");
		expect(formatTime(0.001)).toBe("0.001");
	});

	it("0.001ms未満の値は<0.001と表示する", () => {
		expect(formatTime(0.0001)).toBe("<0.001");
		expect(formatTime(0.0009)).toBe("<0.001");
	});

	it("0を渡した場合は0.000を返す", () => {
		expect(formatTime(0)).toBe("0.000");
	});
});

describe("determineBestUnit", () => {
	it("最大値がMB以上ならMBを返す", () => {
		expect(determineBestUnit([170, 1048576, 2000])).toBe("MB");
	});

	it("最大値がKB以上ならKBを返す", () => {
		expect(determineBestUnit([170, 126259, 538317])).toBe("KB");
	});

	it("最大値がKB未満ならBを返す", () => {
		expect(determineBestUnit([170, 200, 500])).toBe("B");
	});

	it("空配列やゼロのみの場合Bを返す", () => {
		expect(determineBestUnit([])).toBe("B");
		expect(determineBestUnit([0, 0])).toBe("B");
	});
});

describe("formatBytesInUnit", () => {
	it("KB単位で数値のみフォーマットする", () => {
		expect(formatBytesInUnit(170, "KB")).toBe("0.2");
		expect(formatBytesInUnit(126259, "KB")).toBe("123.3");
		expect(formatBytesInUnit(538317, "KB")).toBe("525.7");
	});

	it("MB単位で数値のみフォーマットする", () => {
		expect(formatBytesInUnit(1048576, "MB")).toBe("1.00");
		expect(formatBytesInUnit(2621440, "MB")).toBe("2.50");
	});

	it("B単位で数値のみフォーマットする", () => {
		expect(formatBytesInUnit(170, "B")).toBe("170");
	});
});

describe("formatByteDiff", () => {
	it("baseなし（new）の場合は 'new' のみ返す", () => {
		expect(formatByteDiff(650000, "new")).toBe("new");
	});

	it("通常の差分をフォーマットする", () => {
		expect(formatByteDiff(10240, "1.56")).toBe("+10.0 KB (+1.56%)");
	});

	it("負の差分をフォーマットする", () => {
		expect(formatByteDiff(-5120, "-5.00")).toBe("-5.0 KB (-5.00%)");
	});

	it("差分ゼロの場合は「変化なし」を返す", () => {
		expect(formatByteDiff(0, "0.00")).toBe("変化なし");
	});
});

describe("formatTimeDiff", () => {
	it("baseなし（new）の場合は 'new' のみ返す", () => {
		expect(formatTimeDiff(0.001, "new")).toBe("new");
	});

	it("ms単位で差分をフォーマットする", () => {
		expect(formatTimeDiff(1.5, "10.0")).toBe("+1.500 (+10.0%)");
		expect(formatTimeDiff(0.005, "5.0")).toBe("+0.005 (+5.0%)");
	});

	it("差分ゼロの場合は「変化なし」を返す", () => {
		expect(formatTimeDiff(0, "0.0")).toBe("変化なし");
	});

	it("差分の絶対値が0.001ms以下の場合は「変化なし」を返す", () => {
		expect(formatTimeDiff(0.001, "0.5")).toBe("変化なし");
		expect(formatTimeDiff(-0.0005, "-0.1")).toBe("変化なし");
	});
});

describe("compareBundles", () => {
	it("base=0のセルを—で表示し、差分をnewにする", () => {
		const result = compareBundles(
			{ total_bytes: 0, chunks: {} },
			{
				total_bytes: 665600,
				chunks: { "index-AbCdEf12.js": 126259, pixi: 538317 },
			},
		);

		expect(result.rows).toContain("—");
		expect(result.rows).not.toContain("0 B");
		expect(result.rows).not.toContain("N/A");
		// 差分列はnewのみ
		const lines = result.rows.trim().split("\n");
		for (const line of lines) {
			expect(line).toMatch(/\|\s*new\s*\|$/);
		}
	});

	it("ヘッダー用の単位を返す", () => {
		const result = compareBundles(
			{ total_bytes: 0, chunks: {} },
			{ total_bytes: 665600, chunks: { pixi: 538317 } },
		);
		expect(result.unit).toBe("KB");
	});

	it("baseとheadが非ゼロで増加した場合に正の差分が表示される", () => {
		const result = compareBundles(
			{ total_bytes: 1000, chunks: { "index.js": 1000 } },
			{ total_bytes: 1500, chunks: { "index.js": 1500 } },
		);

		expect(result.rows).not.toContain("new");
		expect(result.rows).toMatch(/\+\d+(\.\d+)?%/);
	});

	it("baseとheadが非ゼロで減少した場合に負の差分が表示される", () => {
		const result = compareBundles(
			{ total_bytes: 2000, chunks: { "index.js": 2000 } },
			{ total_bytes: 1000, chunks: { "index.js": 1000 } },
		);

		expect(result.rows).not.toContain("new");
		expect(result.rows).toMatch(/-\d+(\.\d+)?%/);
	});

	it("baseとheadが同じ値の場合は変化なしと表示される", () => {
		const result = compareBundles(
			{ total_bytes: 1234, chunks: { "index.js": 1234 } },
			{ total_bytes: 1234, chunks: { "index.js": 1234 } },
		);

		expect(result.rows).not.toContain("new");
		expect(result.rows).toContain("変化なし");
	});

	it("複数チャンクで一部が増加・一部が変化なしでも正しく表示される", () => {
		const result = compareBundles(
			{ total_bytes: 3000, chunks: { "index.js": 1000, pixi: 2000 } },
			{ total_bytes: 3500, chunks: { "index.js": 1500, pixi: 2000 } },
		);

		expect(result.rows).toContain("index.js");
		expect(result.rows).toContain("pixi");
		expect(result.rows).toMatch(/\+\d+(\.\d+)?%/);
		expect(result.rows).toContain("変化なし");
	});

	it("チャンク名のハッシュが正規化される", () => {
		const result = compareBundles(
			{ total_bytes: 0, chunks: {} },
			{
				total_bytes: 126259,
				chunks: { "index-DsCQ-ht-.js": 126259 },
			},
		);
		expect(result.rows).toContain("index.js");
		expect(result.rows).not.toContain("DsCQ");
	});
});

describe("compareBenchmarks", () => {
	it("base=0のセルを—で表示し、差分をnewにする", () => {
		const result = compareBenchmarks(
			{ files: [] },
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "test1", median: 0.001, mean: 0.001 },
								],
							},
						],
					},
				],
			},
		);

		expect(result.rows).toContain("—");
		expect(result.rows).not.toContain("0.0000ms");
		// 差分列はnewのみ
		const lines = result.rows.trim().split("\n");
		for (const line of lines) {
			expect(line).toMatch(/\|\s*new\s*\|$/);
		}
	});

	it("すべての値がms単位で統一表示される", () => {
		const result = compareBenchmarks(
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "fast", median: 0.001, mean: 0.001 },
									{ name: "slow", median: 2.5, mean: 2.5 },
								],
							},
						],
					},
				],
			},
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "fast", median: 0.0012, mean: 0.0012 },
									{ name: "slow", median: 2.8, mean: 2.8 },
								],
							},
						],
					},
				],
			},
		);

		expect(result.rows).not.toContain("μs");
	});

	it("20%以上劣化した場合に警告アイコンが表示される", () => {
		const result = compareBenchmarks(
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "regression", median: 1.0, mean: 1.0 },
								],
							},
						],
					},
				],
			},
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "regression", median: 1.3, mean: 1.3 },
								],
							},
						],
					},
				],
			},
		);

		const row = result.rows
			.trim()
			.split("\n")
			.find((line) => line.includes("regression"));
		expect(row).toContain(":warning:");
		expect(result.hasRegression).toBe(true);
	});

	it("パフォーマンスが改善した場合に負の差分が表示される", () => {
		const result = compareBenchmarks(
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "improvement", median: 2.0, mean: 2.0 },
								],
							},
						],
					},
				],
			},
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "improvement", median: 1.0, mean: 1.0 },
								],
							},
						],
					},
				],
			},
		);

		const row = result.rows
			.trim()
			.split("\n")
			.find((line) => line.includes("improvement"));
		expect(row).not.toContain(":warning:");
		expect(row).toMatch(/-\d+/);
		expect(result.hasRegression).toBe(false);
	});

	it("baseとheadが同じ値の場合は変化なしと表示される", () => {
		const result = compareBenchmarks(
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "same", median: 1.5, mean: 1.5 },
								],
							},
						],
					},
				],
			},
			{
				files: [
					{
						groups: [
							{
								benchmarks: [
									{ name: "same", median: 1.5, mean: 1.5 },
								],
							},
						],
					},
				],
			},
		);

		const row = result.rows
			.trim()
			.split("\n")
			.find((line) => line.includes("same"));
		expect(row).toContain("変化なし");
		expect(row).not.toContain("new");
	});
});
