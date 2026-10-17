(function (root) {
  var PHASE_COUNT = 5;

  function clamp01(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  function clampPhase(value) {
    value = Math.round(Number(value));
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(PHASE_COUNT - 1, value));
  }

  // Schmitt trigger: a phase only changes after the scroll position crosses
  // the boundary by `margin` (fraction of one phase). Large jumps settle immediately.
  function resolvePhase(progress, current, margin) {
    var phase = clampPhase(current);
    if (!Number.isFinite(Number(progress))) return phase;
    var band = Number(margin);
    if (!Number.isFinite(band) || band < 0) band = 0.12;
    if (band > 0.45) band = 0.45;
    var index = Math.min(PHASE_COUNT - 0.001, clamp01(progress) * PHASE_COUNT);
    if (index >= phase + 2) return Math.min(PHASE_COUNT - 1, Math.floor(index));
    if (index <= phase - 1) return Math.max(0, Math.floor(index));
    if (index > phase + 1 + band) return Math.min(PHASE_COUNT - 1, phase + 1);
    if (index < phase - band) return Math.max(0, phase - 1);
    return phase;
  }

  // Auto-synthesis sits in the second half of the connect chapter, with a
  // dead zone so a few pixels of scroll cannot flicker the canvas.
  function resolveSynthesis(progress, phase, synthesized, touched) {
    if (touched || phase !== 2) return Boolean(synthesized);
    var local = clamp01(progress) * PHASE_COUNT - 2;
    if (!synthesized && local >= 0.5) return true;
    if (synthesized && local <= 0.36) return false;
    return Boolean(synthesized);
  }

  function scrollTargetForPhase(phase, start, travel) {
    return start + travel * (clampPhase(phase) + 0.5) / PHASE_COUNT;
  }

  function phaseProgress(scrollY, start, travel) {
    scrollY = Number(scrollY);
    start = Number(start);
    travel = Number(travel);
    if (!Number.isFinite(scrollY) || !Number.isFinite(start) || !Number.isFinite(travel) || travel <= 0) return 0;
    return clamp01((scrollY - start) / travel);
  }

  var api = {
    PHASE_COUNT: PHASE_COUNT,
    resolvePhase: resolvePhase,
    resolveSynthesis: resolveSynthesis,
    scrollTargetForPhase: scrollTargetForPhase,
    phaseProgress: phaseProgress
  };
  root.ModlineStory = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
