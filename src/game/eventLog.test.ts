import { describe, expect, it } from "vitest";
import { createTestState } from "../test-utils/createTestFixtures";
import type { RunEvent } from "../types";
import { addRunEvent } from "./eventLog";

describe("addRunEvent", () => {
	it("イベントがeventLogに追加される", () => {
		const state = createTestState();
		const event: RunEvent = {
			type: "boss_defeated",
			floor: 10,
			turn: 50,
			detail: { enemyType: "boss" },
		};
		const next = addRunEvent(state, event);
		expect(next.eventLog).toHaveLength(1);
		expect(next.eventLog[0]).toEqual(event);
	});

	it("元のstateのeventLogは変更されない（イミュータブル）", () => {
		const state = createTestState();
		const event: RunEvent = {
			type: "miniboss_defeated",
			floor: 5,
			turn: 25,
			detail: { enemyType: "miniboss" },
		};
		addRunEvent(state, event);
		expect(state.eventLog).toHaveLength(0);
	});

	it("既存のイベントに追記される", () => {
		const existing: RunEvent = {
			type: "card_level_up",
			floor: 3,
			turn: 15,
			detail: { cardType: "attack", newLevel: 3 },
		};
		const state = createTestState({ eventLog: [existing] });
		const newEvent: RunEvent = {
			type: "boss_defeated",
			floor: 10,
			turn: 50,
			detail: { enemyType: "boss" },
		};
		const next = addRunEvent(state, newEvent);
		expect(next.eventLog).toHaveLength(2);
		expect(next.eventLog[0]).toEqual(existing);
		expect(next.eventLog[1]).toEqual(newEvent);
	});
});
