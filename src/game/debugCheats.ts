/**
 * デバッグチート状態管理（DEV環境限定）
 *
 * モジュールレベルの共有オブジェクトでチート状態を保持。
 * debugMiddleware.ts のラッパー関数から `import.meta.env.DEV && getDebugCheats().xxx` でチェックされ、
 * ゲームロジック層（combat.ts, enemyAi.ts, tileEffect.ts）はこのモジュールに依存しない。
 * プロダクションビルド時は `import.meta.env.DEV` が false になるため、関連コードごとデッドコード除去される想定。
 */

export interface DebugCheats {
	/** 無敵（ダメージを受けない） */
	invincible: boolean;
	/** 全マップ可視（Fog of War無効化） */
	fullMapVisible: boolean;
	/** 敵行動スキップ（敵ターンをスキップ） */
	skipEnemyTurn: boolean;
	/** 敵AI可視化（移動候補・攻撃範囲・判断理由を表示） */
	showEnemyAi: boolean;
}

const debugCheats: DebugCheats = {
	invincible: false,
	fullMapVisible: false,
	skipEnemyTurn: false,
	showEnemyAi: false,
};

/**
 * 現在のチート状態を取得
 */
export function getDebugCheats(): Readonly<DebugCheats> {
	return debugCheats;
}

/**
 * 指定キーのチートをトグルし、新しい値を返す
 */
export function toggleDebugCheat(key: keyof DebugCheats): boolean {
	debugCheats[key] = !debugCheats[key];
	return debugCheats[key];
}

/**
 * 全チートをリセット（OFF）
 */
export function resetDebugCheats(): void {
	debugCheats.invincible = false;
	debugCheats.fullMapVisible = false;
	debugCheats.skipEnemyTurn = false;
	debugCheats.showEnemyAi = false;
}
