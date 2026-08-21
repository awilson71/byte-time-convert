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

// PnW is its own top-level form in ISO 8601 and can't combine with the
// PnDTnHnMnS form, so it gets a separate pattern rather than an optional group.
const ISO_WEEK_PATTERN = /^([+-])?P(\d+(?:\.\d+)?)W$/
const ISO_DURATION_PATTERN = /^([+-])?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/

/** Parses an ISO 8601 duration string like "P1DT2H30M" or "P3W" into milliseconds. */
export function parseISODuration(input: string): number {
  const trimmed = input.trim()

  const weekMatch = ISO_WEEK_PATTERN.exec(trimmed)
  if (weekMatch) {
    const [, sign, weeks] = weekMatch
    const totalMs = Number(weeks) * UNIT_MS.w
    return sign === '-' ? -totalMs : totalMs
  }

  const match = ISO_DURATION_PATTERN.exec(trimmed)
  if (!match) {
    throw new Error(`invalid ISO 8601 duration: "${input}"`)
  }
  const [, sign, days, hours, minutes, seconds] = match
  if (!days && !hours && !minutes && !seconds) {
    throw new Error(`invalid ISO 8601 duration: "${input}"`)
  }
  const totalMs =
    Number(days ?? 0) * UNIT_MS.d +
    Number(hours ?? 0) * UNIT_MS.h +
    Number(minutes ?? 0) * UNIT_MS.m +
    Number(seconds ?? 0) * UNIT_MS.s
  return sign === '-' ? -totalMs : totalMs
}

/** Formats milliseconds as an ISO 8601 duration string, e.g. 5400000 -> "PT1H30M". */
export function formatISODuration(ms: number): string {
  if (!Number.isFinite(ms)) {
    throw new RangeError('duration must be a finite number of milliseconds')
  }
  const sign = ms < 0 ? '-' : ''
  let remaining = Math.round(Math.abs(ms))
  if (remaining === 0) {
    return 'PT0S'
  }

  const days = Math.floor(remaining / UNIT_MS.d)
  remaining -= days * UNIT_MS.d
  const hours = Math.floor(remaining / UNIT_MS.h)
  remaining -= hours * UNIT_MS.h
  const minutes = Math.floor(remaining / UNIT_MS.m)
  remaining -= minutes * UNIT_MS.m
  const seconds = remaining / UNIT_MS.s

  const datePart = days > 0 ? `${days}D` : ''
  let timePart = ''
  if (hours > 0) timePart += `${hours}H`
  if (minutes > 0) timePart += `${minutes}M`
  if (seconds > 0) timePart += `${seconds}S`

  return `${sign}P${datePart}${timePart ? `T${timePart}` : ''}`
}
