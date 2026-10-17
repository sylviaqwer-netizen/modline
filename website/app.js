"use strict";

// This website demonstrates a curated example. No model requests are made.
const thoughts = [
  { text: "我能申请的职业方向比去年多了。", short: "我能申请的<br>职业方向变多了", x: 15, y: 22 },
  { text: "选择越多，我越怕选错。", short: "选择越多，<br>我越怕选错", x: 15, y: 73 },
  { text: "远程工作让我能自己安排时间。", short: "可以更自由地<br>安排工作时间", x: 56, y: 13, question: "可以自由安排时间，是否也意味着你需要一直在线？" },
  { text: "收入不稳定时，我很难真正放松。", short: "收入不稳定时<br>很难放松", x: 87, y: 46, question: "收入的不稳定，具体影响了你做哪些决定？" },
  { text: "父母那一代的职业路径好像更确定。", short: "上一辈的路径<br>好像更确定", x: 66, y: 83, question: "你感受到的确定，更多来自稳定的收入，还是清晰的职业路径？" },
  { text: "刷到同龄人的成绩，我会更焦虑。", short: "和同龄人比较<br>让我更焦虑", x: 34, y: 86, question: "你是在和过去的自己比较，还是和同龄人展示出来的生活比较？" }
];

const mainClaim = "对我而言，职业方向变多并没有直接让求职更轻松，反而让我更担心选错。";
const evidenceText = "我同时考虑 AI 产品、运营和商业化岗位，却因为不确定哪条路更适合自己，反复修改求职方向。";
const guidance = [
  "先找到一个你愿意继续想的问题。",
  "让零散想法出现，先不用急着整理。",
  "选中想法，看看它们之间藏着什么。",
  "点击节点换个焦点，再补一条值得想的线。",
  "把思考带走，成为你自己的表达结构。"
];
const state = { phase: 0, selected: new Set([0, 1]), synthesized: false, inspected: null, evidence: false, focus: "thesis", connectionTouched: false };
const storyChapters = [
  { label: "QUESTION", title: "一个问题，就是思考的起点。", subtitle: "先从你在意的事情开始。\n不需要立刻给出答案。" },
  { label: "THOUGHTS", title: "先把想法放下，不急着整理。", subtitle: "经历、感受、直觉和疑问。\n让它们先出现在眼前。" },
  { label: "CONNECTIONS", title: "想法相遇，观点开始出现。", subtitle: "找到两条值得放在一起的想法。\n从它们之间的张力继续探索。" },
  { label: "REASONING", title: "换一个角度，再问深一点。", subtitle: "为什么成立？有没有其他解释？\n一次，补上一条值得想的线。" },
  { label: "EXPRESSION", title: "现在，带走自己的思考结构。", subtitle: "观点、依据与限定条件逐渐成形。\n接下来，用自己的语言表达。" }
];
let storyController = null;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const touchPrimary = window.matchMedia("(hover: none) and (pointer: coarse)");
const Story = globalThis.ModlineStory;
if (!Story) throw new Error("story-phase.js failed to load");
let headingAnimation = null;

function paintStoryProgress(progress, ariaOnly = false) {
  document.querySelectorAll("[data-story-phase]").forEach(button => {
    const index = Number(button.dataset.storyPhase);
    if (index === state.phase) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
    if (ariaOnly) return;
    const value = progress == null
      ? (index <= state.phase ? 1 : 0)
      : Math.max(0, Math.min(1, progress * 5 - index));
    button.style.setProperty("--chapter-progress", value.toFixed(4));
  });
}

function markStoryMode() {
  const story = document.querySelector("#demo");
  story.dataset.phase = String(state.phase);
  story.dataset.mode = storyController?.enabled ? "scroll" : "steps";
}
const stage = document.querySelector("#demo-stage");
const phaseTabs = Array.from(document.querySelectorAll("[data-phase]"));
const phasePrev = document.querySelector("#phase-prev");
const phaseNext = document.querySelector("#phase-next");
const toastElement = document.querySelector("#toast");
let toastTimer;

function announce(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  toastTimer = setTimeout(() => toastElement.classList.remove("visible"), 3000);
}

function settleConnectView() {
  if (state.connectionTouched || state.selected.size !== 2 || state.synthesized) return false;
  state.synthesized = true;
  return true;
}

function choosePhase(phase, focusPanel = false, source = "manual") {
  if (!Number.isInteger(phase) || phase < 0 || phase > 4) return;
  const same = phase === state.phase;
  if (same && source !== "initial") {
    if (source === "manual") {
      if (phase === 2 && settleConnectView()) applySynthesisView(true);
      storyController?.goToPhase(phase);
    }
    if (!storyController?.enabled) paintStoryProgress(null);
    if (focusPanel) stage.focus({ preventScroll: true });
    markStoryMode();
    return;
  }
  const direction = phase < state.phase ? "backward" : "forward";
  const jump = Math.abs(phase - state.phase);
  const motion = source === "initial" || reducedMotion.matches ? "stationary" : jump > 1 ? "settle" : direction;
  stage.dataset.direction = motion;
  state.phase = phase;
  if (phase >= 3) {
    state.synthesized = true;
    state.selected = new Set([0, 1]);
  } else if (phase === 2 && source === "manual") {
    settleConnectView();
  }
  phaseTabs.forEach((tab, index) => {
    tab.setAttribute("aria-selected", String(index === phase));
    tab.tabIndex = index === phase ? 0 : -1;
  });
  stage.setAttribute("aria-labelledby", `phase-tab-${phase}`);
  renderPhase();
  document.querySelector("#stage-guidance").innerHTML = `<span class="guidance-number">0${phase + 1}</span><span>${guidance[phase]}</span>`;
  document.querySelector("#phase-count").textContent = `0${phase + 1} / 05`;
  phasePrev.disabled = phase === 0;
  phaseNext.disabled = phase === 4;
  updateStoryHeading(phase, motion, source);
  paintStoryProgress(source === "scroll" || !storyController?.enabled ? null : (phase + 0.5) / 5, source === "scroll");
  markStoryMode();
  if (focusPanel) stage.focus({ preventScroll: true });
  if (source === "manual") storyController?.goToPhase(phase);
}

