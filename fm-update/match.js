// Recover 13.5.7's mangled top-level names by aligning its declarations with 13.4.0's.
// usage: node match.js old.canon.js new.canon.js mapping.json
const fs = require("fs");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , oldFile, newFile, outFile] = process.argv;
const parse = (f) => parser.parse(fs.readFileSync(f, "utf8"), { sourceType: "script", errorRecovery: true });

function topDecls(body) {
  const out = [];
  for (const st of body) {
    if (t.isClassDeclaration(st) || t.isFunctionDeclaration(st)) out.push({ name: st.id.name, kind: st.type, node: st });
    else if (t.isVariableDeclaration(st))
      for (const d of st.declarations) if (t.isIdentifier(d.id)) out.push({ name: d.id.name, kind: "Var", node: d });
  }
  return out;
}

const oldAst = parse(oldFile);
const newAst = parse(newFile);
const iife = newAst.program.body.find((s) => t.isExpressionStatement(s));
const newBody = iife.expression.callee.body.body;
const A = topDecls(oldAst.program.body);
const B = topDecls(newBody);
const oldNames = new Set(A.map((d) => d.name));
const newNames = new Set(B.map((d) => d.name));

// Token bag: identifiers/strings/numbers, excluding canonical locals and top-level names.
function tokens(node, tops) {
  const code = generate(node).code;
  const bag = new Map();
  for (const m of code.matchAll(/"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?/g)) {
    const w = m[0];
    if (/^v\d+_\d+$/.test(w) || tops.has(w)) continue;
    bag.set(w, (bag.get(w) || 0) + 1);
  }
  return bag;
}
A.forEach((d) => (d.bag = tokens(d.node, oldNames)));
B.forEach((d) => (d.bag = tokens(d.node, newNames)));
function sim(x, y) {
  if (x.kind !== y.kind) return 0;
  let inter = 0, uni = 0;
  const keys = new Set([...x.bag.keys(), ...y.bag.keys()]);
  for (const k of keys) {
    const a = x.bag.get(k) || 0, b = y.bag.get(k) || 0;
    inter += Math.min(a, b);
    uni += Math.max(a, b);
  }
  return uni ? inter / uni : 1;
}

// Needleman-Wunsch alignment maximizing total similarity (order-preserving).
const n = A.length, m = B.length;
const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
const simCache = Array.from({ length: n }, (_, i) => B.map((_, j) => sim(A[i], B[j])));
for (let i = 1; i <= n; i++) P[i][0] = 1;
for (let j = 1; j <= m; j++) P[0][j] = 2;
for (let i = 1; i <= n; i++)
  for (let j = 1; j <= m; j++) {
    const s = simCache[i - 1][j - 1];
    const diag = S[i - 1][j - 1] + (s > 0.3 ? s : -1);
    let best = diag, p = 0;
    if (S[i - 1][j] > best) (best = S[i - 1][j]), (p = 1);
    if (S[i][j - 1] > best) (best = S[i][j - 1]), (p = 2);
    S[i][j] = best;
    P[i][j] = p;
  }
const pairs = [];
for (let i = n, j = m; i > 0 || j > 0; ) {
  const p = P[i][j];
  if (i > 0 && j > 0 && p === 0) pairs.push([A[i - 1], B[j - 1], simCache[i - 1][j - 1]]), i--, j--;
  else if (i > 0 && (j === 0 || p === 1)) pairs.push([A[i - 1], null, 0]), i--;
  else pairs.push([null, B[j - 1], 0]), j--;
}
pairs.reverse();

// Second pass: unmatched old names that match an unmatched new decl out of order.
const matchedB = new Set(pairs.filter((p) => p[0] && p[1]).map((p) => p[1]));
const extra = [];
for (const p of pairs) {
  if (!p[0] || p[1]) continue;
  let best = null, bs = 0.5;
  for (const b of B) if (!matchedB.has(b)) { const s = sim(p[0], b); if (s > bs) (bs = s), (best = b); }
  if (best) matchedB.add(best), (p[1] = best), (p[2] = bs), extra.push(p[0].name);
}

const mapping = {}, report = [];
for (const [a, b, s] of pairs) {
  if (a && b) mapping[b.name] = a.name;
  report.push({ old: a && a.name, new: b && b.name, kind: (a || b).kind, score: +s.toFixed(3) });
}
fs.writeFileSync(outFile, JSON.stringify({ mapping, report }, null, 1));
const matched = report.filter((r) => r.old && r.new);
console.log(`old ${n} new ${m} matched ${matched.length} (out-of-order ${extra.length})`);
console.log(`old unmatched: ${report.filter((r) => r.old && !r.new).map((r) => r.old).join(", ")}`);
console.log(`new unmatched: ${report.filter((r) => !r.old && r.new).length}`);
console.log("low-score matches:");
for (const r of matched.filter((r) => r.score < 0.6)) console.log(`  ${r.old} <- ${r.new} ${r.kind} ${r.score}`);
