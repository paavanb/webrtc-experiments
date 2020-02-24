/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 *
 */
export default function shuffle<T>(array: T[]): T[] {
  const clone = array.slice()
  let currentIndex = clone.length
  let temporaryValue
  let randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = clone[currentIndex]
    clone[currentIndex] = clone[randomIndex]
    clone[randomIndex] = temporaryValue
  }

  return clone
}
