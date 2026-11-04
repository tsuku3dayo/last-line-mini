export type Channel = 'production' | 'preview';

/**
 * 画面に出す版の文字。プレビューには β を付けて本番と取り違えないようにする。
 * プレビューには、どのマージまで入った版かが分かるよう、コミットの短い番号も付ける（例：`v0.1.0 β aefcdbd`）。
 * 本番には付けない（版の番号だけで見分ける）。
 */
export function formatVersion(version: string, channel: Channel, commit = ''): string {
  if (channel === 'production') return `v${version}`;
  return commit ? `v${version} β ${commit}` : `v${version} β`;
}
