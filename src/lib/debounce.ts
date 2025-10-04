/**
 * Debounce a function call.
 * 実行間隔内の連続呼び出しを最後の1回にまとめる。
 *
 * @example
 * const handler = debounce(() => save(), 500);
 * input.addEventListener('input', handler);
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 500) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t !== undefined) clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}
