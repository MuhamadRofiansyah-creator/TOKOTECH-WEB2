// Fixed "now" for all mock data (16 Nov 2026, 00:00 UTC), so server and client
// renders agree and the seed is reproducible. Phase 2 queries use the real clock.
export const MOCK_NOW = Date.UTC(2026, 10, 16)
export const DAY = 86_400_000
export const HOUR = 3_600_000
export const iso = (ms: number) => new Date(ms).toISOString()

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
