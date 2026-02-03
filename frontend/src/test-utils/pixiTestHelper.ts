import type { Container } from "pixi.js";

/**
 * Containerの子要素からtextプロパティを持つものだけを抽出する
 */
export function getTexts(container: Container): { text: string }[] {
	return container.children.filter(
		(child) =>
			"text" in child && typeof (child as { text: unknown }).text === "string",
	) as unknown as { text: string }[];
}

/**
 * Containerの子要素からプレフィックスに一致するテキスト要素を検索する
 */
export function findTextByPrefix(
	container: Container,
	prefix: string,
): { text: string } {
	const texts = getTexts(container);
	const found = texts.find((t) => t.text.startsWith(prefix));
	if (!found) {
		throw new Error(`"${prefix}" で始まるテキスト要素が見つかりません`);
	}
	return found;
}
