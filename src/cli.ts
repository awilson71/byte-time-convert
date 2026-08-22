#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { formatBytes, parseBytes } from './bytes.js'
import { formatDuration, parseDuration, formatISODuration, parseISODuration } from './duration.js'

type Kind = 'bytes' | 'duration' | 'iso-duration'

interface Args {
  kind: Kind
  binary: boolean
  precision?: number
  maxUnits?: number
}

function parseArgs(argv: string[]): Args {
  let kind: Kind | undefined
  let binary = false
  let precision: number | undefined
  let maxUnits: number | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--bytes':
        kind = 'bytes'
        break
      case '--duration':
        kind = 'duration'
        break
      case '--iso-duration':
        kind = 'iso-duration'
        break
      case '--binary':
        binary = true
        break
      case '--precision':
        precision = Number(argv[++i])
        break
      case '--max-units':
        maxUnits = Number(argv[++i])
        break
      default:
        throw new Error(`unrecognized argument: "${arg}"`)
    }
  }

  if (!kind) {
    throw new Error('missing conversion type: pass --bytes, --duration, or --iso-duration')
  }
  return { kind, binary, precision, maxUnits }
}

// Each line is either a plain number (format it as a readable string) or a
// unit string (parse it to the underlying number) — the direction is decided
// per line, not fixed for the whole run, so a file of mixed values works.
function convertLine(line: string, args: Args): string {
  const isPlainNumber = /^[+-]?\d*\.?\d+$/.test(line)

  if (args.kind === 'bytes') {
    if (isPlainNumber) {
      return formatBytes(Number(line), { binary: args.binary, precision: args.precision })
    }
    return String(parseBytes(line))
  }

  if (args.kind === 'duration') {
    if (isPlainNumber) {
      return formatDuration(Number(line), { maxUnits: args.maxUnits })
    }
    return String(parseDuration(line))
  }

  if (isPlainNumber) {
    return formatISODuration(Number(line))
  }
  return String(parseISODuration(line))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

  let hadError = false
  for await (const rawLine of rl) {
    const line = rawLine.trim()
    if (line === '') continue
    try {
      console.log(convertLine(line, args))
    } catch (err) {
      hadError = true
      console.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (hadError) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
