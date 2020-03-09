import {useState, useCallback, Dispatch, SetStateAction} from 'react'

import {NonNull} from '../lib/types'

function refStableReplace<T extends object>(obj: T, nextObj: T): T {
  // Recursively replace all subkeys
  const replaced = Object.keys(nextObj).reduce((replacedObj, key) => {
    // @ts-ignore
    const value = obj[key]
    // @ts-ignore
    const nextValue = nextObj[key]
    const valueType = typeof nextValue
    let replacedValue
    switch (valueType) {
      case 'string':
      case 'number':
      case 'bigint':
      case 'boolean':
        replacedValue = nextValue
        break
      case 'object':
        if (value !== undefined && typeof value === 'object') {
          replacedValue = refStableReplace(value, nextValue)
        } else {
          replacedValue = nextValue
        }
        break
      default:
        throw Error(`Invalid object provided, containing item of type '${valueType}'`)
    }

    return Object.assign(replacedObj, {[key]: replacedValue})
  }, {} as T)

  // Special case: the new replaced object is identical to the original object across all keys.
  // Maintain ref equality by simply returning the original object
  const allKeys = Array.from(new Set([...Object.keys(replaced), ...Object.keys(obj)]))
  // @ts-ignore
  if (allKeys.map(key => replaced[key] === obj[key]).every(Boolean)) {
    return obj
  }

  return replaced
}

/**
 * Manage referentially-stable state. That is, on update the new value is
 * deep-compared with the previous value rather than replaced blindly, such
 * that a path `p` is equal (by Object.is) to the path `p` in the new state
 * iff the values are deep-equal.
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
function useReferentiallyStableState<T extends object>(
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>]
function useReferentiallyStableState<T extends object | null>(
  initial: (T | null) | (() => T | null)
): [T | null, Dispatch<SetStateAction<T>>]
function useReferentiallyStableState<T extends object | null>(
  initial: (T | null) | (() => T | null)
): [T | null, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial)

  const deepSetValue = useCallback(
    (arg: T | ((prev: T) => T)) => {
      const newValue: T | null = typeof arg === 'function' ? (arg as Function)(value) : arg
      if (value !== null && newValue !== null) {
        setValue(refStableReplace(value as NonNull<T>, newValue as NonNull<T>))
      } else {
        setValue(newValue)
      }
    },
    [value]
  )

  return [value, deepSetValue]
}

export default useReferentiallyStableState
