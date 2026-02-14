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

const BUNDLE_WARN_THRESHOLD = 0.05;
const BENCH_WARN_THRESHOLD = 0.2;

// --- Formatting ---

function formatBytes(bytes) {
	if (bytes >= 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${bytes} B`;
}

function formatByteDiff(diff, pct) {
	const sign = diff > 0 ? "+" : "";
	if (pct === "new") {
		return `${sign}${formatBytes(Math.abs(diff))} (new)`;
	}
	if (pct === "N/A") {
		return `${sign}${formatBytes(Math.abs(diff))} (N/A)`;
	}
	return `${sign}${formatBytes(Math.abs(diff))} (${sign}${pct}%)`;
}

function formatTimeDiff(diff, pct) {
	const sign = diff > 0 ? "+" : "";
	if (pct === "new") {
		return `${sign}${diff.toFixed(4)}ms (new)`;
	}
	if (pct === "N/A") {
		return `${sign}${diff.toFixed(4)}ms (N/A)`;
	}
	return `${sign}${diff.toFixed(4)}ms (${sign}${pct}%)`;
}

// --- Bundle comparison ---

function normalizeChunkName(name) {
	return name.replace(/-[A-Za-z0-9]{8}\.js$/, "");
}

function normalizeChunks(chunks) {
	const result = {};
	for (const [name, size] of Object.entries(chunks)) {
		result[normalizeChunkName(name)] = size;
	}
	return result;
}

function compareBundles(basePath, headPath) {
	const base = JSON.parse(readFileSync(basePath, "utf-8"));
	const head = JSON.parse(readFileSync(headPath, "utf-8"));

	const totalDiff = head.total_bytes - base.total_bytes;
	const totalPct =
		base.total_bytes > 0
			? ((totalDiff / base.total_bytes) * 100).toFixed(2)
			: "N/A";

	let rows = `| **Total** | ${formatBytes(base.total_bytes)} | ${formatBytes(head.total_bytes)} | ${formatByteDiff(totalDiff, totalPct)} |\n`;

	const baseChunks = normalizeChunks(base.chunks);
	const headChunks = normalizeChunks(head.chunks);
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
		rows += `| ${prefix} | ${formatBytes(bSize)} | ${formatBytes(hSize)} | ${formatByteDiff(diff, pct)} |\n`;
	}

	const warning =
		base.total_bytes > 0 &&
		Math.abs(totalDiff / base.total_bytes) > BUNDLE_WARN_THRESHOLD;

	return { rows, warning };
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

function compareBenchmarks(basePath, headPath) {
	const base = JSON.parse(readFileSync(basePath, "utf-8"));
	const head = JSON.parse(readFileSync(headPath, "utf-8"));

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

		const diff = hMedian - bMedian;
		const pctValue = bMedian > 0 ? (diff / bMedian) * 100 : null;
		const regression = pctValue !== null && pctValue > BENCH_WARN_THRESHOLD * 100;
		const pct = pctValue !== null ? pctValue.toFixed(1) : "new";
		if (regression) hasRegression = true;

		const warn = regression ? " :warning:" : "";
		rows += `| ${name} | ${bMedian.toFixed(4)}ms | ${hMedian.toFixed(4)}ms | ${formatTimeDiff(diff, pct)}${warn} |\n`;
	}

	return { rows, hasRegression };
}

// --- Main ---

let md =
	"## :bar_chart: パフォーマンスベンチマーク\n\n";

if (baseBundlePath && headBundlePath) {
	const bundle = compareBundles(baseBundlePath, headBundlePath);
	md += "### バンドルサイズ\n\n";
	md += "| チャンク | base | head | 差分 |\n";
	md += "|----------|------|------|------|\n";
	md += bundle.rows;
	if (bundle.warning) {
		md +=
			"\n> :warning: **バンドルサイズが5%以上変化しています**\n";
	}
	md += "\n";
}

if (baseBenchPath && headBenchPath) {
	const bench = compareBenchmarks(baseBenchPath, headBenchPath);
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
		md += "### 実行時間ベンチマーク\n\nベンチマーク結果がありません。\n\n";
	}
}

writeFileSync(outputPath, md);
console.log(`Report written to ${outputPath}`);