function updateStoryHeading(phase, motion, source) {
  const chapter = storyChapters[phase];
  document.querySelector("#story-eyebrow").textContent = `0${phase + 1} / ${chapter.label}`;
  document.querySelector("#story-title").textContent = chapter.title;
  document.querySelector("#story-subtitle").textContent = chapter.subtitle;
  document.querySelector("#story-progress-label").textContent = `0${phase + 1} / 05`;
  const heading = document.querySelector(".story-heading");
  if (headingAnimation) headingAnimation.cancel();
  if (source === "initial" || motion === "stationary" || reducedMotion.matches || !heading.animate) return;
  const distance = motion === "settle" ? 0 : motion === "backward" ? -8 : 8;
  headingAnimation = heading.animate(
    [{ opacity: motion === "settle" ? .55 : .45, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }],
    { duration: motion === "settle" ? 220 : 380, easing: "cubic-bezier(.22, .68, .2, 1)" }
  );
}

function renderQuestion() {
  return `<div class="question-stage stage-enter">
    <span class="stage-eyebrow">A QUESTION WORTH THINKING ABOUT</span>
    <h3>从你在意的问题开始。</h3>
    <p>不需要立刻有答案，先给想法一个可以生长的地方。</p>
    <div class="question-card"><span class="question-card-icon" aria-hidden="true">?</span><div><strong>年轻人比上一辈更幸福了吗？</strong><small>示例题目 · 比较与评价 · 从个人经历切入</small></div></div>
    <button type="button" class="button" data-go-phase="1">从这个问题开始 <span aria-hidden="true">→</span></button>
    <div class="question-footnote">这里演示一条完整思路；真实产品从用户的问题出发。</div>
  </div>`;
}

function renderThoughts() {
  return `<div class="thought-stage stage-enter">
    <div class="phase-intro"><h3>先把脑子里的片段，放下来。</h3><p>此处展示预设想法，接着看看它们如何形成观点。</p></div>
    <div class="thought-grid">${thoughts.map((thought, index) => `<div class="thought-note">${thought.text}<span class="note-number">0${index + 1}</span></div>`).join("")}</div>
    <div class="thought-actions"><span>感受、经历和疑问，都可以成为起点。</span><button type="button" class="button" data-go-phase="2">试着把想法连起来 <span aria-hidden="true">→</span></button></div>
  </div>`;
}

function graphNodes() {
  return thoughts.map((thought, index) => {
    const target = index < 2;
    const selected = state.selected.has(index);
    return `<button type="button" class="graph-node${target ? " target" : ""}${target && selected ? " selected" : ""}" data-node="${index}" ${target ? `data-select-node="${index}" aria-pressed="${selected}"` : `data-read-node="${index}"`} style="left:${thought.x}%;top:${thought.y}%" aria-label="${target ? "选择想法" : "查看想法"}：${thought.text}">${thought.short}${target && selected ? '<span class="node-check" aria-hidden="true">✓</span>' : ""}</button>`;
  }).join("");
}

function synthMarkup(synthesized) {
  return synthesized
    ? "<small>张力 / TENSION</small><strong>选择增多带来的<br>选择焦虑</strong>"
    : '<span class="synth-icon" aria-hidden="true">⌁</span><strong>这里会长出一个观点</strong><small>SELECT → CONNECT → THINK</small>';
}

function coachMarkup(synthesized, inspected) {
  const heading = synthesized ? "让张力，<br>长成一个观点。" : inspected ? "试着再问一句。" : "这两条想法，<br>可以放在一起吗？";
  const body = synthesized ? "机会增加，和体验变好，并不总是同步。先保留个人体验，再检验这条关系。" : inspected ? inspected.question : "机会增加，是变化。更怕选错，是感受。它们之间的张力，可能就是观点的起点。";
  const coach = synthesized
    ? `<div class="synthesis-claim">${mainClaim}</div><button type="button" class="button" data-go-phase="3">再检验这个观点 <span aria-hidden="true">→</span></button><span class="coach-small">观点仍可修改，这只是继续思考的起点。</span>`
    : `<div class="coach-divider"></div><div class="coach-label">本次演示的综合对象</div><div class="selected-fragments"><span>01 · 职业方向变多了</span><span>02 · 选择越多，越怕选错</span></div><span class="selection-note">已选 ${state.selected.size} 条 · 点击蓝色节点选择</span><button type="button" class="button" data-synthesize ${state.selected.size < 2 ? "disabled" : ""}>综合这两条想法 <span aria-hidden="true">↗</span></button><span class="coach-small">示例输出已预设 · 保留个人体验的范围</span>`;
  return `<span class="coach-eyebrow"><span aria-hidden="true">✧</span> A LINE TO EXPLORE</span><h3>${heading}</h3><p>${body}</p>${coach}`;
}

