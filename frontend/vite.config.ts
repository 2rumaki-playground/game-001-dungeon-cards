/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3000,
	},
	test: {
		globals: true,
		environment: "node",
	},
});
