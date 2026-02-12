/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	server: {
		port: 3000,
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
