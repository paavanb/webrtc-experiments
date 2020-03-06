import log from './log'
/**
 * Asserts that a value has type `never`, i.e., as far as the TS compiler is concerned, this code
 * can never be reached. If it is reached anyway (e.g., because of unsafe typing), an error is thrown.
 *
 * This is a good function to call at the end of a switch statement where you expect to have
 * covered all possible cases.
 *
 * @see [Exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
 */
export default function assertNever(value: never, message: string = 'Unexpected value'): void {
  log(`${message}: ${value}`)
}
