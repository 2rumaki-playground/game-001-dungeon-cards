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
	},
});
