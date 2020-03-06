type PropertyKey = string | number | symbol
type Entry<T> = [PropertyKey, T]

export default function fromEntries<T>(entries: Entry<T>[]): {[k in PropertyKey]: T} {
  return entries.reduce((obj, entry) => Object.assign(obj, {[entry[0]]: entry[1]}), {})
}
