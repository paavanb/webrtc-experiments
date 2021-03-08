/**
 * Intersperse a separator into an array. Can be thought of as the intermediate step
 * of Array.prototype.join().
 *
 * @example
 * Comma-separate a list of JSX values:
 * intersperse(["hello", (<strong>World</strong)], ", ")
 * @param arr The array to intersperse the separator within
 * @param sep The separator to use
 */
export default function intersperse<T>(arr: T[], sep: T): T[] {
  return arr.reduce((accum, val, idx) => (idx === 0 ? [val] : [...accum, sep, val]), [] as T[])
}
