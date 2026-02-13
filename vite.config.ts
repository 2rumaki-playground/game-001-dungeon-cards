/// <reference types="vitest" />
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: process.env.ANALYZE
		? [
				visualizer({
					filename: "stats.html",
					emitFile: true,
					gzipSize: true,
					brotliSize: true,
				}),
			]
		: [],
	server: {
		port: 3000,
	},
	build: {
		target: "esnext",
		chunkSizeWarningLimit: 600,
		rollupOptions: {
			output: {
				manualChunks: {
					pixi: ["pixi.js"],
				},
			},
		},
	},
	test: {
		globals: true,
		environment: "node",
		exclude: ["e2e/**", "node_modules/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.test.ts",
				"src/test-utils/**",
				"src/vite-env.d.ts",
			],
		},
	},
});
