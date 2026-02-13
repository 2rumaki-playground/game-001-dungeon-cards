import { bench, describe } from "vitest";
import { RNG } from "../utils/rng";
import { generateBSPMap } from "./bsp";
import { bfsFirstStep } from "./pathfinding";

const rng9 = new RNG(42);
// biome-ignore lint/style/noNonNullAssertion: fixed seed guarantees map generation
const map9 = generateBSPMap(9, 9, rng9, 5)!.map;

const rng19 = new RNG(42);
// biome-ignore lint/style/noNonNullAssertion: fixed seed guarantees map generation
const map19 = generateBSPMap(19, 19, rng19, 15)!.map;

describe("BFS pathfinding", () => {
	bench("bfsFirstStep 9x9", () => {
		bfsFirstStep(map9, { x: 2, y: 2 }, { x: 7, y: 7 });
	});

	bench("bfsFirstStep 19x19 short", () => {
		bfsFirstStep(map19, { x: 3, y: 3 }, { x: 6, y: 6 });
	});

	bench("bfsFirstStep 19x19 long", () => {
		bfsFirstStep(map19, { x: 2, y: 2 }, { x: 16, y: 16 });
	});
});
