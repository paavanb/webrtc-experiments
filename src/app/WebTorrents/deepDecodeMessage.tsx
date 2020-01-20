const textDecoder = new TextDecoder('utf-8')
/**
 * Deep-convert all Uint8[] fields to strings.
 * Currently, our messages do not store any binary data, so we can
 * assume all such fields are strings.
 * Assumes data is a JSON object.
 */
export default function deepDecodeMessage(data: Record<string, unknown>): object {
  return Object.keys(data).reduce((decodedObj, key) => {
    const value = data[key]
    let decodedValue = value
    if (value instanceof Uint8Array) {
      decodedValue = textDecoder.decode(value)
    } else if (Array.isArray(value)) {
      decodedValue = value.map(deepDecodeMessage)
    } else if (typeof value === 'object' && value !== null) {
      decodedValue = deepDecodeMessage(value as Record<string, unknown>)
    }
    return Object.assign(decodedObj, {[key]: decodedValue})
  }, {} as object)
}
