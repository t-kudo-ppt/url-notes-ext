/**
 * Create a debounced function wrapper that postpones invoking `fn` until after
 * `wait` milliseconds have elapsed since the last time the wrapper was called.
 *
 * 用途: 入力のたびにストレージへ書き込むと無駄が多いため、
 * 最後のタイプから一定時間経過後に1回だけ保存を実行します。
 *
 * 仕組み: setTimeout の ID をクロージャ内に保持し、呼び出し毎に clear → 再スケジュール。
 *
 * @template T extends (...args: any[]) => void
 * @param fn - 遅延実行したい関数（例: 保存処理）
 * @param wait - 遅延時間（ms）。MVPでは 500ms を想定
 * @returns ラッパ関数（引数は元の `fn` と同一）
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait = 500
) {
  let t: number | undefined; // window.setTimeout の戻り値（ID）
  return (...args: Parameters<T>) => {
    if (t !== undefined) {
      clearTimeout(t);
    }
    t = window.setTimeout(() => fn(...args), wait);
  };
}
