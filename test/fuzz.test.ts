import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatBytes, parseBytes } from '../src/bytes.js'
import { formatDuration, parseDuration, formatISODuration, parseISODuration } from '../src/duration.js'

// Deterministic PRNG (mulberry32) rather than Math.random, so a failing case
// is reproducible from the seed instead of only showing up on some runs.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

const FUZZ_ITERATIONS = 200

// formatBytes rounds to `precision` digits, so the round trip can't be exact.
// The max error toFixed(p) can introduce is 0.5 * 10^-p of the scaled unit
// value, and the scaled value is always >= 1 (formatBytes picks the unit so
// the mantissa lands in [1, base)), so relative error is bounded by 10^-p
// with room to spare — 1% is a safe, non-flaky ceiling for the default
// precision of 2.
function assertBytesRoundTrip(bytes: number, options?: Parameters<typeof formatBytes>[1]): void {
  const formatted = formatBytes(bytes, options)
  const roundTripped = parseBytes(formatted)
  const relError = Math.abs(roundTripped - bytes) / Math.abs(bytes)
  assert.ok(
    relError <= 0.01,
    `${bytes} -> ${formatted} -> ${roundTripped} (relative error ${relError})`,
  )
}

test('formatBytes/parseBytes round-trip within rounding tolerance (decimal)', () => {
  const rng = mulberry32(1)
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const sign = rng() < 0.5 ? -1 : 1
    assertBytesRoundTrip(sign * randomInt(rng, 1, 10 ** 15))
  }
})

test('formatBytes/parseBytes round-trip within rounding tolerance (binary)', () => {
  const rng = mulberry32(2)
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const sign = rng() < 0.5 ? -1 : 1
    assertBytesRoundTrip(sign * randomInt(rng, 1, 10 ** 15), { binary: true })
  }
})

// Unlike bytes, duration has no rounding step: formatDuration breaks ms down
// into whole unit counts with "ms" as the smallest unit, so every integer
// millisecond is fully accounted for and the round trip is exact.
test('formatDuration/parseDuration round-trip exactly', () => {
  const rng = mulberry32(3)
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const sign = rng() < 0.5 ? -1 : 1
    const ms = sign * randomInt(rng, 0, 10 ** 13)
    assert.equal(parseDuration(formatDuration(ms)), ms, `formatDuration(${ms}) = ${formatDuration(ms)}`)
  }
})

// formatISODuration's seconds field can carry a fractional part, and
// multiplying that fraction back out in parseISODuration isn't guaranteed to
// land on the exact original float (e.g. 1.234 * 1000 in IEEE 754). Fuzzing
// with whole seconds sidesteps that and still exercises the D/H/M/S carry
// logic exactly, the same way the duration test does.
test('formatISODuration/parseISODuration round-trip exactly for whole seconds', () => {
  const rng = mulberry32(4)
  for (let i = 0; i < FUZZ_ITERATIONS; i++) {
    const sign = rng() < 0.5 ? -1 : 1
    const ms = sign * randomInt(rng, 0, 10 ** 8) * 1000
    assert.equal(
      parseISODuration(formatISODuration(ms)),
      ms,
      `formatISODuration(${ms}) = ${formatISODuration(ms)}`,
    )
  }
})
