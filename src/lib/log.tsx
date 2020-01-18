export default function log(...values: unknown[]): void {
  // eslint-disable-next-line no-console
  console.debug('[WT] ', ...values)
}
