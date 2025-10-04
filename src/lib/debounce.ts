/**
 * シンプルなデバウンス。
 * @param fn 実行関数
 * @param wait ms（既定: 500）
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait = 500
) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t !== undefined) clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}
