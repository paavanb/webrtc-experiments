/**
 * Omit keys from an object
 */
export default function omit<T>(obj: Record<string, T>, omitKeys: string[]): Record<string, T> {
  const omitKeysSet = new Set(omitKeys)

  return Object.keys(obj)
    .filter(key => !omitKeysSet.has(key))
    .reduce((newObj, key) => Object.assign(newObj, {[key]: obj[key]}), {})
}
