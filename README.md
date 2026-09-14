# byte-time-convert

Config files, CLI flags, and log lines are full of values like `512MB`,
`10GiB`, `30s`, and `1h30m`. Somewhere in the code they need to become an
actual number of bytes or milliseconds to do math with, and later they need
to turn back into something a person can read. This is a small library for
that round trip, for both byte sizes and durations.

No dependencies. Two small modules, both plain functions.

## Usage

```
npm install byte-time-convert
```

```ts
import { parseBytes, formatBytes, parseDuration, formatDuration } from 'byte-time-convert'

parseBytes('1.5GB')              // 1500000000
parseBytes('2MiB')               // 2097152
formatBytes(1500000000)          // "1.5 GB"
formatBytes(2097152, { binary: true }) // "2 MiB"

parseDuration('1h30m')           // 5400000
parseDuration('90s')             // 90000
formatDuration(5400000)          // "1h30m"
formatDuration(1500)             // "1s500ms"
```

Byte sizes come in two families and the library keeps them distinct: `KB`,
`MB`, `GB`, ... are base 1000 (decimal, the SI convention), and `KiB`, `MiB`,
`GiB`, ... are base 1024 (binary). Pass `{ binary: true }` to `formatBytes`
to get binary units out; `parseBytes` figures out which family a string
belongs to from its unit. `parseBytes` also accepts comma thousand
separators (`1,500,000`, `"1,500MB"`), as long as the grouping is a real
one — `1,05` is rejected rather than silently read as `105`.

Durations are parsed as a run of `<number><unit>` pairs with no separators
(`1h30m`, not `1h 30m`) using `ms`, `s`, `m`, `h`, `d`, `w`. A leading `-`
negates the whole value. `formatDuration` breaks milliseconds back down into
the same compact form, dropping any unit that would be zero.

`parseISODuration` and `formatISODuration` cover the ISO 8601 duration
format instead (`P1DT2H30M`, `PT90S`, `P3W`). There's no `Y` or `M`
(calendar year/month) support, since those aren't a fixed number of
milliseconds — everything else here is.

```ts
import { parseISODuration, formatISODuration } from 'byte-time-convert'

parseISODuration('P1DT2H30M')    // 95400000
parseISODuration('P3W')          // 1814400000
formatISODuration(95_400_000)    // "P1DT2H30M"
```

## CLI

`src/cli.ts` wraps the same functions for use on the command line. It reads
values one per line from stdin and writes the converted result to stdout,
deciding the direction per line: a plain number is formatted into a readable
string, anything else is parsed into a number.

```
npm run build
echo -e "1500000000\n1.5GB\n2MiB" | node dist/src/cli.js --bytes
# 1.5 GB
# 1500000000
# 2097152

echo -e "90000\n1h30m" | node dist/src/cli.js --duration
# 1m30s
# 5400000
```

Flags: `--bytes`, `--duration`, or `--iso-duration` picks the conversion
(exactly one is required); `--binary` formats byte counts as KiB/MiB/...
instead of KB/MB/...; `--precision <n>` and `--max-units <n>` are passed
through to `formatBytes` and `formatDuration`. Lines that fail to parse are
reported on stderr and skipped rather than stopping the whole run; the
process exits non-zero if any line failed.

## Development

```
npm run build   # compile with tsc
npm test        # build, then run the test suite with node --test
```

The test suite in `test/format.test.ts` is table-driven: each case is a row
of input and expected output, run through a loop. It's built around the
boundary cases that are easy to get wrong — exact unit boundaries (999 vs
1000 bytes, 1023 vs 1024), rounding that would otherwise bump a value into
the next unit's territory, negative values, and malformed input that should
throw rather than silently return something wrong.
