// Chunk 5's grounding stage, tested entirely with fixtures -- no live model
// call, per BUILD-WORLD.md ("it needs one model call to run -- that
// happens in chunk 9, not tonight"). Every fixture below is a hand-written
// stand-in for what a model's structured JSON response would look like,
// exercising the same parse -> validate -> decide -> report pipeline the
// real call will feed into.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseGroundingResponse, decideGroundingOutcome, formatGroundingHalt, formatGroundingForPlan, groundingContextBlock } from "../src/grounding.ts";
import { structureSummary } from "../src/worldStructure.ts";

// ---------------------------------------------------------------------
// Fixture: a well-grounded request -- adding a sim doesn't contradict
// anything in NOT_YET_PRESENT (entity type "sim" already exists; nothing
// caps the count).
// ---------------------------------------------------------------------
const FIXTURE_GROUNDED = {
  premisesHold: true,
  falsePremises: [],
  reasoning: "The request adds another entity of the existing 'sim' type. Nothing in the structure caps the number of sims.",
  alternatives: [],
};

// ---------------------------------------------------------------------
// Fixture: the flagship false-premise case from this project's own
// history -- "add a pet" assumes an entity type ("pet") that doesn't
// exist. This is the exact request nine live runs refused on downstream;
// grounding is supposed to catch it before a plan is ever written.
// ---------------------------------------------------------------------
const FIXTURE_UNGROUNDED_PET = {
  premisesHold: false,
  falsePremises: ['Entity type "pet" does not exist -- the structure summary lists exactly one entity type: "sim".'],
  reasoning: "The request assumes a pet entity with its own state (hunger, feeding). Only sims exist as entities today.",
  alternatives: [
    "Add another sim (the existing entity type already supports adding more).",
    "Add a new station a sim can visit, using the existing action/station pattern -- no new entity type required.",
  ],
};

// ---------------------------------------------------------------------
// Fixture: a second false-premise case -- a second location.
// ---------------------------------------------------------------------
const FIXTURE_UNGROUNDED_SECOND_ROOM = {
  premisesHold: false,
  falsePremises: ["A second location (\"backyard\") does not exist -- the structure summary lists exactly one location: \"room\"."],
  reasoning: "The request assumes the sim can walk somewhere outside the single room that exists.",
  alternatives: ["Add a new station inside the existing room instead of a second location."],
};

test("groundingContextBlock embeds the real structureSummary() verbatim, not a paraphrase", () => {
  const block = groundingContextBlock("add a lamp");
  assert.ok(block.includes(structureSummary()));
  assert.ok(block.includes('"add a lamp"'));
});

test("parseGroundingResponse: a grounded fixture parses cleanly and decides to proceed", () => {
  const result = parseGroundingResponse(FIXTURE_GROUNDED);
  assert.equal(result.premisesHold, true);
  assert.deepEqual(decideGroundingOutcome(result), { outcome: "proceed" });
});

test("parseGroundingResponse: the pet fixture parses and decides to halt, citing the specific missing entity type", () => {
  const result = parseGroundingResponse(FIXTURE_UNGROUNDED_PET);
  const outcome = decideGroundingOutcome(result);
  assert.equal(outcome.outcome, "halt");
  if (outcome.outcome === "halt") {
    assert.match(outcome.report, /pet.*does not exist/i);
    assert.match(outcome.report, /Add another sim/);
  }
});

test("parseGroundingResponse: the second-room fixture halts citing the specific missing location", () => {
  const result = parseGroundingResponse(FIXTURE_UNGROUNDED_SECOND_ROOM);
  const outcome = decideGroundingOutcome(result);
  assert.equal(outcome.outcome, "halt");
  if (outcome.outcome === "halt") assert.match(outcome.report, /second location.*does not exist/i);
});

test("formatGroundingHalt cites every false premise, not just the first", () => {
  const report = formatGroundingHalt(parseGroundingResponse({
    premisesHold: false,
    falsePremises: ["false premise A", "false premise B"],
    reasoning: "two things are wrong",
    alternatives: ["do X instead"],
  }));
  assert.match(report, /false premise A/);
  assert.match(report, /false premise B/);
  assert.match(report, /do X instead/);
});

