import type { SimTestCase } from "./types";

// The baseline behavior suite (BUILD-V2.md: "the crown jewel... verified
// against independently written references, built before anything else").
// Every `expected` value here came from an independent reference script run
// separately, not transcribed from src/simBaseline.ts by hand -- see the
// scratchpad trace this was derived from. This suite runs, unchanged,
// against every future version of the sim's source after a shipped change:
// a pass means the change didn't alter any of the baseline's specified
// behavior; a failure is a real regression, not a guess.
export const SIM_REGRESSION_SUITE: SimTestCase[] = [
  {
    name: "idle tick from full health does nothing but decay",
    fn: "tick",
    args: [{ tick: 0, money: 100, sims: [{ id: "s", needs: { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100 }, lastAction: null }] }],
    expected: { tick: 1, money: 100, sims: [{ id: "s", needs: { hunger: 97, energy: 98, fun: 98, social: 98, hygiene: 99 }, lastAction: "idle" }] },
  },
  {
    name: "10-tick trace from full health matches exactly, including a work cycle",
    fn: "tick",
    args: [{ tick: 0, money: 100, sims: [{ id: "s", needs: { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100 }, lastAction: null }] }],
    repeat: 10,
    expected: { tick: 10, money: 110, sims: [{ id: "s", needs: { hunger: 88, energy: 84, fun: 93, social: 90, hygiene: 98 }, lastAction: "work" }] },
  },
  {
    name: "critical hunger overrides everything else",
    fn: "chooseAction",
    args: [{ id: "s", needs: { hunger: 25, energy: 90, fun: 90, social: 90, hygiene: 90 }, lastAction: null }, { tick: 0, money: 100, sims: [] }],
    expected: "eat",
  },
  {
    name: "applyAction(eat) restores hunger and charges money",
    fn: "applyAction",
    args: [{ tick: 0, money: 100, sims: [{ id: "s", needs: { hunger: 25, energy: 90, fun: 90, social: 90, hygiene: 90 }, lastAction: null }] }, 0, "eat"],
    expected: { tick: 0, money: 95, sims: [{ id: "s", needs: { hunger: 62, energy: 88, fun: 88, social: 88, hygiene: 89 }, lastAction: "eat" }] },
  },
  {
    name: "cannot afford to eat -> falls back to the next-lowest need",
    fn: "tick",
    args: [{ tick: 0, money: 2, sims: [{ id: "s", needs: { hunger: 10, energy: 50, fun: 90, social: 90, hygiene: 90 }, lastAction: null }] }],
    expected: { tick: 1, money: 2, sims: [{ id: "s", needs: { hunger: 7, energy: 83, fun: 88, social: 88, hygiene: 89 }, lastAction: "sleep" }] },
  },
  {
    name: "work hour with energy and no urgent need triggers work",
    fn: "tick",
    args: [{ tick: 9, money: 50, sims: [{ id: "s", needs: { hunger: 90, energy: 90, fun: 90, social: 90, hygiene: 90 }, lastAction: null }] }],
    expected: { tick: 10, money: 70, sims: [{ id: "s", needs: { hunger: 87, energy: 78, fun: 83, social: 88, hygiene: 89 }, lastAction: "work" }] },
  },
  {
    name: "work hour but energy too low does not trigger work",
    fn: "tick",
    args: [{ tick: 9, money: 50, sims: [{ id: "s", needs: { hunger: 90, energy: 15, fun: 90, social: 90, hygiene: 90 }, lastAction: null }] }],
    expected: { tick: 10, money: 50, sims: [{ id: "s", needs: { hunger: 87, energy: 48, fun: 88, social: 88, hygiene: 89 }, lastAction: "sleep" }] },
  },
  {
    name: "needs never go negative even from a near-zero state",
    fn: "tick",
    args: [{ tick: 20, money: 0, sims: [{ id: "s", needs: { hunger: 0, energy: 1, fun: 0, social: 0, hygiene: 0 }, lastAction: null }] }],
    expected: { tick: 21, money: 0, sims: [{ id: "s", needs: { hunger: 0, energy: 35, fun: 0, social: 0, hygiene: 0 }, lastAction: "sleep" }] },
  },
  {
    name: "eating with exactly enough money never goes negative",
    fn: "applyAction",
    args: [{ tick: 0, money: 5, sims: [{ id: "s", needs: { hunger: 10, energy: 90, fun: 90, social: 90, hygiene: 90 }, lastAction: null }] }, 0, "eat"],
    expected: { tick: 0, money: 0, sims: [{ id: "s", needs: { hunger: 47, energy: 88, fun: 88, social: 88, hygiene: 89 }, lastAction: "eat" }] },
  },
];
