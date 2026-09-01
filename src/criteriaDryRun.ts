// =============================================================================
// A CRITERION THAT CANNOT FAIL IS NOT EVIDENCE
//
// The verification stage reports "criteria 5/5" and the run ships. But a plan
// proposes its own criteria, and nothing checked whether they could ever have
// come out any other way. Measured against real historical runs during this
// project's diagnostic work: 33% of criteria under the old schema were vacuous
// -- already true of the unmodified world, testing nothing.
//
// So "5/5" could mean five real assertions about new behaviour, or five checks
// that would have passed if the model had done nothing at all, and the ledger
// said the same either way. For a system whose whole claim is that it only says
// yes when yes is true, that is the wrong thing not to know.
//
// HOW IT WORKS, AND WHY THIS VERSION EXISTS
//
// The previous implementation took the baseline's functions as JavaScript
// values and called them. That cannot run in a Worker -- the baseline lives in
// a sandbox isolate and there is no eval to get it out of a source string --
// which is why that module sat here for weeks, imported by nothing but its own
// test, while the hole it was written to close stayed open. It is quarantined
// in _TO-DELETE/criteria-dry-run-in-process-version/ with the reasoning.
//
// This version asks the same question through the machinery that already
// executes criteria in the sandbox: run them against the world UNCHANGED. A
// criterion that passes when nothing has changed cannot distinguish "the change
// worked" from "the change did nothing", so it is vacuous by definition -- no
// new judgement, no second definition of "already true" to drift out of sync
// with the first.
//
// Costs one sandbox probe per criterion. No model call, so no API spend.
// =============================================================================
import type { ProposedCriterion } from "./criteria";
import type { ProbeRunner } from "./criteriaExecution";
import { evaluateCriteria } from "./criteriaExecution";

export type CriterionVerdict = {
  description: string;
  /** True when the criterion already holds on the unmodified world. */
  vacuous: boolean;
  reason: string;
};

/**
 * Which of these criteria are already true of the world as it stands?
 *
 * @param probeBaseline a runner bound to the CURRENT (unmodified) source
 * @param baselineSource the same source, for the criterion kinds that read it
 */
export async function findVacuousCriteria(
  criteria: ProposedCriterion[],
  probeBaseline: ProbeRunner,
  baselineSource: string,
): Promise<CriterionVerdict[]> {
  if (criteria.length === 0) return [];

  // Both probes are the baseline ON PURPOSE. evaluateCriteria's job is "does
  // the candidate satisfy this?", so handing it the unmodified world as the
  // candidate asks "does the world ALREADY satisfy this?" -- which is exactly
  // the question, answered by the code that will later grade the real thing.
  const results = await evaluateCriteria(criteria, probeBaseline, probeBaseline, baselineSource);

  return criteria.map((criterion, i) => {
    const r = results[i];
    // An ERROR on the baseline is not vacuity. A criterion naming a function
    // the change is about to ADD throws here, and that is the healthiest thing
    // a criterion can do -- it is a real assertion about behaviour that does
    // not exist yet. Only a PASS means "this was already true".
    if (!r) return { description: criterion.description, vacuous: false, reason: "no verdict returned for this criterion" };
    if (r.error) {
      return {
        description: criterion.description,
        vacuous: false,
        reason: `does not hold on the current world (${String(r.error).slice(0, 120)}) -- a real assertion about new behaviour`,
      };
    }
    return r.pass
      ? {
          description: criterion.description,
          vacuous: true,
          reason: "already true of the world as it stands -- it cannot tell a change that worked from one that did nothing",
        }
      : {
          description: criterion.description,
          vacuous: false,
          reason: "does not hold on the current world -- a real assertion about new behaviour",
        };
  });
}