function renderConnections() {
  const synthesized = state.synthesized;
  const inspected = state.inspected !== null ? thoughts[state.inspected] : null;
  return `<div class="connect-stage stage-enter" data-synthesized="${synthesized ? "1" : "0"}">
    <div class="graph-pane"><div class="graph-toolbar"><span><i></i> CONNECTION CANVAS</span><span data-graph-status>6 条想法 / ${synthesized ? "1 个观点" : "等待连接"}</span></div>
      <div class="graph-canvas" role="group" aria-label="示例想法关系画布">
        <svg class="graph-lines${synthesized ? " is-connected" : ""}" viewBox="0 0 1000 336" preserveAspectRatio="none" aria-hidden="true">
          <path class="${state.selected.has(0) ? "selected-line" : ""}" d="M150 74 C280 74 390 130 530 161"/>
          <path class="${state.selected.has(1) ? "selected-line" : ""}" d="M150 245 C285 245 350 200 530 161"/>
          <path d="M560 44 Q570 106 530 161"/><path d="M870 155 Q722 152 530 161"/><path d="M660 279 Q620 217 530 161"/><path d="M340 289 Q391 209 530 161"/>
        </svg>
        ${graphNodes()}
        <div class="synth-node${synthesized ? " connected" : ""}" aria-live="polite">${synthMarkup(synthesized)}</div>
      </div><div class="graph-bottom">蓝色节点可选择 · 灰色节点可查看追问示例</div>
    </div>
    <aside class="coach-panel${synthesized ? " is-connected" : ""}" aria-label="思考引导">${coachMarkup(synthesized, inspected)}</aside>
  </div>`;
}

function applySynthesisView(on) {
  const root = stage.querySelector(".connect-stage");
  if (!root || state.phase !== 2) return false;
  if (root.dataset.synthesized === (on ? "1" : "0")) return true;
  root.dataset.synthesized = on ? "1" : "0";
  root.querySelector(".graph-lines")?.classList.toggle("is-connected", on);
  const status = root.querySelector("[data-graph-status]");
  if (status) status.textContent = `6 条想法 / ${on ? "1 个观点" : "等待连接"}`;
  const synth = root.querySelector(".synth-node");
  if (synth) {
    synth.classList.toggle("connected", on);
    synth.innerHTML = synthMarkup(on);
  }
  const panel = root.querySelector(".coach-panel");
  if (panel) {
    panel.classList.toggle("is-connected", on);
    panel.innerHTML = coachMarkup(on, null);
  }
  return true;
}

const focuses = {
  thesis: { text: mainClaim, prompt: "你能举一个实际经历，说明选择变多如何让你更难决定吗？" },
  opportunities: { text: "我能申请的职业方向比去年多了。", prompt: "增加的选择，对你来说更像新的机会，还是更多需要比较的信息？" },
  criteria: { text: "我还缺少判断哪条职业路径更适合自己的标准。", prompt: "做职业选择时，你最在意的一个标准是什么？" },
  information: { text: "焦虑也可能来自信息不足，而不只是选项的数量。", prompt: "如果你更了解岗位的真实工作，焦虑会不会减少？" },
  condition: { text: "有清晰的选择标准时，更多选择可能带来更多自由。", prompt: "这个观点在哪些条件下成立，又在哪些条件下不成立？" }
};

function renderReasoning() {
  const currentFocus = focuses[state.focus];
  const whyCards = state.focus === "thesis"
    ? [{ key: "opportunities", text: "能申请的方向比去年更多。" }, { key: "criteria", text: "我还缺少判断哪条路适合自己的标准。" }]
    : [{ key: "thesis", text: "原观点：选择变多，并没有直接让我更轻松。" }, { key: "opportunities", text: "个人经历：能申请的职业方向增加。" }].filter(card => card.key !== state.focus);
  const soCards = [
    { key: "information", text: "焦虑也可能来自信息不足。" },
    { key: "condition", text: "有清晰标准时，更多选择会更自由吗？" }
  ].filter(card => card.key !== state.focus);
  return `<div class="reasoning-stage stage-enter">
    <div class="phase-intro"><h3>让观点，经得起再问一句。</h3><p>点击任意论证节点，它会成为新的聚焦对象。</p></div>
    <div class="reasoning-grid">
      <div class="reason-column"><div class="reason-label">WHY <span>已有依据与背景</span></div>${whyCards.map(card => `<button type="button" class="reason-card" data-focus="${card.key}">${card.text}</button>`).join("")}
        <button type="button" class="reason-card reason-gap${state.evidence ? " filled" : ""}" data-toggle-evidence aria-pressed="${state.evidence}"><span class="gap-tag">${state.evidence ? "已补充 · 预设示例" : "＋ 值得补的一条线"}</span>${state.evidence ? evidenceText : "还缺一个实际的例子。点这里，补上示例。"}</button>
      </div>
      <div class="reason-column focus-column"><div class="reason-label">FOCUS <span>当前聚焦</span></div><div class="reason-card focus-card"><small>${state.focus === "thesis" ? "YOUR WORKING CLAIM" : "A DIFFERENT ANGLE"}</small><strong>${currentFocus.text}</strong></div><button type="button" class="focus-reset" data-focus="thesis">${state.focus === "thesis" ? "围绕这一点，继续想。" : "↶ 回到最初的观点"}</button></div>
      <div class="reason-column"><div class="reason-label">SO WHAT <span>延伸与其他解释</span></div>${soCards.map(card => `<button type="button" class="reason-card" data-focus="${card.key}">${card.text}</button>`).join("")}<div class="coach-small">试着改变聚焦对象，<br>同一组想法就有了新的角度。</div></div>
    </div>
    <div class="reason-prompt"><p><span aria-hidden="true">✧</span> ${state.evidence && state.focus === "thesis" ? "如果你有了明确的选择标准，这种焦虑会不会减少？" : currentFocus.prompt}</p><button type="button" class="button" data-go-phase="4">把思路整理出来 <span aria-hidden="true">→</span></button></div>
  </div>`;
}