// ---------------------------------------------------------------------
// validate-before-consume: malformed or internally-inconsistent responses
// must throw, never silently pass through as a real decision. Same
// discipline as parseCriteria in claude.ts, and the same class of defect
// this whole project's evidence trail is about -- a signal trusted because
// of where it came from, not because it was checked.
// ---------------------------------------------------------------------
test("parseGroundingResponse: rejects a non-boolean premisesHold", () => {
  assert.throws(() => parseGroundingResponse({ premisesHold: "true", falsePremises: [], reasoning: "x", alternatives: [] } as any), /boolean/);
});

test("parseGroundingResponse: rejects falsePremises that isn't a string array", () => {
  assert.throws(() => parseGroundingResponse({ premisesHold: false, falsePremises: [{ not: "a string" }], reasoning: "x", alternatives: [] } as any));
});

test("parseGroundingResponse: rejects empty reasoning", () => {
  assert.throws(() => parseGroundingResponse({ premisesHold: true, falsePremises: [], reasoning: "", alternatives: [] } as any), /reasoning/);
});

test("guardrail: premisesHold=true with a non-empty falsePremises is rejected as internally inconsistent, not silently trusted", () => {
  assert.throws(
    () => parseGroundingResponse({ premisesHold: true, falsePremises: ["something false"], reasoning: "x", alternatives: [] } as any),
    /inconsistent/,
  );
});

test("guardrail: premisesHold=false with an empty falsePremises is rejected -- a halt with no named reason is not a real halt", () => {
  assert.throws(
    () => parseGroundingResponse({ premisesHold: false, falsePremises: [], reasoning: "x", alternatives: [] } as any),
    /no specific premise named/,
  );
});

// The guardrail test needs its own check: does the inconsistency guard
// actually fire on a genuinely consistent response, or does it always
// throw? Control case, so the tests above are trusted as real signal.
test("control: a genuinely consistent halt response (premisesHold=false, falsePremises non-empty) does NOT throw", () => {
  assert.doesNotThrow(() => parseGroundingResponse(FIXTURE_UNGROUNDED_PET));
});

// ---------------------------------------------------------------------
// FOUNDATION.md item 3: the street-lamp incident this brief fixes was a
// refusal with nothing offered instead. "A refusal without an alternative
// should not be a shape the system can emit" -- planted here as a fixture
// that names a real false premise but no alternative, asserting it is
// rejected the same way any other malformed response is, not passed
// through as a valid halt.
// ---------------------------------------------------------------------
test("guardrail: premisesHold=false with a named premise but empty alternatives is rejected -- a refusal with nothing offered instead is not a valid response", () => {
  assert.throws(
    () => parseGroundingResponse({ premisesHold: false, falsePremises: ["street lamps do not exist"], reasoning: "x", alternatives: [] } as any),
    /alternatives is empty/,
  );
});

// ---------------------------------------------------------------------
// FINISH.md chunk 7: grounding no longer hard-stops on its own -- its
// findings feed into the plan prompt regardless of outcome, via
// formatGroundingForPlan. Both branches need their own test: a pass
// ("nothing false, here's why") is different text from a halt-shaped
// result, and the plan stage needs to be able to tell them apart.
// ---------------------------------------------------------------------
test("formatGroundingForPlan: when premises hold, states that plainly with the reasoning -- not the halt-report shape", () => {
  const text = formatGroundingForPlan(parseGroundingResponse(FIXTURE_GROUNDED));
  assert.match(text, /Every premise checked out true/);
  assert.doesNotMatch(text, /does not exist/);
});

test("formatGroundingForPlan: when a premise is false, it's the same report a human would see at the halt -- the plan stage gets the real finding, not a summary of a summary", () => {
  const text = formatGroundingForPlan(parseGroundingResponse(FIXTURE_UNGROUNDED_PET));
  assert.equal(text, formatGroundingHalt(parseGroundingResponse(FIXTURE_UNGROUNDED_PET)));
  assert.match(text, /pet.*does not exist/i);
});
