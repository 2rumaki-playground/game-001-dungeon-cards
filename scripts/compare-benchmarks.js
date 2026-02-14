#!/usr/bin/env node
/**
 * ベンチマーク比較レポート生成
 *
 * Usage:
 *   node scripts/compare-benchmarks.js \
 *     --base-bench base-bench.json --head-bench head-bench.json \
 *     --base-bundle base-bundle.json --head-bundle head-bundle.json \
 *     --output report.md
 */
import { readFileSync, writeFileSync } from "node:fs";

const BUNDLE_WARN_THRESHOLD = 0.05;
const BENCH_WARN_THRESHOLD = 0.2;

// --- Formatting ---

export function formatBytes(bytes) {
	if (bytes >= 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${bytes} B`;
}

export function formatTime(ms) {
	if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
	return `${ms.toFixed(2)}ms`;
}

export function determineBestUnit(values) {
	const nonZero = values.filter((v) => v > 0);
	if (nonZero.length === 0) return "B";
	const maxVal = Math.max(...nonZero);
	if (maxVal >= 1024 * 1024) return "MB";
	if (maxVal >= 1024) return "KB";
	return "B";
}

export function formatBytesInUnit(bytes, unit) {
	switch (unit) {
		case "MB":
			return `${(bytes / 1024 / 1024).toFixed(2)}`;
		case "KB":
			return `${(bytes / 1024).toFixed(1)}`;
		default:
			return `${bytes}`;
	}
}

export function formatByteDiff(diff, pct) {
	if (pct === "new") return "new";
	if (diff === 0) return "変化なし";
	const sign = diff > 0 ? "+" : "-";
	const absPct = pct.replace(/^-/, "");
	return `${sign}${formatBytes(Math.abs(diff))} (${sign}${absPct}%)`;
}

export function formatTimeDiff(diff, pct) {
	if (pct === "new") return "new";
	if (diff === 0) return "変化なし";
	const sign = diff > 0 ? "+" : "-";
	const absPct = pct.replace(/^-/, "");
	return `${sign}${formatTime(Math.abs(diff))} (${sign}${absPct}%)`;
}

// --- Bundle comparison ---

export function normalizeChunkName(name) {
	return name.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, ".$1");
}

function normalizeChunks(chunks) {
	const result = {};
	for (const [name, size] of Object.entries(chunks)) {
		result[normalizeChunkName(name)] = size;
	}
	return result;
}

export function compareBundles(base, head) {
	const baseChunks = normalizeChunks(base.chunks);
	const headChunks = normalizeChunks(head.chunks);

	const allValues = [
		base.total_bytes,
		head.total_bytes,
		...Object.values(baseChunks),
		...Object.values(headChunks),
	];
	const unit = determineBestUnit(allValues);

	const fmtVal = (v) => (v === 0 ? "—" : formatBytesInUnit(v, unit));

	const totalDiff = head.total_bytes - base.total_bytes;
	const totalPct =
		base.total_bytes > 0
			? ((totalDiff / base.total_bytes) * 100).toFixed(2)
			: "new";

	let rows = `| **Total** | ${fmtVal(base.total_bytes)} | ${fmtVal(head.total_bytes)} | ${formatByteDiff(totalDiff, totalPct)} |\n`;

	const allPrefixes = new Set([
		...Object.keys(baseChunks),
		...Object.keys(headChunks),
	]);

	for (const prefix of [...allPrefixes].sort()) {
		const bSize = baseChunks[prefix] || 0;
		const hSize = headChunks[prefix] || 0;
		const diff = hSize - bSize;
		const pct =
			bSize > 0 ? ((diff / bSize) * 100).toFixed(2) : "new";
		rows += `| ${prefix} | ${fmtVal(bSize)} | ${fmtVal(hSize)} | ${formatByteDiff(diff, pct)} |\n`;
	}

	const warning =
		base.total_bytes > 0 &&
		Math.abs(totalDiff / base.total_bytes) > BUNDLE_WARN_THRESHOLD;

	return { rows, warning, unit };
}

// --- Bench comparison ---

function flattenBenchResults(json) {
	const map = {};
	if (!json.files) return map;
	for (const file of json.files) {
		for (const group of file.groups || []) {
			for (const b of group.benchmarks || []) {
				map[b.name] = { median: b.median, mean: b.mean };
			}
		}
	}
	return map;
}

export function compareBenchmarks(base, head) {
	const baseMap = flattenBenchResults(base);
	const headMap = flattenBenchResults(head);
	const allNames = new Set([
		...Object.keys(baseMap),
		...Object.keys(headMap),
	]);

	if (allNames.size === 0) {
		return { rows: "", hasRegression: false };
	}

	let rows = "";
	let hasRegression = false;

	for (const name of allNames) {
		const bMedian = baseMap[name]?.median || 0;
		const hMedian = headMap[name]?.median || 0;

		if (bMedian === 0 && hMedian === 0) continue;

		const fmtVal = (v) => (v === 0 ? "—" : formatTime(v));

		const diff = hMedian - bMedian;
		const pctValue = bMedian > 0 ? (diff / bMedian) * 100 : null;
		const regression =
			pctValue !== null && pctValue > BENCH_WARN_THRESHOLD * 100;
		const pct = pctValue !== null ? pctValue.toFixed(1) : "new";
		if (regression) hasRegression = true;

		const warn = regression ? " :warning:" : "";
		rows += `| ${name} | ${fmtVal(bMedian)} | ${fmtVal(hMedian)} | ${formatTimeDiff(diff, pct)}${warn} |\n`;
	}

	return { rows, hasRegression };
}

// --- CLI entry point ---

const __filename = new URL(import.meta.url).pathname;
if (process.argv[1] === __filename) {
	const args = process.argv.slice(2);

	function getArg(name) {
		const idx = args.indexOf(name);
		return idx !== -1 ? args[idx + 1] : null;
	}

	const baseBenchPath = getArg("--base-bench");
	const headBenchPath = getArg("--head-bench");
	const baseBundlePath = getArg("--base-bundle");
	const headBundlePath = getArg("--head-bundle");
	const outputPath = getArg("--output") || "report.md";

	let md = "## :bar_chart: パフォーマンスベンチマーク\n\n";

	if (baseBundlePath && headBundlePath) {
		const base = JSON.parse(readFileSync(baseBundlePath, "utf-8"));
		const head = JSON.parse(readFileSync(headBundlePath, "utf-8"));
		const bundle = compareBundles(base, head);
		md += "### バンドルサイズ\n\n";
		md += `| チャンク | base (${bundle.unit}) | head (${bundle.unit}) | 差分 |\n`;
		md += "|----------|------|------|------|\n";
		md += bundle.rows;
		if (bundle.warning) {
			md +=
				"\n> :warning: **バンドルサイズが5%以上変化しています**\n";
		}
		md += "\n";
	}

	if (baseBenchPath && headBenchPath) {
		const base = JSON.parse(readFileSync(baseBenchPath, "utf-8"));
		const head = JSON.parse(readFileSync(headBenchPath, "utf-8"));
		const bench = compareBenchmarks(base, head);
		if (bench.rows) {
			md += "### 実行時間ベンチマーク\n\n";
			md += "| ベンチマーク | base | head | 差分 |\n";
			md += "|-------------|------|------|------|\n";
			md += bench.rows;
			if (bench.hasRegression) {
				md +=
					"\n> :warning: **20%以上の性能劣化が検出されました**\n";
			}
			md += "\n";
		} else {
			md +=
				"### 実行時間ベンチマーク\n\nベンチマーク結果がありません。\n\n";
		}
	}

	writeFileSync(outputPath, md);
	console.log(`Report written to ${outputPath}`);
}
