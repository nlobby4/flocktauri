// Structural 3-way merge: top-level declarations and class members are the merge units.
// A unit changed on one side only takes that side; changed on both gets a line-level diff3
// (git merge-file) with conflict markers. usage: node smerge.js base.js mod.js new.js out.js report.txt
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , baseF, modF, newF, outF, repF] = process.argv;
const parse = (f) => parser.parse(fs.readFileSync(f, "utf8"), { sourceType: "script", errorRecovery: true }).program.body;
const code = (n) => generate(n, { comments: true }).code;
const bare = (n) => generate(n, { comments: false }).code;
const { alignTo } = require("./align");
const report = [];
const TAKE_NEWM = new Set((process.env.TAKE_NEWM || "").split(",").filter(Boolean));
const TAKE_MOD = new Set((process.env.TAKE_MOD || "").split(",").filter(Boolean));

function tokenBag(s) {
  const m = new Map();
  for (const w of s.match(/[A-Za-z_$][\w$]*|"[^"]*"/g) || []) if (!/^v\d+_\d+$/.test(w)) m.set(w, (m.get(w) || 0) + 1);
  return m;
}
function sim(a, b) {
  let i = 0, u = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k) || 0, y = b.get(k) || 0;
    i += Math.min(x, y);
    u += Math.max(x, y);
  }
  return u ? i / u : 1;
}

// Key top-level statements. Declarations by name; other statements matched to base by similarity.
function topUnits(body) {
  const units = [];
  for (const s of body) {
    if (t.isClassDeclaration(s) || t.isFunctionDeclaration(s)) units.push({ key: "decl:" + s.id.name, node: s });
    else if (t.isVariableDeclaration(s) && s.declarations.length === 1 && t.isIdentifier(s.declarations[0].id))
      units.push({ key: "decl:" + s.declarations[0].id.name, node: s });
    else units.push({ key: null, node: s });
  }
  return units;
}
function keyStatements(units, baseUnits, tag) {
  const counts = {};
  const bases = baseUnits.filter((u) => u.key && u.key.startsWith("stmt:"));
  const used = new Set();
  for (const u of units) {
    if (u.key) {
      counts[u.key] = (counts[u.key] || 0) + 1;
      if (counts[u.key] > 1) u.key += "#" + counts[u.key];
      continue;
    }
    const src = bare(u.node);
    const bag = tokenBag(src);
    let best = null, bs = 0.6;
    for (const b of bases) if (!used.has(b.key)) { const s = sim(bag, b.bag); if (s > bs) (bs = s), (best = b); }
    if (best) used.add(best.key), (u.key = best.key);
    else u.key = `stmt:${tag}:${units.indexOf(u)}`;
  }
}

const B = topUnits(parse(baseF));
B.forEach((u, i) => { if (!u.key) (u.key = "stmt:base:" + i), (u.bag = tokenBag(bare(u.node))); });
const M = topUnits(parse(modF));
const N = topUnits(parse(newF));
keyStatements(M, B, "mod");
keyStatements(N, B, "new");

function diff3(label, mine, base, theirs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smerge-"));
  const [a, o, b] = ["mod", "base", "new"].map((n) => path.join(dir, n));
  fs.writeFileSync(a, mine + "\n");
  fs.writeFileSync(o, base + "\n");
  fs.writeFileSync(b, theirs + "\n");
  try {
    execFileSync("git", ["merge-file", "--diff-algorithm=histogram", "--diff3", "-L", "mod", "-L", "base", "-L", "new", a, o, b]);
  } catch (e) {
    report.push(`CONFLICT ${label} (${e.status} hunks)`);
  }
  const out = fs.readFileSync(a, "utf8").replace(/\n$/, "");
  fs.rmSync(dir, { recursive: true });
  return out;
}

