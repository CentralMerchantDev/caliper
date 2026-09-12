// OPT-IN. Binds the dev server to this machine's LAN address instead of
// wrangler's own loopback-only default, so a phone on the same network can
// reach it -- COMPLETION-PLAN.md's own "what finished means" condition 4
// ("it works on a phone, because that's where most people will open a
// link") and B6's gate ("measured on a real viewport") have both been
// unreachable until now for exactly this reason: nothing in this repo ever
// passed wrangler an --ip.
//
// A SEPARATE script from `npm run dev` on purpose. Binding a dev server to
// the LAN is a deliberate act -- exposing it to every other device on the
// same network -- not something anyone should get by running the ordinary
// command out of habit.
//
// The specific LAN address, not 0.0.0.0, and resolved fresh on every run
// rather than hardcoded: 0.0.0.0 binds every interface the machine has --
// VPNs, container bridges, anything else that shows up -- which is a wider,
// less deliberate exposure than the one interface actually meant to reach a
// phone. A LAN address handed out by DHCP can also change between sessions,
// so resolving it here beats writing today's number into a script and
// having it go stale.
import os from "node:os";
import { spawn } from "node:child_process";

function findLanAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4") continue;
      if (addr.internal) continue; // excludes 127.0.0.1
      if (addr.address.startsWith("169.254.")) continue; // link-local, not a real LAN
      candidates.push({ name, address: addr.address });
    }
  }
  return candidates;
}

const candidates = findLanAddress();
if (candidates.length === 0) {
  console.error(
    "No LAN-facing IPv4 address found on this machine (checked every " +
    "network interface, excluded loopback and link-local 169.254.x.x). " +
    "Cannot bind off loopback -- is a network adapter actually connected?",
  );
  process.exit(1);
}
if (candidates.length > 1) {
  console.log(
    `More than one LAN-facing address found; using the first. All: ${candidates
      .map((c) => `${c.name}=${c.address}`)
      .join(", ")}`,
  );
}
const { name, address } = candidates[0];
const port = process.env.PORT || "8787";

console.log(`Binding wrangler dev to ${address}:${port} (interface: ${name}), not 127.0.0.1.`);
console.log(`A phone on the same network would open: http://${address}:${port}/?board=1`);
console.log(
  "This confirms the socket is reachable off loopback, NOT that a phone " +
  "has actually connected -- that has not been tested from this machine.",
);

const child = spawn("npx", ["wrangler", "dev", "--ip", address, "--port", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
