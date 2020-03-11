export default function setEqual<T>(fstSet: Set<T>, sndSet: Set<T>): boolean {
  return (
    fstSet.size === sndSet.size &&
    Array.from(fstSet.entries())
      .map(([entry]) => sndSet.has(entry))
      .every(Boolean)
  )
}
