// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dictionary<K extends keyof any, V> = {
  [P in K]?: V
}

/**
 * A version of the Omit builtin which distributes over unions.
 *
 * @see https://stackoverflow.com/a/57103940
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type NonNull<T> = Exclude<T, null>

export type JsonValue = null | boolean | number | string | JsonValue[] | {[prop: string]: JsonValue}

export interface JsonObjectValue {
  [prop: string]: JsonValue
}

/*
 * A type that only matches against JSON-compatible values.
 *
 * E.g., JsonCompatible<string> and JsonCompatible<{key: number}> have members,
 * while JsonCompatible<Date> and JsonCompatible<Function> do not.
 */
export type JsonCompatible<T> = {
  [P in keyof T]: T[P] extends JsonValue
    ? T[P]
    : Pick<T, P> extends Required<Pick<T, P>>
    ? never
    : JsonCompatible<T[P]>
}
