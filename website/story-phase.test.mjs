import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const code = readFileSync(fileURLToPath(new URL("./story-phase.js", import.meta.url)), "utf8");
const sandbox = { module: { exports: {} } };
vm.runInNewContext(code, sandbox);
const { resolvePhase, resolveSynthesis, scrollTargetForPhase, phaseProgress } = sandbox.module.exports;

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error("FAIL:", message);
  }
}

const margin = 0.12;
let phase = 0;
for (const index of [0.9, 1.02, 0.98, 1.05, 1.08, 1.11]) {
  phase = resolvePhase(index / 5, phase, margin);
}
assert(phase === 0, "oscillation just before the forward threshold stays on phase 0");
phase = resolvePhase(1.2 / 5, phase, margin);
assert(phase === 1, "crossing the forward threshold enters phase 1");
phase = resolvePhase(1.05 / 5, phase, margin);
assert(phase === 1, "sliding back inside the dead zone stays on phase 1");
phase = resolvePhase(0.8 / 5, phase, margin);
assert(phase === 0, "crossing the back threshold returns to phase 0");

assert(resolvePhase(1, 0, margin) === 4, "end of the track resolves to the last phase");
assert(resolvePhase(0, 4, margin) === 0, "start of the track resolves to the first phase");
assert(resolvePhase(2.5 / 5, 0, margin) === 2, "a large jump lands on the floor phase");
assert(resolvePhase(Number.NaN, 3, margin) === 3, "invalid progress keeps the current phase");

for (let target = 0; target < 5; target += 1) {
  const y = scrollTargetForPhase(target, 1000, 4000);
  const progress = phaseProgress(y, 1000, 4000);
  for (let current = 0; current < 5; current += 1) {
    assert(
      resolvePhase(progress, current, margin) === target,
      `center of phase ${target} from ${current} resolves to ${target}`
    );
  }
}

assert(phaseProgress(500, 1000, 4000) === 0, "progress clamps below the track");
assert(phaseProgress(6000, 1000, 4000) === 1, "progress clamps above the track");
assert(phaseProgress(1000, 1000, 0) === 0, "zero travel does not divide");

assert(resolveSynthesis(0.5, 2, false, false) === true, "phase 2 center synthesizes");
assert(resolveSynthesis(2.2 / 5, 2, false, false) === false, "early in phase 2 stays unconnected");
assert(resolveSynthesis(2.45 / 5, 2, true, false) === true, "dead zone keeps an existing synthesis");
assert(resolveSynthesis(2.3 / 5, 2, true, false) === false, "rewinding past the back threshold clears synthesis");
assert(resolveSynthesis(0.9, 2, false, true) === false, "a touched canvas is left alone");
assert(resolveSynthesis(0.9, 3, false, false) === false, "other phases do not synthesize themselves");

if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("story-phase: all assertions passed");
