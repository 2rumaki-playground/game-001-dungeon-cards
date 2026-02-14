import { bench, describe } from "vitest";
import { RNG } from "../utils/rng";
import { generateBSPMap } from "./bsp";
import { generateMapPlacement } from "./map";

describe("BSPマップ生成", () => {
	bench("generateBSPMap 9x9", () => {
		const rng = new RNG(42);
		generateBSPMap(9, 9, rng, 5);
	});

	bench("generateBSPMap 13x13", () => {
		const rng = new RNG(42);
		generateBSPMap(13, 13, rng, 10);
	});

	bench("generateBSPMap 19x19", () => {
		const rng = new RNG(42);
		generateBSPMap(19, 19, rng, 15);
	});
});

describe("完全マップ配置", () => {
	bench("generateMapPlacement floor 1", () => {
		const rng = new RNG(42);
		generateMapPlacement(rng, 1);
	});

	bench("generateMapPlacement floor 5", () => {
		const rng = new RNG(42);
		generateMapPlacement(rng, 5);
	});

	bench("generateMapPlacement floor 15", () => {
		const rng = new RNG(42);
		generateMapPlacement(rng, 15);
	});
});
