const DECIMAL_UNITS: Record<string, number> = {
  b: 1,
  kb: 1e3,
  mb: 1e6,
  gb: 1e9,
  tb: 1e12,
  pb: 1e15,
  eb: 1e18,
}

const BINARY_UNITS: Record<string, number> = {
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
  pib: 1024 ** 5,
  eib: 1024 ** 6,
}

const DECIMAL_ORDER = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
const BINARY_ORDER = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']

const SIZE_PATTERN = /^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/

export interface FormatBytesOptions {
  /** Use base-1024 units (KiB, MiB, ...) instead of base-1000 (KB, MB, ...). */
  binary?: boolean
  /** Digits after the decimal point. Defaults to 2. */
  precision?: number
}

/** Parses a byte size string like "1.5GB" or "2 KiB" into a raw byte count. */
export function parseBytes(input: string): number {
  const trimmed = input.trim()
  const match = SIZE_PATTERN.exec(trimmed)
  if (!match) {
    throw new Error(`invalid byte size: "${input}"`)
  }
  const [, amount, rawUnit] = match
  const unit = rawUnit.toLowerCase()
  if (unit === '') {
    return Number(amount)
  }
  const multiplier = DECIMAL_UNITS[unit] ?? BINARY_UNITS[unit]
  if (multiplier === undefined) {
    throw new Error(`unknown byte unit: "${rawUnit}"`)
  }
  return Number(amount) * multiplier
}

/** Formats a byte count as a human-readable string, e.g. 1536 -> "1.5 KiB" with { binary: true }. */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  if (!Number.isFinite(bytes)) {
    throw new RangeError('byte count must be a finite number')
  }
  const { binary = false, precision = 2 } = options
  const base = binary ? 1024 : 1000
  const units = binary ? BINARY_ORDER : DECIMAL_ORDER

  const sign = bytes < 0 ? '-' : ''
  const abs = Math.abs(bytes)
  if (abs === 0) {
    return '0 B'
  }

  let exponent = Math.min(Math.floor(Math.log(abs) / Math.log(base)), units.length - 1)
  let scaled = Number((abs / base ** exponent).toFixed(precision))

  // Rounding can push a value like 999.6 KB up to "1000.00 KB"; bump to the
  // next unit so we never print a value that reads as its own next tier.
  if (scaled >= base && exponent < units.length - 1) {
    exponent += 1
    scaled = Number((abs / base ** exponent).toFixed(precision))
  }

  const formatted = exponent === 0 ? String(scaled) : scaled.toFixed(precision).replace(/\.?0+$/, '')
  return `${sign}${formatted} ${units[exponent]}`
}
