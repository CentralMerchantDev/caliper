// A regex match against raw source is satisfied by a call sitting inside a
// comment just as happily as by real code. Found first in test/navPad.test.ts
// (2026-09-09, see docs/LESSONS.md's "a regex over source matches your
// comments too" entry) -- a `/* ... */` block comment describing
// `trackLiveRect(navPadEl, ...)` in prose sat six lines above the real call
// and satisfied the same regex. Found *again*, independently and earlier,
// in test/isolate.test.ts and test/movePiece.test.ts, each of which grew its
// own unshared, `//`-only copy of this exact idea after a comment-out
// mutation defeated an unprotected check -- neither covered `/* */` blocks,
// and neither was reused anywhere else, which is how the same blind spot
// survived to be found a third time in a different file.
//
// Strip both comment forms before matching source text, so a wiring test can
// only pass on code that actually executes.
//
// KNOWN LIMITATION, stated rather than hidden: this is line/regex-based, not
// a real tokenizer. A `//` or `/*` inside a string or template literal (a URL
// is the obvious case) is not distinguished from a real comment start and
// will truncate or blank part of that line. None of this suite's current
// call sites for this helper have that shape in the slice they check -- each
// was reviewed by hand before being switched over. A future caller with a
// URL or a regex literal on the line it needs to check should verify that by
// hand rather than trust this blindly.
/**
 * Same idea as stripSourceComments, for HTML instead of JS/TS: a `<span
 * id="...">` sitting inside `<!-- -->` reads identically to a live one to a
 * regex that never distinguishes markup from comment. Blanked char-for-char
 * (newlines kept) for the same offset-preservation reason as the block-
 * comment case above -- see that function's own doc comment.
 */
export function stripHtmlComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

export function stripSourceComments(src: string): string {
  // Block comments first, blanked character-for-character (newlines kept, all
  // else replaced with a space) so length and line numbers survive -- callers
  // in this suite index into the result with indexOf()/slice() and expect
  // those offsets to still line up with the original source.
  const noBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  // Then `//` line comments -- also blanked in place (padded with spaces to
  // the line's original length), NOT truncated. Truncating was this
  // function's original behaviour (matching test/isolate.test.ts's and
  // test/movePiece.test.ts's pre-existing helper) and it quietly broke the
  // offset-preservation guarantee stated above: shortening a line shifts
  // every position after it, so a position found by searching the RAW text
  // (test/pickSelection.test.ts does this on purpose, to find a comment
  // used as a navigation anchor) no longer lines up with the same position
  // in the STRIPPED text. Caught by that exact test going wrong -- not a
  // hypothetical -- when it tried to slice() the stripped text at an offset
  // found in the raw text and got the wrong region. Padding instead of
  // truncating keeps every line's length identical, so an offset is valid
  // in both strings, which is what every docstring already claimed.
  return noBlockComments
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      return i === -1 ? line : line.slice(0, i) + " ".repeat(line.length - i);
    })
    .join("\n");
}
