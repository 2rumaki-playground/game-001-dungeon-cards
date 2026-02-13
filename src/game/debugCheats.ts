/**
 * デバッグチート状態管理（DEV環境限定）
 *
 * モジュールレベルの共有オブジェクトでチート状態を保持。
 * ゲームロジック関数から `import.meta.env.DEV && getDebugCheats().xxx` でチェック可能。
 * プロダクションビルド時はデッドコード除去される。
 */

export interface DebugCheats {
	/** 無敵（ダメージを受けない） */
	invincible: boolean;
	/** AP無限（APが減らない） */
	infiniteAp: boolean;
	/** 全マップ可視（Fog of War無効化） */
	fullMapVisible: boolean;
	/** 敵行動スキップ（敵ターンをスキップ） */
	skipEnemyTurn: boolean;
}

const debugCheats: DebugCheats = {
	invincible: false,
	infiniteAp: false,
	fullMapVisible: false,
	skipEnemyTurn: false,
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
	debugCheats.infiniteAp = false;
	debugCheats.fullMapVisible = false;
	debugCheats.skipEnemyTurn = false;
}
