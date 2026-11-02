export type Channel = 'production' | 'preview';

/** 画面に出す版の文字。プレビューには β を付けて本番と取り違えないようにする。 */
export function formatVersion(version: string, channel: Channel): string {
  return `v${version}${channel === 'preview' ? ' β' : ''}`;
}
