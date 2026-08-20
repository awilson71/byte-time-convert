const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
}

// Order matters: longer units first so formatting reads largest-to-smallest,
// and "ms" is checked before "s" during parsing so it isn't swallowed by it.
const UNIT_ORDER: Array<[string, number]> = [
  ['w', UNIT_MS.w],
  ['d', UNIT_MS.d],
  ['h', UNIT_MS.h],
  ['m', UNIT_MS.m],
  ['s', UNIT_MS.s],
  ['ms', UNIT_MS.ms],
]

const TOKEN_PATTERN = /(\d*\.?\d+)(ms|s|m|h|d|w)/gi

export interface FormatDurationOptions {
  /** Cap on how many unit segments to include, largest first. Defaults to no cap. */
  maxUnits?: number
}

/** Parses a compact duration string like "1h30m" or "-90s" into milliseconds. */
export function parseDuration(input: string): number {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    throw new Error('cannot parse empty duration string')
  }

  let negative = false
  let body = trimmed
  if (body[0] === '-') {
    negative = true
    body = body.slice(1)
  } else if (body[0] === '+') {
    body = body.slice(1)
  }

  let totalMs = 0
  let consumed = 0
  TOKEN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN_PATTERN.exec(body)) !== null) {
    // A gap (whitespace or junk) between tokens means the string isn't a
    // clean run of number+unit pairs, e.g. "1h 30m" or "1h!30m".
    if (match.index !== consumed) {
      throw new Error(`invalid duration: "${input}"`)
    }
    const [full, amount, unit] = match
    totalMs += Number(amount) * UNIT_MS[unit.toLowerCase()]
    consumed += full.length
  }

  if (consumed === 0 || consumed !== body.length) {
    throw new Error(`invalid duration: "${input}"`)
  }

  return negative ? -totalMs : totalMs
}

/** Formats milliseconds as a compact duration string, e.g. 90000 -> "1m30s". */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  if (!Number.isFinite(ms)) {
    throw new RangeError('duration must be a finite number of milliseconds')
  }
  const { maxUnits = Infinity } = options

  const sign = ms < 0 ? '-' : ''
  let remaining = Math.round(Math.abs(ms))
  if (remaining === 0) {
    return '0ms'
  }

  const parts: string[] = []
  for (const [unit, size] of UNIT_ORDER) {
    if (parts.length === maxUnits) break
    if (remaining < size) continue
    const value = Math.floor(remaining / size)
    remaining -= value * size
    parts.push(`${value}${unit}`)
  }

  return sign + parts.join('')
}