function outlineRows() {
  return [
    { label: "主题", text: "年轻人比上一辈更幸福了吗？——从职业选择的个人体验切入" },
    { label: "Thesis", text: mainClaim },
    { label: "P1 · 机会", text: "职业方向增加，意味着我拥有更多可以探索的可能。" },
    { label: "P2 · 体验", text: "但面对更多选项，我也需要比较更多信息，并承担对选错的担忧。", extra: state.evidence ? `个人例子：${evidenceText}` : "待补充：一个能说明选择压力的个人例子。" },
    { label: "P3 · 条件", text: "这种焦虑可能与选择标准不清、信息不足有关，不能直接推广到所有年轻人。" },
    { label: "Conclusion", text: "对我来说，更多机会能否转化为更好的体验，还取决于我能否找到适合自己的判断标准。" }
  ];
}

function renderExpression() {
  return `<div class="expression-stage stage-enter">
    <div class="phase-intro"><h3>带走一份属于自己的思考结构。</h3><p>预设示例提纲 · 可复制、可继续修改</p></div>
    <div class="outline">${outlineRows().map(row => `<div class="outline-row"><span>${row.label}</span><div><p>${row.text}</p>${row.extra ? `<p class="outline-extra">${row.extra}</p>` : ""}</div></div>`).join("")}</div>
    <div class="expression-actions"><span>这是表达的起点。<br>继续补充依据，再用自己的语言展开。</span><div class="expression-buttons"><button type="button" class="button button-outline" data-copy-outline>复制提纲 <span aria-hidden="true">⧉</span></button><button type="button" class="button" data-download-outline>下载提纲 <span aria-hidden="true">↓</span></button></div></div>
  </div>`;
}

function renderPhase() {
  const views = [renderQuestion, renderThoughts, renderConnections, renderReasoning, renderExpression];
  stage.innerHTML = views[state.phase]();
}

function rerenderInPlace() {
  stage.dataset.direction = "stationary";
  renderPhase();
}

function getOutlineMarkdown() {
  return "# 墨斗 Modline · 演示提纲\n\n> 本文件来自官网预设演示，不是实时 AI 生成结果。\n\n" + outlineRows().map(row => `## ${row.label}\n\n${row.text}${row.extra ? `\n\n${row.extra}` : ""}`).join("\n\n") + "\n";
}

async function copyOutline(button) {
  const text = getOutlineMarkdown();
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); copied = true; } catch (_) { /* Fall back to selection copy. */ }
  }
  if (!copied) {
    const temporary = document.createElement("textarea");
    temporary.value = text;
    temporary.setAttribute("aria-hidden", "true");
    temporary.style.cssText = "position:fixed;top:-10000px;left:0;";
    document.body.appendChild(temporary);
    temporary.select();
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    temporary.remove();
    button.focus({ preventScroll: true });
  }
  announce(copied ? "提纲已复制，可以继续用自己的语言展开。" : "浏览器未允许复制，请直接选中提纲文字复制。");
}

function downloadOutline() {
  const blob = new Blob([getOutlineMarkdown()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modline-demo-outline.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("已下载演示提纲，补充的示例也会一起保留。");
}

stage.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.hasAttribute("data-go-phase")) {
    choosePhase(Number(button.dataset.goPhase), true);
  } else if (button.hasAttribute("data-select-node")) {
    state.connectionTouched = true;
    const index = Number(button.dataset.selectNode);
    if (state.selected.has(index)) state.selected.delete(index);
    else state.selected.add(index);
    state.synthesized = false;
    state.inspected = null;
    rerenderInPlace();
    stage.querySelector(`[data-select-node="${index}"]`).focus({ preventScroll: true });
  } else if (button.hasAttribute("data-read-node")) {
    state.connectionTouched = true;
    state.inspected = Number(button.dataset.readNode);
    if (state.synthesized) {
      announce(thoughts[state.inspected].question);
    } else {
      rerenderInPlace();
      stage.querySelector(`[data-read-node="${state.inspected}"]`).focus({ preventScroll: true });
    }
  } else if (button.hasAttribute("data-synthesize")) {
    if (state.selected.size !== 2) return;
    state.connectionTouched = true;
    state.synthesized = true;
    state.inspected = null;
    if (!applySynthesisView(true)) rerenderInPlace();
    stage.querySelector("[data-go-phase]")?.focus({ preventScroll: true });
    announce("两条想法已经连接，看看这个初步观点。");
  } else if (button.hasAttribute("data-focus")) {
    if (!focuses[button.dataset.focus]) return;
    state.focus = button.dataset.focus;
    rerenderInPlace();
    stage.querySelector(".focus-reset").focus({ preventScroll: true });
  } else if (button.hasAttribute("data-toggle-evidence")) {
    state.evidence = !state.evidence;
    rerenderInPlace();
    stage.querySelector("[data-toggle-evidence]").focus({ preventScroll: true });
    announce(state.evidence ? "已补上预设示例，提纲也会保留这个例子。" : "示例已移除，先为实际经历留出位置。");
  } else if (button.hasAttribute("data-copy-outline")) {
    void copyOutline(button);
  } else if (button.hasAttribute("data-download-outline")) {
    downloadOutline();
  }
});

