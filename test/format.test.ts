import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatBytes, parseBytes, type FormatBytesOptions } from '../src/bytes.js'
import { formatDuration, parseDuration } from '../src/duration.js'

const byteFormatCases: Array<[number, FormatBytesOptions | undefined, string]> = [
  [0, undefined, '0 B'],
  [1, undefined, '1 B'],
  [999, undefined, '999 B'],
  [1000, undefined, '1 KB'], // exactly on the decimal boundary
  [1023, { binary: true }, '1023 B'], // one below the binary boundary
  [1024, { binary: true }, '1 KiB'], // exactly on the binary boundary
  [999500, undefined, '999.5 KB'], // fraction that must not round up a tier
  [999500, { precision: 0 }, '1 MB'], // rounding at precision 0 must bump the unit
  [-2048, { binary: true }, '-2 KiB'], // negative values keep their sign
  [1_500_000_000, undefined, '1.5 GB'],
]

for (const [bytes, options, expected] of byteFormatCases) {
  test(`formatBytes(${bytes}, ${JSON.stringify(options)}) === ${JSON.stringify(expected)}`, () => {
    assert.equal(formatBytes(bytes, options), expected)
  })
}

const byteParseCases: Array<[string, number]> = [
  ['0', 0],
  ['0B', 0],
  ['1KB', 1000],
  ['1KiB', 1024],
  ['1.5GB', 1_500_000_000],
  ['2MiB', 2 * 1024 * 1024],
  ['-1MB', -1_000_000],
  ['  10 GB  ', 10_000_000_000], // surrounding whitespace is tolerated
  ['5kb', 5000], // unit matching is case-insensitive
]

for (const [input, expected] of byteParseCases) {
  test(`parseBytes(${JSON.stringify(input)}) === ${expected}`, () => {
    assert.equal(parseBytes(input), expected)
  })
}

const byteParseErrorCases = ['', 'KB', '1XB', 'abc']

for (const input of byteParseErrorCases) {
  test(`parseBytes(${JSON.stringify(input)}) throws`, () => {
    assert.throws(() => parseBytes(input))
  })
}

const durationFormatCases: Array<[number, string]> = [
  [0, '0ms'],
  [1, '1ms'],
  [999, '999ms'], // just under the second boundary
  [1000, '1s'], // exactly on the second boundary
  [1500, '1s500ms'], // needs two segments to round-trip cleanly
  [60_000, '1m'],
  [90_000, '1m30s'],
  [3_600_000, '1h'],
  [86_400_000, '1d'],
  [-5000, '-5s'], // negative values keep their sign
]

for (const [ms, expected] of durationFormatCases) {
  test(`formatDuration(${ms}) === ${JSON.stringify(expected)}`, () => {
    assert.equal(formatDuration(ms), expected)
  })
}

const durationParseCases: Array<[string, number]> = [
  ['0ms', 0],
  ['1000ms', 1000],
  ['1s', 1000],
  ['1.5s', 1500], // fractional amounts are allowed
  ['90s', 90_000],
  ['1h30m', 5_400_000], // compound, no separators
  ['-5m', -300_000],
  ['1d', 86_400_000],
  ['1H30M', 5_400_000], // case-insensitive units
]

for (const [input, expected] of durationParseCases) {
  test(`parseDuration(${JSON.stringify(input)}) === ${expected}`, () => {
    assert.equal(parseDuration(input), expected)
  })
}

const durationParseErrorCases = ['', '5', '5x', '1h 30m', 'abc']

for (const input of durationParseErrorCases) {
  test(`parseDuration(${JSON.stringify(input)}) throws`, () => {
    assert.throws(() => parseDuration(input))
  })
}
