import {useRef, useEffect} from 'react'

/**
 * Track a variable and return its value from the previous render.
 */
export default function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value)

  useEffect(() => {
    ref.current = value
  })

  return ref.current
}