phaseTabs.forEach(tab => tab.addEventListener("click", () => choosePhase(Number(tab.dataset.phase))));
phasePrev.addEventListener("click", () => choosePhase(state.phase - 1, true));
phaseNext.addEventListener("click", () => choosePhase(state.phase + 1, true));
document.querySelectorAll("[data-jump-phase]").forEach(button => {
  button.addEventListener("click", () => {
    choosePhase(Number(button.dataset.jumpPhase), true);
    if (!storyController?.enabled) document.querySelector("#demo").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  });
});
document.querySelectorAll("[data-story-phase]").forEach(button => button.addEventListener("click", () => choosePhase(Number(button.dataset.storyPhase))));

const inspectorContent = {
  context: `<div class="inspector-field"><div class="field-key">question</div><div class="field-value">年轻人比上一辈更幸福了吗？</div></div><div class="inspector-field"><div class="field-key">selected_thoughts</div><span class="input-chip">01 &nbsp; 我能申请的职业方向比去年多了。</span><span class="input-chip">02 &nbsp; 选择越多，我越怕选错。</span></div><div class="inspector-field"><div class="field-key">current_task</div><div class="field-value">判断两条想法是否值得放在一起，<br>并保留用户原本的个人体验。</div></div>`,
  boundary: `<ul class="inspector-boundary"><li><span>01</span><div><strong>先判断关系，再尝试综合</strong><p>不能只因为关键词相似，就强行把两条想法拼成一个结论。</p></div></li><li><span>02</span><div><strong>保留“我”的立场与范围</strong><p>用户说的是个人体验，就不能扩大成所有年轻人的普遍事实。</p></div></li><li><span>03</span><div><strong>把推测留作可检验的问题</strong><p>“选择增加导致焦虑”仍需依据与其他解释，可以进入下一步继续检查。</p></div></li></ul>`,
  output: `<div class="inspector-field"><div class="field-key">group_name / 张力</div><div class="field-value">选择增多带来的选择焦虑</div></div><div class="inspector-field"><div class="field-key">working_claim</div><div class="field-value"><span class="output-scope">对我而言</span>，职业方向变多并没有直接让求职更轻松，反而让我更担心选错。</div></div><div class="inspector-field"><div class="field-key">why_this_connection</div><div class="field-value">一条讲机会增加，一条讲体验变差。<br>它们让我们看到：更多选择的价值，还取决于人如何做出选择。</div></div>`
};

