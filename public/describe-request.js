// =============================================================================
// CALIPER — DESCRIBE: A PLAIN-ENGLISH BOX, SCOPED TO THE SELECTION
//
// No option list. The absence of a menu is the point: the player writes
// English and the machine deals with it. This turns a selection (D1) and
// typed text into a request the pipeline can act on -- nothing more.
//
// THE TYPED TEXT IS OPAQUE DATA HERE, AND ONLY HERE.
//
// "Never display visitor-typed text as HTML" is a display-time rule, and
// every display path already in this app follows it with `.textContent`,
// which cannot execute markup. The one way that defense fails is if
// something upstream builds an HTML STRING out of the text before display
// ever sees it. So this module's contract is narrower and stricter than
// escaping: `text` is carried verbatim, never templated, never concatenated
// into markup, never touched -- there is nothing here for an escaping bug
// to hide in, because there is no string-building of the text at all.
// =============================================================================

export function makeDescribeRequest(selection, text) {
  if (!selection || !selection.current || !selection.current.plotId) {
    return { ok: false, reason: "nothing is selected -- pick something before describing a change" };
  }
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, reason: "the request needs some text" };
  }
  return {
    ok: true,
    address: selection.current.plotId,
    text,
  };
}
