import type { Task } from "./types";

// 32 tasks total, ordered core -> hard -> novel (see the tier-boundary
// comments below). Each ships a prompt (what the generating model sees)
// and a set of hidden tests (what it never sees).

export const TASKS: Task[] = [
  {
    id: "parse-duration",
    title: "Parse a duration string into total seconds",
    functionName: "parseDuration",
    paramNames: ["input"],
    prompt: `Write a JavaScript function named "parseDuration" with signature parseDuration(input).

It parses a duration string made of one or more "<number><unit>" segments
concatenated with no separators, where unit is one of:
  d = days, h = hours, m = minutes, s = seconds

Numbers are always non-negative integers. Each unit appears at most once in
a given input, but units may appear in any order. Return the total duration
in seconds as an integer.

If the input is an empty string, return 0.
If the input is malformed (a number with no recognized unit, a unit with no
number, or any character that isn't part of a number/unit segment), throw
an Error.

Examples:
  parseDuration("1h30m") === 5400
  parseDuration("2d4h") === 187200
  parseDuration("45s") === 45`,
    hiddenTests: [
      { name: "hours and minutes", args: ["1h30m"], expected: 5400 },
      { name: "seconds only", args: ["45s"], expected: 45 },
      { name: "days only", args: ["2d"], expected: 172800 },
      { name: "minutes over 59", args: ["90m"], expected: 5400 },
      { name: "empty string", args: [""], expected: 0 },
      { name: "all four units", args: ["1d2h3m4s"], expected: 93784 },
      { name: "zero seconds", args: ["0s"], expected: 0 },
      { name: "units out of order", args: ["30m1h"], expected: 5400 },
      { name: "number with no unit throws", args: ["5"], throws: true },
      { name: "unit with no number throws", args: ["h"], throws: true },
      { name: "unrecognized unit throws", args: ["5x"], throws: true },
    ],
  },

  {
    id: "merge-intervals",
    title: "Merge overlapping or touching integer intervals",
    functionName: "mergeIntervals",
    paramNames: ["intervals"],
    prompt: `Write a JavaScript function named "mergeIntervals" with signature
mergeIntervals(intervals).

"intervals" is an array of [start, end] pairs of integers (start <= end),
not necessarily sorted and not necessarily non-overlapping. Two intervals
should be merged if they overlap OR if they touch (the end of one equals
the start of the other). Return a new array of merged [start, end] pairs,
sorted ascending by start.

Examples:
  mergeIntervals([[1,3],[2,6],[8,10],[15,18]]) === [[1,6],[8,10],[15,18]]
  mergeIntervals([[1,4],[4,5]]) === [[1,5]]   // touching counts as overlap
  mergeIntervals([[1,4],[5,6]]) === [[1,4],[5,6]]  // gap, no merge
  mergeIntervals([]) === []`,
    hiddenTests: [
      {
        name: "classic overlap",
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
      },
      { name: "touching merges", args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { name: "gap does not merge", args: [[[1, 4], [5, 6]]], expected: [[1, 4], [5, 6]] },
      { name: "empty input", args: [[]], expected: [] },
      { name: "single interval", args: [[[5, 10]]], expected: [[5, 10]] },
      {
        name: "unsorted input",
        args: [[[8, 10], [1, 3], [2, 6]]],
        expected: [[1, 6], [8, 10]],
      },
      { name: "fully nested interval", args: [[[1, 10], [2, 5]]], expected: [[1, 10]] },
      { name: "negative numbers", args: [[[-5, -1], [-2, 3]]], expected: [[-5, 3]] },
      {
        name: "chained touching merges",
        args: [[[1, 2], [2, 3], [3, 4]]],
        expected: [[1, 4]],
      },
    ],
  },

  {
    // This is the task most likely to fail on a first attempt: the spec
    // reads as simple type-checking, but a naive `typeof value === type`
    // implementation silently mishandles two cases hidden tests below
    // exercise: arrays (typeof [] is "object", not "array") and NaN
    // (typeof NaN is "number", but NaN isn't a valid number value).
    id: "validate-record",
    title: "Validate a record against a simple field schema",
    functionName: "validateRecord",
    paramNames: ["record", "schema"],
    prompt: `Write a JavaScript function named "validateRecord" with signature
validateRecord(record, schema).

"schema" is an object mapping field names to { type, required }, where type
is one of "string", "number", "boolean", "array", and required is a
boolean. "record" is a plain object to validate against it.

Return an array of human-readable error strings (empty array means valid).
Check fields in the order they appear in the schema object:
  - If a field is required and missing from the record (undefined or null),
    add the error "<field> is required".
  - If a field is present (not undefined/null) but its value is not a
    valid value of the declared type, add the error
    "<field> must be of type <type>".
  - Fields in the record that aren't in the schema are ignored.
  - A field that is optional and absent produces no error at all.

Examples:
  validateRecord({name: "Alice"}, {name: {type: "string", required: true}}) === []
  validateRecord({}, {name: {type: "string", required: true}})
    === ["name is required"]
  validateRecord({age: "old"}, {age: {type: "number", required: true}})
    === ["age must be of type number"]`,
    hiddenTests: [
      {
        name: "valid record",
        args: [{ name: "Alice" }, { name: { type: "string", required: true } }],
        expected: [],
      },
      {
        name: "missing required field",
        args: [{}, { name: { type: "string", required: true } }],
        expected: ["name is required"],
      },
      {
        name: "wrong type",
        args: [{ age: "old" }, { age: { type: "number", required: true } }],
        expected: ["age must be of type number"],
      },
      {
        name: "optional field absent is fine",
        args: [{}, { nickname: { type: "string", required: false } }],
        expected: [],
      },
      {
        name: "unknown fields ignored",
        args: [{ name: "Bob", extra: 123 }, { name: { type: "string", required: true } }],
        expected: [],
      },
      {
        name: "null counts as missing",
        args: [{ name: null }, { name: { type: "string", required: true } }],
        expected: ["name is required"],
      },
      {
        name: "zero is present, not missing",
        args: [{ count: 0 }, { count: { type: "number", required: true } }],
        expected: [],
      },
      {
        name: "false is present, not missing",
        args: [{ active: false }, { active: { type: "boolean", required: true } }],
        expected: [],
      },
      {
        name: "empty string is present, not missing",
        args: [{ name: "" }, { name: { type: "string", required: true } }],
        expected: [],
      },
      {
        name: "array type accepted, not typeof 'array'",
        args: [{ tags: ["a", "b"] }, { tags: { type: "array", required: true } }],
        expected: [],
      },
      {
        name: "plain object rejected for array type",
        args: [{ tags: { a: 1 } }, { tags: { type: "array", required: true } }],
        expected: ["tags must be of type array"],
      },
      {
        name: "NaN is not a valid number",
        args: [{ score: NaN }, { score: { type: "number", required: true } }],
        expected: ["score must be of type number"],
      },
      {
        name: "multiple errors in schema order",
        args: [
          { age: "old" },
          {
            name: { type: "string", required: true },
            age: { type: "number", required: true },
          },
        ],
        expected: ["name is required", "age must be of type number"],
      },
    ],
  },

  // --- Expanded task set: coverage across categories, not curated to
  // break models. Selected for range, not for failure.

  // String parsing
  {
    id: "parse-csv-line",
    title: "Parse a single CSV line with quoted fields",
    functionName: "parseCsvLine",
    paramNames: ["line"],
    prompt: `Write a JS function named "parseCsvLine" with signature parseCsvLine(line).

It parses a single line of CSV-formatted text into an array of field strings.
Fields are separated by commas. A field may be wrapped in double quotes to
allow embedded commas; inside a quoted field, two consecutive double quotes
("") represent one literal double-quote character. Return the array of
unquoted field values, in order. An empty input string should return an
array containing a single empty string field. Unquoted fields are returned
verbatim, with no trimming of surrounding whitespace.

Examples:
  parseCsvLine('a,b,c') === ["a","b","c"]
  parseCsvLine('"a,b",c') === ["a,b","c"]
  parseCsvLine('"he said ""hi""",bye') === ['he said "hi"', "bye"]`,
    hiddenTests: [
      { name: "empty string is one empty field", args: [""], expected: [""] },
      { name: "simple unquoted fields", args: ["a,b,c"], expected: ["a", "b", "c"] },
      { name: "consecutive commas", args: ["a,,c"], expected: ["a", "", "c"] },
      { name: "quoted field with embedded comma", args: ['"a,b",c'], expected: ["a,b", "c"] },
      {
        name: "escaped quote inside quoted field",
        args: ['"he said ""hi""",bye'],
        expected: ['he said "hi"', "bye"],
      },
      { name: "plain quoted field", args: ['"hello",world'], expected: ["hello", "world"] },
      { name: "single field no commas", args: ["single"], expected: ["single"] },
      {
        name: "unquoted fields keep whitespace",
        args: ["  a , b  "],
        expected: ["  a ", " b  "],
      },
    ],
  },
  {
    id: "truncate-words",
    title: "Truncate a string to at most N words",
    functionName: "truncateWords",
    paramNames: ["str", "maxWords"],
    prompt: `Write a JS function named "truncateWords" with signature
truncateWords(str, maxWords).

Words in "str" are separated by single spaces, with no leading or trailing
whitespace in the input. If the string has more than maxWords words, return
only the first maxWords words joined by single spaces, followed by " ...".
If the string has maxWords or fewer words, return it unchanged.

Examples:
  truncateWords("the quick brown fox", 2) === "the quick ..."
  truncateWords("the quick brown fox", 4) === "the quick brown fox"`,
    hiddenTests: [
      { name: "truncates to 2 words", args: ["the quick brown fox", 2], expected: "the quick ..." },
      { name: "exactly at limit is unchanged", args: ["the quick brown fox", 4], expected: "the quick brown fox" },
      { name: "under limit is unchanged", args: ["the quick brown fox", 10], expected: "the quick brown fox" },
      { name: "single word at limit", args: ["hello", 1], expected: "hello" },
      { name: "single word over a smaller limit", args: ["hello world", 1], expected: "hello ..." },
      { name: "truncate to 3 of 5", args: ["a b c d e", 3], expected: "a b c ..." },
      { name: "one word, generous limit", args: ["word", 5], expected: "word" },
    ],
  },

  // Date parsing / arithmetic
  {
    id: "add-business-days",
    title: "Add N business days to a date",
    functionName: "addBusinessDays",
    paramNames: ["dateStr", "n"],
    prompt: `Write a JS function named "addBusinessDays" with signature
addBusinessDays(dateStr, n).

"dateStr" is an ISO date string "YYYY-MM-DD". "n" is a non-negative integer.
Return the date reached by adding n business days (Monday through Friday)
after dateStr, as an ISO date string. The start date itself is never counted
as one of the n days being added, even if it falls on a weekend. Adding 0
business days always returns dateStr unchanged, even if dateStr is a
weekend date.

Example: addBusinessDays("2026-01-01", 1) === "2026-01-02" (2026-01-01 is a
Thursday, so the next business day is Friday 2026-01-02).`,
    hiddenTests: [
      { name: "zero days is unchanged", args: ["2026-01-01", 0], expected: "2026-01-01" },
      { name: "one day from a Thursday", args: ["2026-01-01", 1], expected: "2026-01-02" },
      { name: "crosses one weekend", args: ["2026-01-01", 5], expected: "2026-01-08" },
      { name: "starting on a Friday skips the weekend", args: ["2026-01-02", 1], expected: "2026-01-05" },
      { name: "starting on a Saturday, not counted", args: ["2026-01-03", 1], expected: "2026-01-05" },
      { name: "zero days from a weekend start is unchanged", args: ["2026-01-03", 0], expected: "2026-01-03" },
      { name: "crosses two weekends", args: ["2026-01-01", 10], expected: "2026-01-15" },
    ],
  },
  {
    id: "days-between",
    title: "Whole days between two ISO dates",
    functionName: "daysBetween",
    paramNames: ["a", "b"],
    prompt: `Write a JS function named "daysBetween" with signature daysBetween(a, b).

"a" and "b" are ISO date strings "YYYY-MM-DD". Return the number of whole
calendar days from a to b (b minus a) as an integer -- negative if b is
earlier than a, zero if they're the same date. Treat both as calendar dates
only; do not do any timezone-sensitive parsing.`,
    hiddenTests: [
      { name: "same date is zero", args: ["2026-01-01", "2026-01-01"], expected: 0 },
      { name: "one day forward", args: ["2026-01-01", "2026-01-02"], expected: 1 },
      { name: "one day backward is negative", args: ["2026-01-02", "2026-01-01"], expected: -1 },
      { name: "full 31-day January", args: ["2026-01-01", "2026-02-01"], expected: 31 },
      { name: "non-leap February has 28 days", args: ["2026-02-01", "2026-03-01"], expected: 28 },
      { name: "crosses a year boundary", args: ["2025-12-31", "2026-01-01"], expected: 1 },
      { name: "leap February has 29 days", args: ["2024-02-01", "2024-03-01"], expected: 29 },
    ],
  },

  // Interval / graph work
  {
    id: "has-cycle",
    title: "Detect a cycle in a directed graph",
    functionName: "hasCycle",
    paramNames: ["graph"],
    prompt: `Write a JS function named "hasCycle" with signature hasCycle(graph).

"graph" is an object mapping each node name (string) to an array of its
outgoing neighbor node names. A node that only appears as someone else's
neighbor, with no entry of its own in the object, has no outgoing edges.
The graph may be disconnected. Return true if the graph contains at least
one cycle, false otherwise.`,
    hiddenTests: [
      { name: "simple DAG has no cycle", args: [{ a: ["b"], b: ["c"], c: [] }], expected: false },
      { name: "three-node cycle", args: [{ a: ["b"], b: ["c"], c: ["a"] }], expected: true },
      { name: "self loop", args: [{ a: ["a"] }], expected: true },
      { name: "empty graph", args: [{}], expected: false },
      { name: "nodes with no edges", args: [{ a: [], b: [] }], expected: false },
      {
        name: "diamond shape converges but has no cycle",
        args: [{ a: ["b", "c"], b: ["d"], c: ["d"], d: [] }],
        expected: false,
      },
      {
        name: "cycle not involving the first node",
        args: [{ a: ["b"], b: ["c"], c: ["d"], d: ["b"] }],
        expected: true,
      },
      { name: "disconnected components, no cycle", args: [{ a: ["b"], c: ["d"] }], expected: false },
    ],
  },
  {
    id: "max-overlapping-intervals",
    title: "Maximum number of intervals overlapping at any point",
    functionName: "maxOverlappingIntervals",
    paramNames: ["intervals"],
    prompt: `Write a JS function named "maxOverlappingIntervals" with signature
maxOverlappingIntervals(intervals).

"intervals" is an array of [start, end] integer pairs, each a closed
interval (start <= end). Return the maximum number of intervals that
overlap at any single point. Two intervals that only touch at an endpoint
(one's end equals another's start) count as overlapping at that point.`,
    hiddenTests: [
      { name: "three overlapping intervals", args: [[[1, 5], [2, 6], [3, 7]]], expected: 3 },
      { name: "no overlap", args: [[[1, 2], [3, 4]]], expected: 1 },
      { name: "touching endpoints count as overlap", args: [[[1, 3], [3, 5]]], expected: 2 },
      { name: "empty input", args: [[]], expected: 0 },
      { name: "single interval", args: [[[1, 10]]], expected: 1 },
      {
        name: "overlap group plus a separate interval",
        args: [[[1, 4], [2, 5], [3, 6], [7, 8]]],
        expected: 3,
      },
      { name: "identical intervals all overlap", args: [[[1, 5], [1, 5], [1, 5]]], expected: 3 },
    ],
  },

  // Numeric edge cases
  {
    id: "safe-divide",
    title: "Divide without producing Infinity or NaN",
    functionName: "safeDivide",
    paramNames: ["a", "b"],
    prompt: `Write a JS function named "safeDivide" with signature safeDivide(a, b).

Return a divided by b. If b is 0, return null instead of Infinity,
-Infinity, or NaN -- including when a is also 0.`,
    hiddenTests: [
      { name: "normal division", args: [10, 2], expected: 5 },
      { name: "division by zero", args: [10, 0], expected: null },
      { name: "zero divided by zero", args: [0, 0], expected: null },
      { name: "negative dividend", args: [-10, 2], expected: -5 },
      { name: "non-integer result", args: [7, 2], expected: 3.5 },
      { name: "negative dividend, zero divisor", args: [-10, 0], expected: null },
      { name: "negative divisor", args: [10, -2], expected: -5 },
    ],
  },
  {
    id: "round-half-to-even",
    title: "Round using banker's rounding",
    functionName: "roundHalfToEven",
    paramNames: ["n"],
    prompt: `Write a JS function named "roundHalfToEven" with signature roundHalfToEven(n).

Round n to the nearest integer using round-half-to-even ("banker's
rounding"): when n is exactly halfway between two integers, round to
whichever of the two is even. Values that are not exactly halfway round to
the nearest integer as usual.

Examples: roundHalfToEven(2.5) === 2, roundHalfToEven(3.5) === 4`,
    hiddenTests: [
      { name: "half rounds down to even", args: [2.5], expected: 2 },
      { name: "half rounds up to even", args: [3.5], expected: 4 },
      { name: "below half rounds down", args: [2.4], expected: 2 },
      { name: "above half rounds up", args: [2.6], expected: 3 },
      { name: "negative half rounds to even (-2)", args: [-2.5], expected: -2 },
      { name: "negative half rounds to even (-4)", args: [-3.5], expected: -4 },
      { name: "zero point five rounds to zero", args: [0.5], expected: 0 },
      { name: "one point five rounds up to two", args: [1.5], expected: 2 },
    ],
  },
  {
    id: "clamp",
    title: "Clamp a value to a range",
    functionName: "clamp",
    paramNames: ["value", "min", "max"],
    prompt: `Write a JS function named "clamp" with signature clamp(value, min, max).

Return value constrained to the inclusive range [min, max]. If min > max,
treat the range as invalid and return value unchanged.`,
    hiddenTests: [
      { name: "within range", args: [5, 1, 10], expected: 5 },
      { name: "below range", args: [-5, 1, 10], expected: 1 },
      { name: "above range", args: [15, 1, 10], expected: 10 },
      { name: "inverted range returns value unchanged", args: [5, 10, 1], expected: 5 },
      { name: "single point range", args: [5, 5, 5], expected: 5 },
      { name: "below a single point range", args: [4, 5, 5], expected: 5 },
      { name: "negative range", args: [0, -10, -1], expected: -1 },
    ],
  },

  // Stateful reducers
  {
    id: "running-median",
    title: "Running median of a number stream",
    functionName: "runningMedian",
    paramNames: ["numbers"],
    prompt: `Write a JS function named "runningMedian" with signature runningMedian(numbers).

Return a new array the same length as "numbers", where element i is the
median of the first i+1 numbers (processed in the given order). For an
even-sized prefix, the median is the average of the two middle values after
sorting.`,
    hiddenTests: [
      { name: "single element", args: [[5]], expected: [5] },
      { name: "two elements averages the pair", args: [[5, 10]], expected: [5, 7.5] },
      { name: "three elements", args: [[5, 10, 1]], expected: [5, 7.5, 5] },
      { name: "four ascending elements", args: [[1, 2, 3, 4]], expected: [1, 1.5, 2, 2.5] },
      { name: "empty input", args: [[]], expected: [] },
      { name: "out of order values", args: [[3, 1, 2]], expected: [3, 2, 2] },
      { name: "negative numbers", args: [[-1, -2, -3]], expected: [-1, -1.5, -2] },
    ],
  },
  {
    id: "dedupe-preserve-order",
    title: "Remove duplicates, keep first-occurrence order",
    functionName: "dedupePreserveOrder",
    paramNames: ["arr"],
    prompt: `Write a JS function named "dedupePreserveOrder" with signature
dedupePreserveOrder(arr).

Return a new array with duplicate values removed, preserving the order of
each value's first occurrence. Use the same equality semantics as a JS Set
(SameValueZero -- so NaN is treated as equal to itself). Different values
of different types (e.g. the number 1 and the string "1") are never
considered duplicates of each other.`,
    hiddenTests: [
      { name: "simple duplicates", args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { name: "empty array", args: [[]], expected: [] },
      { name: "string duplicates", args: [["a", "b", "a"]], expected: ["a", "b"] },
      { name: "NaN dedupes with itself", args: [[NaN, NaN, 1]], expected: [NaN, 1] },
      {
        name: "different types are not duplicates",
        args: [[true, 1, false, 0]],
        expected: [true, 1, false, 0],
      },
      { name: "number and string are not duplicates", args: [[1, "1"]], expected: [1, "1"] },
      { name: "alternating duplicates", args: [[5, 3, 5, 3, 5]], expected: [5, 3] },
    ],
  },

  // Tolerant parsing of malformed input
  {
    id: "parse-loose-number-list",
    title: "Parse a loosely-formatted comma-separated number list",
    functionName: "parseLooseNumberList",
    paramNames: ["str"],
    prompt: `Write a JS function named "parseLooseNumberList" with signature
parseLooseNumberList(str).

Parse a comma-separated string of numbers into an array of numbers. Entries
may have surrounding whitespace. Empty entries (from extra or trailing
commas) and entries that don't parse as a finite number -- including
"NaN" and "Infinity" -- should be silently skipped rather than causing an
error.`,
    hiddenTests: [
      { name: "simple list", args: ["1,2,3"], expected: [1, 2, 3] },
      { name: "whitespace around entries", args: [" 1 , 2 , 3 "], expected: [1, 2, 3] },
      { name: "empty entry in the middle is skipped", args: ["1,,3"], expected: [1, 3] },
      { name: "trailing comma is skipped", args: ["1,2,3,"], expected: [1, 2, 3] },
      { name: "non-numeric entry is skipped", args: ["1,abc,3"], expected: [1, 3] },
      { name: "empty string has no entries", args: [""], expected: [] },
      { name: "decimals and negatives", args: ["1.5,-2.5,3"], expected: [1.5, -2.5, 3] },
      { name: "NaN and Infinity literals are not finite numbers", args: ["NaN,1,Infinity"], expected: [1] },
    ],
  },
  {
    id: "normalize-phone",
    title: "Normalize a loosely-formatted US phone number",
    functionName: "normalizePhone",
    paramNames: ["str"],
    prompt: `Write a JS function named "normalizePhone" with signature normalizePhone(str).

Extract all digits from a loosely-formatted US phone number string, which
may contain spaces, dashes, dots, parentheses, or other non-digit
characters. If there are exactly 10 digits, return them as a single digit
string. Otherwise return null.`,
    hiddenTests: [
      { name: "parens and dash format", args: ["(555) 123-4567"], expected: "5551234567" },
      { name: "dot format", args: ["555.123.4567"], expected: "5551234567" },
      { name: "space format", args: ["555 123 4567"], expected: "5551234567" },
      { name: "bare digits", args: ["5551234567"], expected: "5551234567" },
      { name: "too few digits", args: ["555-1234"], expected: null },
      { name: "too many digits (country code)", args: ["1-555-123-4567"], expected: null },
      { name: "no digits at all", args: [""], expected: null },
      { name: "trailing letters ignored", args: ["(555)123-4567 ext"], expected: "5551234567" },
    ],
  },

  // Genuinely ambiguous specs -- the prompt deliberately does not pin down
  // every edge case. Hidden tests encode one reasonable interpretation;
  // disagreement here is a real signal about spec-following, not a bug.
  {
    id: "camel-to-snake",
    title: "Convert camelCase to snake_case",
    functionName: "camelToSnake",
    paramNames: ["str"],
    prompt: `Write a JS function named "camelToSnake" with signature camelToSnake(str).

It converts a camelCase (or PascalCase) string to snake_case.

Example: camelToSnake("camelCase") === "camel_case"`,
    hiddenTests: [
      { name: "basic camelCase", args: ["camelCase"], expected: "camel_case" },
      { name: "already lowercase", args: ["simple"], expected: "simple" },
      { name: "leading capital (PascalCase)", args: ["PascalCase"], expected: "pascal_case" },
      {
        name: "consecutive capitals (acronym) are not individually separated",
        args: ["parseHTTPResponse"],
        expected: "parse_httpresponse",
      },
      { name: "digit before a capital also triggers a split", args: ["version2Update"], expected: "version2_update" },
      { name: "empty string", args: [""], expected: "" },
      { name: "single leading capital letter", args: ["A"], expected: "a" },
    ],
  },
  {
    id: "most-frequent-word",
    title: "Find the most frequently occurring word",
    functionName: "mostFrequentWord",
    paramNames: ["str"],
    prompt: `Write a JS function named "mostFrequentWord" with signature mostFrequentWord(str).

It returns the most frequently occurring word in str, comparing words
case-insensitively and returning the winning word in lowercase. If there's
a tie, return whichever tied word appears first in the string.`,
    hiddenTests: [
      { name: "clear winner", args: ["the cat sat on the mat"], expected: "the" },
      { name: "case-insensitive counting", args: ["Cat cat CAT dog"], expected: "cat" },
      { name: "no tie among three words", args: ["a b a b c c c"], expected: "c" },
      { name: "tie broken by first occurrence", args: ["a b a b"], expected: "a" },
      { name: "attached punctuation is stripped", args: ["Hello, world! Hello."], expected: "hello" },
      { name: "single word", args: ["one"], expected: "one" },
      { name: "internal apostrophe is kept", args: ["It's a test. It's fun."], expected: "it's" },
    ],
  },

  // --- Harder tier: requires actual algorithmic reasoning (DP, graph
  // traversal) rather than careful edge-case handling. Selected for
  // difficulty, not to make a particular model fail -- classic, unambiguous
  // problems with well-known correct answers, verified against independent
  // reference implementations before use (see docs/MATRIX-RESULTS.md).
  {
    id: "edit-distance",
    title: "Levenshtein edit distance between two strings",
    functionName: "editDistance",
    paramNames: ["a", "b"],
    tier: "hard",
    prompt: `Write a JS function named "editDistance" with signature editDistance(a, b).

Return the minimum number of single-character insertions, deletions, or
substitutions required to transform string a into string b (the Levenshtein
distance).`,
    hiddenTests: [
      { name: "kitten to sitting", args: ["kitten", "sitting"], expected: 3 },
      { name: "both empty", args: ["", ""], expected: 0 },
      { name: "empty to non-empty", args: ["abc", ""], expected: 3 },
      { name: "non-empty from empty", args: ["", "abc"], expected: 3 },
      { name: "identical strings", args: ["abc", "abc"], expected: 0 },
      { name: "horse to ros", args: ["horse", "ros"], expected: 3 },
      { name: "intention to execution", args: ["intention", "execution"], expected: 5 },
    ],
  },
  {
    id: "longest-increasing-subsequence",
    title: "Length of the longest strictly increasing subsequence",
    functionName: "longestIncreasingSubsequence",
    paramNames: ["nums"],
    tier: "hard",
    prompt: `Write a JS function named "longestIncreasingSubsequence" with signature
longestIncreasingSubsequence(nums).

Return the length of the longest strictly increasing subsequence of the
integer array nums. A subsequence need not be contiguous.`,
    hiddenTests: [
      { name: "classic example", args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
      { name: "another mixed sequence", args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { name: "all equal values", args: [[7, 7, 7, 7]], expected: 1 },
      { name: "empty array", args: [[]], expected: 0 },
      { name: "single element", args: [[1]], expected: 1 },
      { name: "already increasing", args: [[1, 2, 3, 4, 5]], expected: 5 },
      { name: "strictly decreasing", args: [[5, 4, 3, 2, 1]], expected: 1 },
    ],
  },
  {
    id: "coin-change-min",
    title: "Minimum coins to make an amount",
    functionName: "coinChangeMin",
    paramNames: ["coins", "amount"],
    tier: "hard",
    prompt: `Write a JS function named "coinChangeMin" with signature coinChangeMin(coins, amount).

"coins" is an array of positive integer coin denominations, each available
in unlimited supply. Return the minimum number of coins needed to make
exactly "amount". If it's impossible, return -1. amount 0 always returns 0.`,
    hiddenTests: [
      { name: "classic example", args: [[1, 2, 5], 11], expected: 3 },
      { name: "impossible amount", args: [[2], 3], expected: -1 },
      { name: "zero amount", args: [[1], 0], expected: 0 },
      {
        name: "greedy would fail here -- optimal is two 3s, not a 4 plus two 1s",
        args: [[1, 3, 4], 6],
        expected: 2,
      },
      { name: "standard US coins", args: [[5, 10, 25], 30], expected: 2 },
      { name: "larger amount, standard coins plus pennies", args: [[1, 5, 10, 25], 63], expected: 6 },
    ],
  },
  {
    id: "is-bipartite",
    title: "Determine if an undirected graph is bipartite",
    functionName: "isBipartite",
    paramNames: ["graph"],
    tier: "hard",
    prompt: `Write a JS function named "isBipartite" with signature isBipartite(graph).

"graph" is an undirected graph as an adjacency-list object: each key is a
node name, mapped to an array of its neighbor node names (edges are listed
from both endpoints). Return true if the graph's nodes can be split into
two groups such that every edge connects a node in one group to a node in
the other group, false otherwise. An empty graph, or a graph with no edges,
is bipartite.`,
    hiddenTests: [
      { name: "triangle is not bipartite", args: [{ a: ["b", "c"], b: ["a", "c"], c: ["a", "b"] }], expected: false },
      { name: "path is bipartite", args: [{ a: ["b"], b: ["a", "c"], c: ["b"] }], expected: true },
      { name: "empty graph", args: [{}], expected: true },
      { name: "isolated nodes, no edges", args: [{ a: [], b: [] }], expected: true },
      { name: "even cycle is bipartite", args: [{ a: ["b"], b: ["c"], c: ["d"], d: ["a"] }], expected: true },
      { name: "odd cycle is not bipartite", args: [{ a: ["b"], b: ["c"], c: ["a"] }], expected: false },
    ],
  },
  {
    id: "word-break",
    title: "Can a string be segmented into dictionary words?",
    functionName: "wordBreak",
    paramNames: ["s", "wordDict"],
    tier: "hard",
    prompt: `Write a JS function named "wordBreak" with signature wordBreak(s, wordDict).

Return true if "s" can be segmented into a sequence of one or more words
from the array "wordDict" (words may be reused any number of times), false
otherwise. The empty string is always segmentable (trivially, as zero
words).`,
    hiddenTests: [
      { name: "classic true example", args: ["leetcode", ["leet", "code"]], expected: true },
      { name: "reused word", args: ["applepenapple", ["apple", "pen"]], expected: true },
      { name: "classic false example", args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], expected: false },
      { name: "empty string is always segmentable", args: ["", ["a"]], expected: true },
      { name: "single character match", args: ["a", ["a"]], expected: true },
      { name: "two single-character words", args: ["ab", ["a", "b"]], expected: true },
    ],
  },
  {
    id: "longest-common-subsequence",
    title: "Length of the longest common subsequence",
    functionName: "longestCommonSubsequence",
    paramNames: ["a", "b"],
    tier: "hard",
    prompt: `Write a JS function named "longestCommonSubsequence" with signature
longestCommonSubsequence(a, b).

Return the length of the longest subsequence common to both strings a and
b. A subsequence need not be contiguous, but must preserve relative order.`,
    hiddenTests: [
      { name: "classic example", args: ["abcde", "ace"], expected: 3 },
      { name: "identical strings", args: ["abc", "abc"], expected: 3 },
      { name: "no common characters", args: ["abc", "def"], expected: 0 },
      { name: "one string empty", args: ["", "abc"], expected: 0 },
      { name: "other string empty", args: ["abc", ""], expected: 0 },
      { name: "mostly disjoint strings", args: ["bsbininm", "jmjkbkjkv"], expected: 1 },
    ],
  },
  {
    id: "min-path-sum",
    title: "Minimum path sum through a grid",
    functionName: "minPathSum",
    paramNames: ["grid"],
    tier: "hard",
    prompt: `Write a JS function named "minPathSum" with signature minPathSum(grid).

"grid" is a non-empty 2D array of non-negative integers. Starting at the
top-left cell and moving only right or down at each step, return the
minimum possible sum of the cells visited on a path to the bottom-right
cell (inclusive of both endpoints).`,
    hiddenTests: [
      { name: "classic example", args: [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], expected: 7 },
      { name: "two-row grid", args: [[[1, 2, 3], [4, 5, 6]]], expected: 12 },
      { name: "single cell", args: [[[5]]], expected: 5 },
      { name: "small 2x2 grid", args: [[[1, 2], [1, 1]]], expected: 3 },
    ],
  },

  // --- Novel tier: fabricated business-rule specs invented for this
  // experiment. The point is to require *following* a spec with
  // several interacting rules rather than *recalling* a named algorithm --
  // unlike the hard tier, none of these should be recognizable as a
  // textbook technique. Every task carries a one-line novelty argument;
  // see `noveltyArgument` on each. Reference implementations were written
  // first and hidden-test values computed from them, same discipline as
  // the other two tiers.
  {
    id: "ticket-triage-score",
    title: "Score a support ticket using invented triage rules",
    functionName: "ticketTriageScore",
    paramNames: ["ticket"],
    tier: "novel",
    noveltyArgument:
      "Fabricated scoring weights and an override-not-additive escalation rule invented for this prompt -- no named algorithm or public system computes this exact formula.",
    prompt: `Write a JS function named "ticketTriageScore" with signature
ticketTriageScore(ticket).

"ticket" is an object: { age_hours, is_paying_customer, mentions_keyword,
previous_escalations }. Compute a score by applying ALL of these rules and
summing their contributions, then clamp the total to the range [0, 100]:

1. Add 20 if is_paying_customer is true.
2. Add 2 points per full 4-hour period of age_hours (i.e.
   Math.floor(age_hours / 4) * 2), capped at 20.
3. If mentions_keyword is true: add 30 if is_paying_customer is also true,
   otherwise add 10.
4. Escalations: if previous_escalations >= 3, add a flat 40 (do NOT also
   add the per-escalation amount). Otherwise add 8 per previous escalation.
5. Return max(0, min(100, total)).`,
    hiddenTests: [
      {
        name: "all zero/false inputs score zero",
        args: [{ age_hours: 0, is_paying_customer: false, mentions_keyword: false, previous_escalations: 0 }],
        expected: 0,
      },
      {
        name: "typical mixed case",
        args: [{ age_hours: 20, is_paying_customer: true, mentions_keyword: true, previous_escalations: 2 }],
        expected: 76,
      },
      {
        name: "age bonus caps at 20",
        args: [{ age_hours: 100, is_paying_customer: false, mentions_keyword: false, previous_escalations: 0 }],
        expected: 20,
      },
      {
        name: "keyword bonus is smaller when not paying",
        args: [{ age_hours: 0, is_paying_customer: false, mentions_keyword: true, previous_escalations: 0 }],
        expected: 10,
      },
      {
        name: "escalation override replaces, not adds to, the per-escalation amount",
        args: [{ age_hours: 0, is_paying_customer: true, mentions_keyword: false, previous_escalations: 5 }],
        expected: 60,
      },
      {
        name: "total clamps at 100",
        args: [{ age_hours: 100, is_paying_customer: true, mentions_keyword: true, previous_escalations: 5 }],
        expected: 100,
      },
      {
        name: "partial age bucket and per-escalation math",
        args: [{ age_hours: 4, is_paying_customer: false, mentions_keyword: false, previous_escalations: 2 }],
        expected: 18,
      },
      {
        name: "paying plus keyword, no age or escalation bonus",
        args: [{ age_hours: 0, is_paying_customer: true, mentions_keyword: true, previous_escalations: 0 }],
        expected: 50,
      },
    ],
  },
  {
    id: "shipping-fee",
    title: "Compute a shipping fee using invented carrier rules",
    functionName: "shippingFee",
    paramNames: ["order"],
    tier: "novel",
    noveltyArgument:
      "An invented shipping-fee policy whose order of operations (fragile multiplier applied before the express surcharge, express fee itself reduced when fragile) exists nowhere as a published carrier formula.",
    prompt: `Write a JS function named "shippingFee" with signature shippingFee(order).

"order" is an object: { weight_kg, distance_km, is_fragile, is_express }.
Compute the fee in this exact order:

1. base = 5 + weight_kg * 1.2
2. If distance_km > 500, add (distance_km - 500) * 0.05 to base.
3. If is_fragile is true, multiply the running total by 1.15.
4. If is_express is true, add a flat surcharge: 20 normally, but only 15 if
   is_fragile is also true.
5. Round to 2 decimal places and return.`,
    hiddenTests: [
      {
        name: "zero weight and distance, no flags",
        args: [{ weight_kg: 0, distance_km: 0, is_fragile: false, is_express: false }],
        expected: 5,
      },
      {
        name: "weight only, under the distance threshold",
        args: [{ weight_kg: 10, distance_km: 100, is_fragile: false, is_express: false }],
        expected: 17,
      },
      {
        name: "distance surcharge applies only to the excess over 500km",
        args: [{ weight_kg: 10, distance_km: 700, is_fragile: false, is_express: false }],
        expected: 27,
      },
      {
        name: "fragile multiplier alone",
        args: [{ weight_kg: 10, distance_km: 0, is_fragile: true, is_express: false }],
        expected: 19.55,
      },
      {
        name: "express surcharge alone is the full 20",
        args: [{ weight_kg: 10, distance_km: 0, is_fragile: false, is_express: true }],
        expected: 37,
      },
      {
        name: "fragile and express together use the reduced 15 surcharge, applied after the multiplier",
        args: [{ weight_kg: 10, distance_km: 0, is_fragile: true, is_express: true }],
        expected: 34.55,
      },
      {
        name: "all four rules interacting",
        args: [{ weight_kg: 5, distance_km: 800, is_fragile: true, is_express: true }],
        expected: 44.9,
      },
    ],
  },
  {
    id: "loyalty-points",
    title: "Compute loyalty points using an invented formula",
    functionName: "loyaltyPoints",
    paramNames: ["order"],
    tier: "novel",
    noveltyArgument:
      "A fabricated points formula (floor, then tier-multiply, then a first-purchase bonus gated on a minimum amount, then a coupon discount applied and floored last) invented for this prompt -- no loyalty program publishes this arithmetic.",
    prompt: `Write a JS function named "loyaltyPoints" with signature loyaltyPoints(order).

"order" is an object: { amount, tier, is_first_purchase, has_coupon }, where
tier is one of "bronze", "silver", "gold". Compute points in this exact
order:

1. base = Math.floor(amount / 10)
2. tierAdjusted = base * tierMultiplier, where bronze=1, silver=1.5, gold=2
   (this step can produce a non-integer -- do not round yet)
3. If is_first_purchase is true AND amount >= 20, add 50 to tierAdjusted.
   If amount < 20, no first-purchase bonus applies even if the flag is set.
4. If has_coupon is true, multiply the current total by 0.9 and take the
   floor of that result.
5. Return the result as a non-negative integer (floor if not already an
   integer; minimum 0).`,
    hiddenTests: [
      { name: "zero amount", args: [{ amount: 0, tier: "bronze", is_first_purchase: false, has_coupon: false }], expected: 0 },
      { name: "bronze baseline", args: [{ amount: 100, tier: "bronze", is_first_purchase: false, has_coupon: false }], expected: 10 },
      { name: "gold doubles the base", args: [{ amount: 100, tier: "gold", is_first_purchase: false, has_coupon: false }], expected: 20 },
      { name: "silver multiplier produces a non-integer intermediate", args: [{ amount: 100, tier: "silver", is_first_purchase: false, has_coupon: false }], expected: 15 },
      { name: "first-purchase bonus above the minimum amount", args: [{ amount: 100, tier: "bronze", is_first_purchase: true, has_coupon: false }], expected: 60 },
      { name: "first-purchase bonus withheld below the minimum amount", args: [{ amount: 10, tier: "bronze", is_first_purchase: true, has_coupon: false }], expected: 1 },
      { name: "gold, first purchase, and coupon all interacting", args: [{ amount: 100, tier: "gold", is_first_purchase: true, has_coupon: true }], expected: 63 },
      { name: "coupon floors a fractional silver total", args: [{ amount: 50, tier: "silver", is_first_purchase: false, has_coupon: true }], expected: 6 },
    ],
  },
  {
    id: "subscription-proration",
    title: "Prorate a subscription charge using an invented formula",
    functionName: "subscriptionProration",
    paramNames: ["sub"],
    tier: "novel",
    noveltyArgument:
      "An invented proration formula (daily rate times days used, plus a flat upgrade fee, minus credit, floored at zero) that resembles real billing proration conceptually but matches no specific vendor's published algorithm.",
    prompt: `Write a JS function named "subscriptionProration" with signature
subscriptionProration(sub).

"sub" is an object: { plan_price, days_in_period, days_used, is_upgrade,
credit_balance }. Compute the charge in this exact order:

1. dailyRate = plan_price / days_in_period
2. charge = dailyRate * days_used
3. If is_upgrade is true, add a flat 5 to charge.
4. Subtract credit_balance from charge.
5. The result cannot go below 0 (floor at 0 -- excess credit is not carried
   forward or refunded by this function).
6. Round to 2 decimal places and return.`,
    hiddenTests: [
      { name: "full period used, no upgrade or credit", args: [{ plan_price: 30, days_in_period: 30, days_used: 30, is_upgrade: false, credit_balance: 0 }], expected: 30 },
      { name: "half period used", args: [{ plan_price: 30, days_in_period: 30, days_used: 15, is_upgrade: false, credit_balance: 0 }], expected: 15 },
      { name: "upgrade fee added on top of the prorated amount", args: [{ plan_price: 30, days_in_period: 30, days_used: 15, is_upgrade: true, credit_balance: 0 }], expected: 20 },
      { name: "credit balance floors the charge at zero, no negative result", args: [{ plan_price: 30, days_in_period: 30, days_used: 15, is_upgrade: false, credit_balance: 100 }], expected: 0 },
      { name: "non-round daily rate rounds only at the final step", args: [{ plan_price: 100, days_in_period: 31, days_used: 10, is_upgrade: false, credit_balance: 0 }], expected: 32.26 },
      { name: "zero days used, upgrade fee minus a small credit", args: [{ plan_price: 30, days_in_period: 30, days_used: 0, is_upgrade: true, credit_balance: 2 }], expected: 3 },
    ],
  },
  {
    id: "event-badge-assignment",
    title: "Assign an event badge using an invented priority cascade",
    functionName: "eventBadge",
    paramNames: ["attendee"],
    tier: "novel",
    noveltyArgument:
      "A fabricated priority-ordered rule cascade with invented labels and thresholds -- the ordering (speaker overrides everything; sponsor requires attendance; feedback upgrades the tier) and exact numbers exist only in this prompt.",
    prompt: `Write a JS function named "eventBadge" with signature eventBadge(attendee).

"attendee" is an object: { sessions_attended, is_speaker, is_sponsor,
feedback_submitted }. Check these rules IN ORDER and return the label of
the first one that matches (a later rule never overrides an earlier match):

1. If is_speaker is true, return "Speaker".
2. Else if is_sponsor is true AND sessions_attended >= 1, return "Sponsor Partner".
3. Else if sessions_attended >= 5 AND feedback_submitted is true, return "Super Attendee".
4. Else if sessions_attended >= 5, return "Regular Attendee".
5. Else if sessions_attended >= 1, return "Attendee".
6. Otherwise, return "Guest".`,
    hiddenTests: [
      { name: "speaker overrides every other flag", args: [{ sessions_attended: 0, is_speaker: true, is_sponsor: true, feedback_submitted: true }], expected: "Speaker" },
      { name: "sponsor with zero sessions does not qualify for Sponsor Partner", args: [{ sessions_attended: 0, is_speaker: false, is_sponsor: true, feedback_submitted: false }], expected: "Guest" },
      { name: "sponsor with at least one session", args: [{ sessions_attended: 3, is_speaker: false, is_sponsor: true, feedback_submitted: false }], expected: "Sponsor Partner" },
      { name: "five sessions plus feedback is Super Attendee", args: [{ sessions_attended: 5, is_speaker: false, is_sponsor: false, feedback_submitted: true }], expected: "Super Attendee" },
      { name: "five sessions without feedback is only Regular Attendee", args: [{ sessions_attended: 5, is_speaker: false, is_sponsor: false, feedback_submitted: false }], expected: "Regular Attendee" },
      { name: "one session is plain Attendee", args: [{ sessions_attended: 1, is_speaker: false, is_sponsor: false, feedback_submitted: false }], expected: "Attendee" },
      { name: "no sessions and no flags is Guest", args: [{ sessions_attended: 0, is_speaker: false, is_sponsor: false, feedback_submitted: false }], expected: "Guest" },
      { name: "speaker with high session count is still just Speaker", args: [{ sessions_attended: 10, is_speaker: true, is_sponsor: false, feedback_submitted: false }], expected: "Speaker" },
    ],
  },
  {
    id: "inventory-reorder-flag",
    title: "Decide whether to reorder stock, with a twist on the textbook formula",
    functionName: "shouldReorder",
    paramNames: ["item"],
    tier: "novel",
    noveltyArgument:
      "Deliberately resembles the standard textbook reorder-point formula (avg daily usage x lead time + safety stock) but changes safety stock from an additive absolute quantity to a multiplicative percentage -- a model reciting the memorized formula instead of reading this prompt will get it wrong.",
    prompt: `Write a JS function named "shouldReorder" with signature shouldReorder(item).

"item" is an object: { current_stock, avg_daily_sales, lead_time_days,
safety_stock_percent }. Compute:

reorderPoint = ceil(avg_daily_sales * lead_time_days * (1 + safety_stock_percent / 100))

Return true if current_stock <= reorderPoint, false otherwise. Note that
safety_stock_percent is a PERCENTAGE MULTIPLIER on the usage-during-lead-time
figure, not a separate absolute quantity added afterward.`,
    hiddenTests: [
      { name: "well above the reorder point", args: [{ current_stock: 100, avg_daily_sales: 5, lead_time_days: 7, safety_stock_percent: 20 }], expected: false },
      { name: "below the reorder point", args: [{ current_stock: 40, avg_daily_sales: 5, lead_time_days: 7, safety_stock_percent: 20 }], expected: true },
      { name: "exactly at the ceiling-rounded reorder point", args: [{ current_stock: 42, avg_daily_sales: 5, lead_time_days: 7, safety_stock_percent: 20 }], expected: true },
      { name: "zero average sales still reorders at zero or below stock", args: [{ current_stock: 0, avg_daily_sales: 0, lead_time_days: 7, safety_stock_percent: 20 }], expected: true },
      { name: "negative stock (backordered) always reorders", args: [{ current_stock: -2, avg_daily_sales: 0, lead_time_days: 7, safety_stock_percent: 0 }], expected: true },
      { name: "no safety stock percent, simple case", args: [{ current_stock: 5, avg_daily_sales: 1, lead_time_days: 1, safety_stock_percent: 0 }], expected: false },
    ],
  },
  {
    id: "discount-stack-calculator",
    title: "Stack discounts using an invented, deliberately non-additive order",
    functionName: "discountStack",
    paramNames: ["order"],
    tier: "novel",
    noveltyArgument:
      "A fabricated discount-stacking order (percent off, then a member discount applied multiplicatively to the already-discounted price, then a flat amount, rounded only at the end) chosen specifically to contradict the common wrong instinct of adding percentages together.",
    prompt: `Write a JS function named "discountStack" with signature discountStack(order).

"order" is an object: { price, percent_off, flat_off, is_member,
member_extra_percent }. Apply discounts in this exact order:

1. price = price * (1 - percent_off / 100)
2. If is_member is true, price = price * (1 - member_extra_percent / 100)
   -- this is applied to the ALREADY-DISCOUNTED price, not added to
   percent_off first.
3. price = price - flat_off
4. The result cannot go below 0.
5. Round to 2 decimal places only at this final step (not after each rule)
   and return.`,
    hiddenTests: [
      { name: "no discounts at all", args: [{ price: 100, percent_off: 0, flat_off: 0, is_member: false, member_extra_percent: 0 }], expected: 100 },
      { name: "percent off alone", args: [{ price: 100, percent_off: 10, flat_off: 0, is_member: false, member_extra_percent: 0 }], expected: 90 },
      { name: "member discount stacks multiplicatively, not additively", args: [{ price: 100, percent_off: 10, flat_off: 0, is_member: true, member_extra_percent: 10 }], expected: 81 },
      { name: "flat amount applied last", args: [{ price: 100, percent_off: 10, flat_off: 5, is_member: true, member_extra_percent: 10 }], expected: 76 },
      { name: "flat amount cannot push the price negative", args: [{ price: 10, percent_off: 50, flat_off: 20, is_member: false, member_extra_percent: 0 }], expected: 0 },
      { name: "all rules interacting", args: [{ price: 50, percent_off: 20, flat_off: 5, is_member: true, member_extra_percent: 25 }], expected: 25 },
    ],
  },
];

export function getTask(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