function chooseInspector(key) {
  if (!Object.hasOwn(inspectorContent, key)) return;
  document.querySelectorAll("[data-inspector]").forEach(tab => {
    const selected = tab.dataset.inspector === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  const panel = document.querySelector("#ai-panel");
  panel.innerHTML = inspectorContent[key];
  panel.setAttribute("aria-labelledby", `ai-tab-${key}`);
}
document.querySelectorAll("[data-inspector]").forEach(tab => tab.addEventListener("click", () => chooseInspector(tab.dataset.inspector)));

const evolutionItems = [
  {
    label: "STRUCTURE → RELATIONSHIP",
    title: "让想法能参与多条关系。",
    description: "树状结构便于分层。发散思考时，一条想法也可能同时支持、限制或挑战多个观点，因此 P3 选择关系画布承载连接与综合。",
    visual: `<svg viewBox="0 0 380 170" aria-hidden="true"><g fill="none" stroke="#d0d7e0" stroke-width="1.1"><path d="M76 52v31M37 83h78M37 83v30M115 83v30"/></g><g fill="white" stroke="#d9dfe7"><rect x="53" y="23" width="46" height="30" rx="6"/><rect x="14" y="113" width="46" height="30" rx="6"/><rect x="92" y="113" width="46" height="30" rx="6"/></g><text x="76" y="42" text-anchor="middle" fill="#a4afbf">主题</text><text x="37" y="132" text-anchor="middle" fill="#a4afbf">想法</text><text x="115" y="132" text-anchor="middle" fill="#a4afbf">想法</text><path d="M164 85h35m-5-5 5 5-5 5" stroke="#a3b7d7" fill="none"/><g stroke="#9ebef1" fill="none"><path d="M239 43 302 78 250 134 239 43m11 91 92-13-40-43"/></g><g fill="white" stroke="#c6d7ee"><circle cx="239" cy="43" r="20"/><circle cx="250" cy="134" r="20"/><circle cx="342" cy="121" r="20"/></g><rect x="275" y="59" width="54" height="39" rx="8" fill="#2563eb"/><g fill="#859fbf"><text x="239" y="47" text-anchor="middle">想法</text><text x="250" y="138" text-anchor="middle">想法</text><text x="342" y="125" text-anchor="middle">想法</text></g><text x="302" y="82" text-anchor="middle" fill="white">观点</text></svg>`
  },
  {
    label: "MANY SUGGESTIONS → ONE NEXT STEP",
    title: "把下一步，放到一条具体的线上。",
    description: "在论证检验中，设计方向是一次只提示一条值得补的关系，并用空缺节点承接回应。用户可以看见自己要回答什么、补在哪里。",
    visual: `<svg viewBox="0 0 380 170" aria-hidden="true"><g fill="white" stroke="#dce2e9"><rect x="11" y="20" width="132" height="127" rx="8"/></g><g stroke="#d5dde7"><path d="M26 42h89M26 64h76M26 86h92M26 108h73M26 130h97"/></g><g fill="#ced5df"><circle cx="132" cy="42" r="2"/><circle cx="132" cy="64" r="2"/><circle cx="132" cy="86" r="2"/><circle cx="132" cy="108" r="2"/><circle cx="132" cy="130" r="2"/></g><path d="M162 85h35m-5-5 5 5-5 5" stroke="#a3b7d7" fill="none"/><rect x="222" y="24" width="145" height="42" rx="8" fill="#2563eb"/><text x="295" y="50" text-anchor="middle" fill="white">当前观点</text><path d="M295 66v33" stroke="#8aaef0" stroke-dasharray="3 3"/><rect x="222" y="99" width="145" height="47" rx="8" fill="#f9fbff" stroke="#a4c0ec" stroke-dasharray="4 4"/><text x="295" y="121" text-anchor="middle" fill="#6d94cc">＋ 一个实际的例子</text><text x="295" y="136" text-anchor="middle" fill="#9bb0d0" style="font-size:7px">一次，只补上一条线。</text></svg>`
  },
  {
    label: "FREE LAYOUT → A STABLE VIEW",
    title: "换一个焦点，保留熟悉的空间。",
    description: "P4 用 WHY / FOCUS / SO WHAT 三栏呈现论证。点击节点后，以它为中心重新查看依据与延伸，让用户有稳定的位置来理解关系。",
    visual: `<svg viewBox="0 0 380 170" aria-hidden="true"><g fill="#8a9ab0" style="font-size:8px"><text x="60" y="23" text-anchor="middle">WHY</text><text x="190" y="23" text-anchor="middle" fill="#537dc2">FOCUS</text><text x="320" y="23" text-anchor="middle">SO WHAT</text></g><path d="M111 64h29m101 26h29M111 127l29-28" stroke="#bdcfe9" fill="none"/><g fill="white" stroke="#d7e1f0"><rect x="10" y="42" width="101" height="45" rx="7"/><rect x="10" y="105" width="101" height="45" rx="7"/><rect x="270" y="68" width="101" height="45" rx="7"/></g><rect x="140" y="58" width="101" height="65" rx="8" fill="#2563eb"/><g fill="#8a9fbe"><text x="60" y="69" text-anchor="middle">已有依据</text><text x="60" y="132" text-anchor="middle">限定条件</text><text x="320" y="95" text-anchor="middle">其他解释</text></g><text x="190" y="94" text-anchor="middle" fill="white">当前观点</text></svg>`
  }
];

function chooseEvolution(index) {
  const item = evolutionItems[index];
  if (!item) return;
  document.querySelectorAll("[data-evolution]").forEach(tab => {
    const selected = Number(tab.dataset.evolution) === index;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  const panel = document.querySelector("#evolution-panel");
  panel.innerHTML = `<span class="small-label">${item.label}</span><div class="evolution-visual">${item.visual}</div><div class="evolution-caption"><strong>${item.title}</strong><p>${item.description}</p></div>`;
  panel.setAttribute("aria-labelledby", `evolution-tab-${index}`);
}
document.querySelectorAll("[data-evolution]").forEach(tab => tab.addEventListener("click", () => chooseEvolution(Number(tab.dataset.evolution))));

function supportTabKeyboard(selector, attribute, choose, vertical = false) {
  const list = document.querySelector(selector);
  list.addEventListener("keydown", event => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let next = index;
    if (event.key === (vertical ? "ArrowDown" : "ArrowRight")) next = (index + 1) % tabs.length;
    else if (event.key === (vertical ? "ArrowUp" : "ArrowLeft")) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    choose(tabs[next].getAttribute(attribute));
    tabs[next].focus({ preventScroll: true });
  });
}
supportTabKeyboard(".workspace-tabs", "data-phase", value => choosePhase(Number(value)));
supportTabKeyboard(".inspector-tabs", "data-inspector", chooseInspector);
supportTabKeyboard(".evolution-list", "data-evolution", value => chooseEvolution(Number(value)), true);

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
function closeMenu() {
  const wasOpen = !mobileNav.hidden;
  mobileNav.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "打开导航");
  if (wasOpen) storyController?.relayout?.();
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  mobileNav.hidden = !open;
  storyController?.relayout?.();
});
mobileNav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); }
});
document.addEventListener("click", event => {
  if (!mobileNav.hidden && !event.target.closest(".site-header")) closeMenu();
});
window.addEventListener("resize", () => { if (window.innerWidth > 700 && !mobileNav.hidden) closeMenu(); });

