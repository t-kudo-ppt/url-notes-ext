export type Scope = "exact" | "path" | "origin";

/**
 * URLとスコープから保存キーを生成。
 * - exact: 完全一致
 * - path: 末尾に必ず "/" を付与し、パス単位で束ねる
 * - origin: スキーム+ホスト(+ポート)
 */
export function buildKey(
  urlStr: string,
  scope: Scope
): { key: string; sample: string } {
  try {
    const u = new URL(urlStr);
    const protocol = u.protocol;
    const hostname = u.hostname.toLowerCase();

    if (scope === "exact") return { key: u.href, sample: urlStr };

    if (scope === "path") {
      let pathname = u.pathname || "/";
      if (!pathname.endsWith("/")) pathname += "/";
      return { key: `${protocol}//${hostname}${pathname}`, sample: urlStr };
    }

    const port = u.port ? `:${u.port}` : "";
    return { key: `${protocol}//${hostname}${port}/`, sample: urlStr };
  } catch {
    // 不正URLはそのままキーに（拡張内部URLなど）
    return { key: urlStr, sample: urlStr };
  }
}
