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
	it("1ms未満の値をμs単位で表示する", () => {
		expect(formatTime(0.001)).toBe("1.0μs");
		expect(formatTime(0.0001)).toBe("0.1μs");
		expect(formatTime(0.1)).toBe("100.0μs");
	});

	it("1ms以上の値をms単位で表示する", () => {
		expect(formatTime(1.5)).toBe("1.50ms");
		expect(formatTime(10)).toBe("10.00ms");
		expect(formatTime(1)).toBe("1.00ms");
	});

	it("0を渡した場合はμs単位で0.0μsを返す", () => {
		expect(formatTime(0)).toBe("0.0μs");
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

	it("μs単位で差分をフォーマットする", () => {
		expect(formatTimeDiff(0.001, "5.0")).toBe("+1.0μs (+5.0%)");
	});

	it("ms単位で差分をフォーマットする", () => {
		expect(formatTimeDiff(1.5, "10.0")).toBe("+1.50ms (+10.0%)");
	});

	it("差分ゼロの場合は「変化なし」を返す", () => {
		expect(formatTimeDiff(0, "0.0")).toBe("変化なし");
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

	it("時間の単位がμs/msで自動切替される", () => {
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

		expect(result.rows).toContain("μs");
		expect(result.rows).toContain("ms");
	});
});
