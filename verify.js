// verify.js — summarized checks for SmartTasks HTML (no deps)
const fs = require("fs");
const path = require("path");

// ---------- locate target ----------
function resolveTarget() {
  const cli = process.argv[2];
  if (cli && fs.existsSync(cli)) return cli;
  const candidates = ["app/taskheat.html", "index.html", "public/index.html"];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.error("verify.js: target HTML not found. Pass a path or place it at app/taskheat.html or index.html");
  process.exit(1);
}

const file = resolveTarget();
const src = fs.readFileSync(file, "utf8");

// ---------- tiny helpers ----------
function hasOneOf(patterns) {
  return patterns.some(p => src.includes(p));
}
function hasAll(patterns) {
  return patterns.every(p => src.includes(p));
}
function row(status, label, info = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚪";
  const extra = info ? ` — ${info}` : "";
  return `${icon} ${label}${extra}`;
}

// ---------- define checks ----------
const checks = [
  { id: "nodesLayer", label: "Canvas nodes root present", fn: () => hasOneOf(['id="nodesLayer"', "id='nodesLayer'"]) },
  { id: "linkLayer", label: "SVG link layer present", fn: () => hasOneOf(['id="linkLayer"', "id='linkLayer'"]) },
  { id: "pointer-events", label: "Pointer events wired (drag)", fn: () => hasAll(["pointerdown", "pointermove", "pointerup"]) },
  { id: "commands", label: "Link/Unlink commands available", fn: () => hasAll(['data-cmd="link"', 'data-cmd="unlink"']) || hasAll(["data-cmd='link'", "data-cmd='unlink'"]) },
  { id: "storage", label: "Persistence via localStorage", fn: () => src.includes("localStorage") },
  { id: "markdown", label: "Markdown renderer reachable", fn: () => hasOneOf(["function renderMarkdown", "=> renderMarkdown", "renderMarkdown("]) },
  { id: "delete-confirm", label: "Delete confirmation hooked", fn: () => hasOneOf(["confirm(", "tryDeleteNode("]) },
  { id: "undo", label: "Undo capability present", fn: () => hasOneOf(["function undoDelete", "undoDelete("]) },
];

// Optional semantics block (only enforced if UI exists)
const semanticsUI = hasOneOf(['id="semanticBtn"', "id='semanticBtn'"]);
const semanticsChecks = [
  { id: "sem-recompute", label: "Semantics recompute button present", fn: () => hasOneOf(['id="recomputeBtn"', "id='recomputeBtn'"]) },
  { id: "sem-model-ref", label: "Transformers/Model reference present (optional)", fn: () => hasOneOf(["@xenova/transformers", "Xenova/all-MiniLM-L6-v2"]), optional: true },
];

// ---------- run checks ----------
let passed = 0, failed = 0, skipped = 0;
const lines = [];

for (const c of checks) {
  const ok = !!c.fn();
  if (ok) { passed++; lines.push(row("PASS", c.label)); }
  else { failed++; lines.push(row("FAIL", c.label)); }
}

if (semanticsUI) {
  lines.push("— Semantics UI detected —");
  for (const c of semanticsChecks) {
    const ok = !!c.fn();
    if (ok) { passed++; lines.push(row("PASS", c.label)); }
    else if (c.optional) { skipped++; lines.push(row("SKIP", c.label, "optional")); }
    else { failed++; lines.push(row("FAIL", c.label)); }
  }
} else {
  lines.push("— Semantics UI not detected (skipping semantics checks) —");
  skipped += semanticsChecks.length;
}

// ---------- report ----------
const rel = path.relative(process.cwd(), file);
console.log(`SmartTasks verification for ${rel}\n`);
console.log(lines.join("\n"));
console.log(`\nSummary: PASS=${passed}  FAIL=${failed}  SKIP=${skipped}\n`);

process.exit(failed ? 1 : 0);
