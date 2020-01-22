import * as React from 'react'

export default function useStableValue<T>(initializerFn: () => T): T {
  const ref = React.useRef<{value: T} | null>(null)

  if (ref.current === null) {
    ref.current = {value: initializerFn()}
  }

  return ref.current.value
}
