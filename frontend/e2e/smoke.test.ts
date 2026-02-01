import { type ConsoleMessage, test, expect } from "@playwright/test";

test("ページが正常にロードされcanvasが表示される", async ({ page }) => {
	const errors: string[] = [];
	page.on("console", (msg: ConsoleMessage) => {
		if (msg.type() === "error") {
			errors.push(msg.text());
		}
	});

	await page.goto("/");

	await expect(page).toHaveTitle("Dungeon Cards");
	await expect(page.locator("canvas")).toBeVisible();
	expect(errors).toEqual([]);
});
