export type Scope = 'exact' | 'path' | 'origin';

/**
 * URL と Scope から保存キーを生成。
 * - exact: 完全一致（URL全体）
 * - path: パス単位（末尾に必ずスラッシュ）
 * - origin: スキーム+ホスト(+ポート)
 */
export function buildKey(urlStr: string, scope: Scope): { key: string; sample: string } {
  try {
    const u = new URL(urlStr);
    const protocol = u.protocol;
    const hostname = u.hostname.toLowerCase();

    if (scope === 'exact') return { key: u.href, sample: urlStr };

    if (scope === 'path') {
      let pathname = u.pathname || '/';
      if (!pathname.endsWith('/')) pathname += '/';
      return { key: `${protocol}//${hostname}${pathname}`, sample: urlStr };
    }

    const port = u.port ? `:${u.port}` : '';
    return { key: `${protocol}//${hostname}${port}/`, sample: urlStr };
  } catch {
    // 不正な URL（chrome:// など）は元文字列をそのままキーにする
    return { key: urlStr, sample: urlStr };
  }
}
