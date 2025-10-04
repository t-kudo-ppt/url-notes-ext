export type Scope = "exact" | "path" | "origin";

/**
 * Build a stable storage key for a given URL and scope.
 *
 * スコープ定義:
 * - exact: URL 全体をキー化（protocol + host + path + search + hash）。
 * 例) https://example.com/a?x=1#top → そのまま。
 * - path : protocol + // + hostname(lower) + pathname(+末尾'/')。
 * search/hash は無視。例) https://example.com/a → https://example.com/a/
 * - origin: protocol + // + hostname(lower) + (portがあれば :port) + '/'
 * パス/クエリ/ハッシュは無視。
 *
 * 例:
 * buildKey('https://Example.com/A?x=1#h', 'exact') → key: 'https://Example.com/A?x=1#h'
 * buildKey('https://Example.com/A?x=1#h', 'path') → key: 'https://example.com/A/'
 * buildKey('https://Example.com:8443/A', 'origin') → key: 'https://example.com:8443/'
 *
 * @param urlStr - 対象URL
 * @param scope - exact | path | origin
 * @returns { key: string; sample: string }
 */
export function buildKey(
  urlStr: string,
  scope: Scope
): { key: string; sample: string } {
  try {
    const u = new URL(urlStr);
    const protocol = u.protocol; // "http:" / "https:" / etc.
    const hostname = u.hostname.toLowerCase();

    if (scope === "exact") {
      // href だと hostname の大文字小文字が保たれる場合があるが、
      // exact は「完全一致」を意図するため敢えて生URLに寄せる。
      return { key: u.href, sample: urlStr };
    }

    if (scope === "path") {
      let pathname = u.pathname || "/";
      if (!pathname.endsWith("/")) pathname += "/";
      const key = `${protocol}//${hostname}${pathname}`;
      return { key, sample: urlStr };
    }

    // origin
    const port = u.port ? `:${u.port}` : "";
    const key = `${protocol}//${hostname}${port}/`;
    return { key, sample: urlStr };
  } catch {
    // 解析できない場合（about:blank, chrome:// 等）
    return { key: urlStr, sample: urlStr };
  }
}