function scrollToY(top, smoothScroll) {
  if (smoothScroll) {
    window.scrollTo({ top, behavior: "smooth" });
    return;
  }
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo({ top, left: 0, behavior: "instant" });
  root.style.scrollBehavior = previous;
}

function commitFromProgress(progress) {
  const phase = Story.resolvePhase(progress, state.phase, 0.12);
  const canAutoSynthesize = !state.connectionTouched && state.selected.size === 2;
  if (phase !== state.phase) {
    if (phase === 2 && canAutoSynthesize) state.synthesized = Story.resolveSynthesis(progress, 2, state.synthesized, false);
    choosePhase(phase, false, "scroll");
    return;
  }
  if (phase !== 2 || !canAutoSynthesize) return;
  const synthesized = Story.resolveSynthesis(progress, phase, state.synthesized, false);
  if (synthesized === state.synthesized) return;
  state.synthesized = synthesized;
  if (!applySynthesisView(synthesized)) rerenderInPlace();
}

function initializeScrollStory() {
  const story = document.querySelector("#demo");
  const fit = document.querySelector(".story-fit");
  const hero = document.querySelector(".hero");
  const hint = document.querySelector("#story-scroll-hint");
  const header = document.querySelector(".site-header");
  const chapterLinks = Array.from(document.querySelectorAll(".chapter-nav a"));
  const pageChapters = chapterLinks.map(link => document.querySelector(link.getAttribute("href")));
  const textLinks = Array.from(document.querySelectorAll(".desktop-nav a[href^='#'], #mobile-nav a[href^='#']"));
  let enabled = false;
  let start = 0;
  let travel = 1;
  let pendingTarget = null;
  let frame = 0;
  let layoutFrame = 0;
  let flickTimer = 0;
  let lastSample = { y: window.scrollY, t: performance.now() };
  let chapterOffsets = [];
  let heroAnchor = 0;
  let heroHeight = 1;
  let lastChapter = -1;
  let heroPaint = "";
  let scrollLockOn = false;
  let observer = null;

  function releaseScrollLock() {
    if (!scrollLockOn) return;
    scrollLockOn = false;
    window.removeEventListener("wheel", onLockWheel);
  }
  function onLockWheel(event) {
    if (!pendingTarget || performance.now() >= pendingTarget.armedAt) {
      pendingTarget = null;
      releaseScrollLock();
      return;
    }
    event.preventDefault();
  }
  function armScrollLock() {
    if (scrollLockOn) return;
    scrollLockOn = true;
    window.addEventListener("wheel", onLockWheel, { passive: false });
  }
  function measure() {
    chapterOffsets = pageChapters.map(section => section ? Math.round(section.getBoundingClientRect().top + window.scrollY) : Infinity);
    heroAnchor = Math.round(hero.getBoundingClientRect().top + window.scrollY);
    heroHeight = Math.max(1, Math.round(hero.offsetHeight));
  }
  function paintChapter(y) {
    const marker = y + window.innerHeight * 0.42;
    let activeChapter = 0;
    chapterOffsets.forEach((top, index) => { if (top <= marker) activeChapter = index; });
    if (activeChapter === lastChapter) return;
    lastChapter = activeChapter;
    const href = chapterLinks[activeChapter]?.getAttribute("href");
    chapterLinks.forEach((link, index) => {
      if (index === activeChapter) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    textLinks.forEach(link => {
      if (link.getAttribute("href") === href) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  function paintHero(y) {
    if (reducedMotion.matches || y > heroAnchor + heroHeight + 80) {
      if (heroPaint !== "0") {
        heroPaint = "0";
        hero.style.setProperty("--hero-progress", "0");
      }
      return;
    }
    const next = Math.max(0, Math.min(1, (y - heroAnchor) / heroHeight)).toFixed(3);
    if (next === heroPaint) return;
    heroPaint = next;
    hero.style.setProperty("--hero-progress", next);
  }

  function layout() {
    layoutFrame = 0;
    if (observer) observer.disconnect();
    try {
      const wasEnabled = enabled;
      const headerHeight = Math.max(1, Math.round(header.getBoundingClientRect().height));
      const viewportHeight = Math.max(1, Math.round(window.innerHeight - headerHeight));
      const allowScroll = window.innerWidth >= 960 && window.innerHeight >= 720 && !reducedMotion.matches && !touchPrimary.matches;
      document.documentElement.style.setProperty("--header-h", `${headerHeight}px`);
      story.style.setProperty("--story-top", `${headerHeight}px`);
      story.style.setProperty("--story-viewport", `${viewportHeight}px`);
      story.style.setProperty("--story-scale", "1");
      let nextEnabled = allowScroll;
      let scaleText = "1";
      let nextStart = start;
      let nextTravel = travel;
      if (allowScroll) {
        story.classList.add("is-scroll-enabled");
        const available = viewportHeight - 16;
        const needed = Math.max(1, fit.offsetHeight);
        const scale = Math.min(1, available / needed);
        if (scale < 0.78) nextEnabled = false;
        else {
          scaleText = scale.toFixed(4);
          nextTravel = Math.round(window.innerHeight * 4);
        }
      }
      story.classList.toggle("is-scroll-enabled", nextEnabled);
      if (nextEnabled) {
        story.style.setProperty("--story-scale", scaleText);
        story.style.setProperty("--story-travel", `${nextTravel}px`);
        nextStart = Math.round(story.getBoundingClientRect().top + window.scrollY - headerHeight);
      } else {
        story.style.setProperty("--story-scale", "1");
        pendingTarget = null;
        releaseScrollLock();
      }
      enabled = nextEnabled;
      start = nextStart;
      travel = Math.max(1, nextTravel);
      if (pendingTarget && Math.abs(pendingTarget.anchor - start) > 6) {
        pendingTarget = null;
        releaseScrollLock();
      }
      hint.textContent = enabled ? "向下继续 · 向上回看" : touchPrimary.matches ? "点步骤，或左右滑动" : "点击步骤，按自己的节奏探索。";
      measure();
      lastChapter = -1;
      heroPaint = "";
      markStoryMode();
      if (!enabled) paintStoryProgress(null);
      if (wasEnabled !== enabled) updateStoryHeading(state.phase, "stationary", "initial");
    } finally {
      if (observer) observer.observe(fit);
    }
    schedule();
  }

  function update() {
    frame = 0;
    const y = window.scrollY;
    const now = performance.now();
    const dt = Math.max(16, now - lastSample.t);
    const fast = Math.abs(y - lastSample.y) / dt > 7;
    lastSample = { y, t: now };
    paintHero(y);
    paintChapter(y);
    if (!enabled) return;
    if (pendingTarget) {
      const arrived = Math.abs(y - pendingTarget.y) < 3 || now > pendingTarget.expires;
      if (!arrived) {
        paintStoryProgress((pendingTarget.phase + 0.5) / 5);
        return;
      }
      pendingTarget = null;
      releaseScrollLock();
    }
    if (y < start - 1 || y > start + travel + 1) return;
    const progress = Story.phaseProgress(y, start, travel);
    paintStoryProgress(progress);
    if (fast) {
      clearTimeout(flickTimer);
      flickTimer = setTimeout(schedule, 130);
      return;
    }
    commitFromProgress(progress);
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function scheduleLayout() { if (!layoutFrame) layoutFrame = requestAnimationFrame(layout); }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", scheduleLayout, { passive: true });
  window.addEventListener("scrollend", schedule, { passive: true });
  window.addEventListener("keydown", event => {
    if (event.defaultPrevented || !pendingTarget) return;
    const tag = event.target && event.target.tagName;
    if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA") return;
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
      pendingTarget = null;
      releaseScrollLock();
    }
  });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", scheduleLayout);
  if (touchPrimary.addEventListener) touchPrimary.addEventListener("change", scheduleLayout);
  if ("ResizeObserver" in window) {
    observer = new ResizeObserver(scheduleLayout);
    observer.observe(fit);
  }
  layout();
  return {
    get enabled() { return enabled; },
    relayout() { layout(); },
    goToPhase(phase) {
      if (!enabled) return;
      const y = Math.round(Story.scrollTargetForPhase(phase, start, travel));
      const current = window.scrollY;
      const inside = current >= start - 8 && current <= start + travel + 8;
      const smooth = !reducedMotion.matches && !inside && Math.abs(y - current) > 160;
      pendingTarget = {
        y,
        phase,
        anchor: start,
        expires: performance.now() + (smooth ? 2500 : 450),
        armedAt: performance.now() + (smooth ? 700 : 0)
      };
      if (smooth) armScrollLock();
      else releaseScrollLock();
      scrollToY(y, smooth);
      schedule();
    }
  };
}

function initializeSectionReveals() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const blocks = document.querySelectorAll(".section-topline, .why-intro, .before-after, .section-heading, .ai-layout, .evolution-layout, .closing-section");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    });
  }, { threshold: .08, rootMargin: "0px 0px -35px 0px" });
  blocks.forEach(block => { block.classList.add("reveal-block"); observer.observe(block); });
}

let suppressClick = false;
let gesture = null;
const workspace = document.querySelector(".workspace");
workspace.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" || storyController?.enabled) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
}, { passive: true });
workspace.addEventListener("pointerup", event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = null;
  if (storyController?.enabled) return;
  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
  suppressClick = true;
  window.setTimeout(() => { suppressClick = false; }, 400);
  choosePhase(state.phase + (dx < 0 ? 1 : -1), false, "manual");
}, { passive: true });
workspace.addEventListener("pointercancel", () => { gesture = null; }, { passive: true });
workspace.addEventListener("click", event => {
  if (!suppressClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressClick = false;
}, true);
document.addEventListener("click", event => {
  const link = event.target.closest("a[href='#demo']");
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!storyController?.enabled) return;
  event.preventDefault();
  if (!mobileNav.hidden) closeMenu();
  choosePhase(0, false, "manual");
  if (location.hash !== "#demo") history.pushState(null, "", "#demo");
});

choosePhase(0, false, "initial");
chooseInspector("context");
chooseEvolution(0);
storyController = initializeScrollStory();
initializeSectionReveals();
