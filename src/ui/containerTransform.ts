/**
 * コンテナの変換情報（カメラオフセット・ズーム）
 * ツールチップ等の画面座標計算で使用
 */
export type ContainerTransform = {
	x: number;
	y: number;
	scale: number;
};
