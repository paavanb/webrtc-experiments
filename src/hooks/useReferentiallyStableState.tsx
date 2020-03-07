import {useState, useCallback, Dispatch, SetStateAction} from 'react'

/**
 * Manage referentially-stable state. That is, on update the new value is
 * deep-compared with the previous value, such that a path `p` is equal
 * (by Object.is) to the path `p` in the new state iff the values are deep-equal.
 *
 * @example
 * ```
 * const [value, setValue] = useDeepState({
 *   a: {
 *     b: {x: 1},
 *     c: 3
 *   },
 *   d: [1, {e: 1}]
 * })
 * setValue(
 *   a: {
 *     b: {x: 1},
 *     c: 1
 *   },
 *   d: [1, {e: 1}]
 * ) // Only changes reference to `a`. `a.b` is unchanged, as well as `a.d[1]`
 * ```
 */
export default function useReferentiallyStableState<T extends object>(
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial)

  //const deepSetValue = useCallback(
    //(arg: T | ((prev: T) => T)) => {
      //const newValue: T = typeof arg === 'function' ? arg(value) : arg
    //},
    //[value]
  //)

  return [value, setValue]
}
