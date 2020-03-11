import {useState, useCallback, Dispatch, SetStateAction} from 'react'

import {NonNull, JsonObjectValue, JsonCompatible} from '../lib/types'
import setEqual from '../lib/setEqual'

/*
 * Replace a JSON-compatible value with another value of the same type, while
 * maintaining referential equality wherever possible.
 */
function refStableReplace<T extends JsonCompatible<T>>(value: T, nextValue: T): T {
  // Recursively replace all subkeys
  const nextValueType = typeof nextValue
  switch (nextValueType) {
    // Trivial case: these types are equal by value.
    case 'string':
    case 'number':
    case 'bigint':
    case 'boolean':
      return nextValue
    case 'object':
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && Array.isArray(nextValue)) {
          // Both arrays, recursively replace all entries
          const replacedArr = nextValue.map((_, idx) =>
            refStableReplace(value[idx], nextValue[idx])
          )

          const hasSameValues = replacedArr.map((v, idx) => v === value[idx]).every(Boolean)

          // If the arrays are the same length and all values are referentially equal,
          // we can safely substitute `value` for `nextValue`
          if (value.length === nextValue.length && hasSameValues) {
            return value
          }
          // @ts-ignore
          return replacedArr as T
        }
        if (
          !Array.isArray(value) &&
          !Array.isArray(nextValue) &&
          value != null &&
          nextValue != null
        ) {
          // Both objects, recursively replace all keys
          const obj = value as JsonObjectValue
          const nextObj = nextValue as JsonObjectValue
          const replacedObj = Object.keys(nextObj).reduce(
            (accValue, key) =>
              Object.assign(accValue, {
                [key]: refStableReplace(obj[key], nextObj[key]),
              }),
            {}
          ) as JsonObjectValue

          // If both `value` and `nextValue` have the same keys and all values are referentially equal,
          // we can safely substitute `value` for `nextValue`
          const hasSameKeys = setEqual(new Set(Object.keys(obj)), new Set(Object.keys(replacedObj)))
          const hasSameValues = Object.keys(replacedObj)
            .map(key => replacedObj[key] === obj[key])
            .every(Boolean)
          if (hasSameKeys && hasSameValues) {
            return obj as T
          }
          return replacedObj as T
        }
        // Mixed
        return nextValue
      }
      return nextValue
    default:
      throw Error(`Invalid object provided, containing item of type '${nextValueType}'`)
  }
}

/**
 * Manage referentially-stable state. That is, on update the new value is
 * deep-compared with the previous value rather than replaced entirely, such
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
function useReferentiallyStableState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useReferentiallyStableState<T extends any | null>(
  initial: (T | null) | (() => T | null)
): [T | null, Dispatch<SetStateAction<T>>]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useReferentiallyStableState<T extends any | null>(
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
