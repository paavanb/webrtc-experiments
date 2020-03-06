export default function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}
