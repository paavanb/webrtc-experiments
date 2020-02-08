const textDecoder = new TextDecoder('utf-8')

function deepDecodeValue(value: unknown): unknown {
  let decodedValue = value
  if (value instanceof Uint8Array) {
    decodedValue = textDecoder.decode(value)
  } else if (Array.isArray(value)) {
    decodedValue = value.map(deepDecodeValue)
  } else if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    decodedValue = Object.keys(obj).reduce(
      (decodedObj, key) => Object.assign(decodedObj, {[key]: deepDecodeValue(obj[key])}),
      {}
    )
  }

  return decodedValue
}

/**
 * Deep-convert all Uint8[] fields to strings.
 * Currently, our messages do not store any binary data, so we can
 * assume all such fields are strings.
 * Assumes data is a JSON object.
 */
export default function deepDecodeMessage(data: Record<string, unknown>): object {
  return deepDecodeValue(data) as object
}
