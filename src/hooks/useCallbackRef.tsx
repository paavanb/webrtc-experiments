import {useRef, useEffect, useCallback} from 'react'

/**
 * Instead of returning the callback in a closure, return a ref.
 * This can be useful when state values need to be accessible in contexts
 * whose closures are not updated with re-renders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useCallbackRef<T extends (...args: any[]) => any>(
  fn: T,
  deps: React.DependencyList
): React.MutableRefObject<T> {
  const cb = useCallback(fn, [...deps, fn]) // eslint-disable-line react-hooks/exhaustive-deps
  const cbRef = useRef(cb)
  useEffect(() => {
    cbRef.current = cb
  }, [cb])

  return cbRef
}