function pick3(label, b, m, n) {
  // b/m/n: code strings or undefined
  if (m === undefined && n === undefined) return undefined;
  if (b === undefined) {
    if (m !== undefined && n !== undefined) {
      if (m === n) return m;
      report.push(`ADDED-BOTH ${label}`);
      return diff3(label, m, "", n);
    }
    return m !== undefined ? m : n;
  }
  if (m === undefined) {
    if (n !== b) report.push(`MOD-DELETED-BUT-NEW-CHANGED ${label}`);
    return undefined;
  }
  if (n === undefined) {
    if (m !== b) { report.push(`NEW-DELETED-BUT-MOD-CHANGED ${label} (kept mod)`); return m; }
    return undefined;
  }
  if (m === b) return n;
  if (n === b || m === n) return m;
  const locals = (s) => [...new Set(s.match(/v\d+_\d+/g) || [])].sort().join(",");
  const decls = (s) => (s.match(/(?:var|let|const|function)\s+(v\d+_\d+)|\(([^)]*)\)\s*(?:=>|\{)/g) || []).join("|");
  if (decls(b) !== decls(n) || locals(b) !== locals(n)) report.push(`RENUMBER-RISK ${label}`);
  if (TAKE_MOD.has(label)) { report.push(`TAKE-MOD ${label}`); return m; }
  if (TAKE_NEWM.has(label)) { report.push(`TAKE-NEW ${label}`); return n; }
  const isMember = !label.startsWith("decl:");
  const m2 = alignTo(b, m, isMember), n2 = alignTo(b, n, isMember), b2 = alignTo(b, b, isMember);
  return diff3(label, m2, b2, n2);
}

// Order: mod's order, new-only keys inserted after their nearest preceding key in new's order.
function order(modKeys, newKeys) {
  const out = [...modKeys];
  const seen = new Set(out);
  let prev = null;
  for (const k of newKeys) {
    if (!seen.has(k)) {
      const at = prev === null ? 0 : out.indexOf(prev) + 1;
      out.splice(at, 0, k);
      seen.add(k);
    }
    prev = k;
  }
  return out;
}

function memberKey(m) {
  const name = m.key ? (m.key.name || m.key.value || bare(m.key)) : "?";
  return `${m.static ? "static " : ""}${m.kind || m.type}:${name}`;
}
function members(cls) {
  const counts = {};
  return cls.body.body.map((m) => {
    let k = memberKey(m);
    counts[k] = (counts[k] || 0) + 1;
    if (counts[k] > 1) k += "#" + counts[k];
    return { key: k, node: m };
  });
}
function mergeClass(name, b, m, n) {
  const head = (c) => `class ${c.id.name}${c.superClass ? " extends " + bare(c.superClass) : ""}`;
  const hb = b && head(b), hm = head(m), hn = head(n);
  const h = hm === hb ? hn : hm;
  if (hm !== hb && hn !== hb && hm !== hn) report.push(`CLASS-HEADER ${name}: mod "${hm}" new "${hn}" (kept mod)`);
  const mb = new Map((b ? members(b) : []).map((x) => [x.key, code(x.node)]));
  const MM = members(m), NN = members(n);
  const mm = new Map(MM.map((x) => [x.key, code(x.node)]));
  const mn = new Map(NN.map((x) => [x.key, code(x.node)]));
  const parts = [];
  for (const k of order(MM.map((x) => x.key), NN.map((x) => x.key))) {
    const bb = mb.get(k), cm = mm.get(k), cn = mn.get(k);
    // Compare without comments so a mod comment alone doesn't make a member "changed".
    const r = pick3(`${name}.${k}`, bb, cm, cn);
    if (r !== undefined) parts.push(r);
  }
  return `${h} {\n${parts.join("\n")}\n}`;
}

const mapB = new Map(B.map((u) => [u.key, u.node]));
const mapM = new Map(M.map((u) => [u.key, u.node]));
const mapN = new Map(N.map((u) => [u.key, u.node]));
const takeNew = new Set((process.env.TAKE_NEW || "").split(",").filter(Boolean).map((n) => "decl:" + n));
const out = [];
for (const k of order(M.map((u) => u.key), N.map((u) => u.key))) {
  const b = mapB.get(k), m = mapM.get(k), n = mapN.get(k);
  if (takeNew.has(k)) { if (n) out.push(code(n)); report.push(`TAKE-NEW ${k}`); continue; }
  if (m && n && t.isClassDeclaration(m) && t.isClassDeclaration(n) && (!b || t.isClassDeclaration(b))) {
    if (b && code(m) === code(b)) out.push(code(n));
    else if (code(n) === (b && code(b))) out.push(code(m));
    else out.push(mergeClass(k.slice(5), b, m, n));
    continue;
  }
  const r = pick3(k, b && code(b), m && code(m), n && code(n));
  if (r !== undefined) out.push(r);
}
fs.writeFileSync(outF, out.join("\n") + "\n");
fs.writeFileSync(repF, report.join("\n") + "\n");
console.log(report.filter((r) => r.startsWith("CONFLICT")).length, "conflicting units;", report.length, "report lines");
