// Port a vanilla FlockMod update into the modded canonical file, one declaration/class member at a time.
//   base = old vanilla (aligned), mod = modded file built on base, new = new vanilla (aligned)
// For every unit the update changed: take the new version when the mod left it as vanilla,
// otherwise use the hand-merged version from resolutions/<unit>.js (a full replacement unit).
// Units the update added are inserted after their predecessor; removed ones are dropped.
// usage: node port.js base.js mod.js new.js resolutions-dir out.js report.txt
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , baseFile, modFile, newFile, resDir, outFile, reportFile] = process.argv;
function parse(f) {
  return parser.parse(fs.readFileSync(f, "utf8"), { sourceType: "script", errorRecovery: true });
}
// Literal raw text is dropped for comparison only, so quote style doesn't count as a change.
function norm(n) {
  const c = t.cloneNode(n, true, true);
  const strip = (x) => {
    if (!x || typeof x.type !== "string") return;
    if (t.isStringLiteral(x) || t.isNumericLiteral(x)) delete x.extra;
    for (const k of t.VISITOR_KEYS[x.type] || []) {
      const v = x[k];
      if (Array.isArray(v)) v.forEach(strip);
      else strip(v);
    }
  };
  strip(c);
  return generate(c, { comments: false }).code;
}
const memberKey = (m) =>
  (m.static ? "static " : "") + (m.kind === "get" || m.kind === "set" ? m.kind + " " : "") +
  (m.key ? m.key.name || m.key.value : "?") + (t.isClassProperty(m) ? "[prop]" : "");

// Flatten a program into ordered units: top-level decls/statements and class members.
function units(ast) {
  const list = [], map = new Map();
  const add = (key, node, container, cls) => {
    let k = key, i = 2;
    while (map.has(k)) k = `${key}#${i++}`;
    const u = { key: k, node, container, cls };
    list.push(u);
    map.set(k, u);
  };
  for (const st of ast.program.body) {
    if (t.isClassDeclaration(st)) {
      // the class header (name, superclass) is its own unit; members follow
      add(st.id.name, st, ast.program.body, null);
      for (const m of st.body.body) add(`${st.id.name}.${memberKey(m)}`, m, st.body.body, st.id.name);
    } else if (t.isFunctionDeclaration(st)) add(st.id.name, st, ast.program.body, null);
    else if (t.isVariableDeclaration(st) && st.declarations.length === 1 && t.isIdentifier(st.declarations[0].id))
      add(st.declarations[0].id.name, st, ast.program.body, null);
    else add("stmt:" + norm(st).replace(/\s+/g, " ").slice(0, 80), st, ast.program.body, null);
  }
  return { list, map };
}
// A class header compares by name and superclass only.
const sig = (u) =>
  t.isClassDeclaration(u.node) ? "class " + u.node.id.name + " extends " + (u.node.superClass ? norm(u.node.superClass) : "") : norm(u.node);

const B = units(parse(baseFile)), N = units(parse(newFile));
const modAst = parse(modFile);
const M = units(modAst);
const report = { taken: [], resolved: [], conflict: [], added: [], removed: [], keptMod: [] };
const resFor = (key) => path.join(resDir, key.replace(/[^\w.$#-]/g, "_") + ".js");
function loadResolution(key) {
  const f = resFor(key);
  if (!fs.existsSync(f)) return null;
  const src = fs.readFileSync(f, "utf8");
  // top-level declarations parse as they are; class members are wrapped in a class body
  if (!key.includes(".")) return parser.parse(src, { sourceType: "script" }).program.body[0];
  return parser.parse(`class __R extends Object { ${src} }`, { sourceType: "script" }).program.body[0].body.body[0];
}
function replaceIn(container, oldNode, newNode) {
  const i = container.indexOf(oldNode);
  if (i < 0) throw new Error("node not in container");
  container[i] = newNode;
}

// 1. changed and removed units
for (const b of B.list) {
  const n = N.map.get(b.key), m = M.map.get(b.key);
  const bs = sig(b);
  if (n && sig(n) === bs) continue;
  if (!m) { report.conflict.push(`${b.key}: changed upstream but missing in mod`); continue; }
  const ms = sig(m);
  if (t.isClassDeclaration(b.node)) {
    // header change (superclass): apply to the mod's class node in place
    if (!n) { report.removed.push(b.key); continue; } // handled with its members
    if (ms === bs) { m.node.superClass = n.node.superClass; report.taken.push(b.key); }
    else report.conflict.push(`${b.key}: class header changed on both sides`);
    continue;
  }
  if (!n) {
    if (ms === bs) { m.container.splice(m.container.indexOf(m.node), 1); report.removed.push(b.key); }
    else if (loadResolution(b.key)) { replaceIn(m.container, m.node, loadResolution(b.key)); report.resolved.push(b.key); }
    else report.conflict.push(`${b.key}: removed upstream, changed in mod`);
    continue;
  }
  // a resolution file always wins, so local edits to a vanilla method survive the update
  if (fs.existsSync(resFor(b.key))) { replaceIn(m.container, m.node, loadResolution(b.key)); report.resolved.push(b.key); continue; }
  if (ms === bs) { replaceIn(m.container, m.node, n.node); report.taken.push(b.key); continue; }
  if (ms === sig(n)) { report.taken.push(b.key + " (mod already equal)"); continue; }
  const r = loadResolution(b.key);
  if (r) { replaceIn(m.container, m.node, r); report.resolved.push(b.key); }
  else report.conflict.push(`${b.key}: changed upstream and in mod`);
}
// whole classes removed upstream (header unit) go once their members are gone
for (const key of report.removed) {
  const m = M.map.get(key);
  if (m && t.isClassDeclaration(m.node) && m.node.body.body.length === 0)
    m.container.splice(m.container.indexOf(m.node), 1);
}

// 1b. resolutions for mod-only units (e.g. a vanilla method the mod split into variants)
const used = new Set(report.resolved.map((k) => k.replace(/ \(.*\)$/, "")));
for (const f of fs.readdirSync(resDir)) {
  const key = f.replace(/\.js$/, "");
  if (used.has(key)) continue;
  const m = M.map.get(key);
  if (!m) { report.conflict.push(`${key}: resolution file has no matching unit in mod`); continue; }
  replaceIn(m.container, m.node, loadResolution(key));
  report.resolved.push(key + " (mod-only)");
}

// 2. added units, placed after the nearest preceding unit that exists in the mod
for (let i = 0; i < N.list.length; i++) {
  const n = N.list[i];
  if (B.map.has(n.key)) continue;
  if (M.map.has(n.key)) {
    const r = loadResolution(n.key);
    if (r) { replaceIn(M.map.get(n.key).container, M.map.get(n.key).node, r); report.resolved.push(n.key + " (added both sides)"); }
    else report.conflict.push(`${n.key}: added upstream, already defined in mod`);
    continue;
  }
  if (n.cls && !B.map.has(n.cls)) continue; // member of a brand-new class: comes with the class
  let anchor = null;
  for (let j = i - 1; j >= 0 && !anchor; j--) {
    const p = N.list[j];
    if (p.cls !== n.cls) { if (!n.cls) { /* top-level: skip over members of other classes */ } else break; }
    if (!n.cls && p.cls) continue;
    anchor = M.map.get(p.key) || null;
  }
  const container = n.cls ? M.map.get(n.cls).node.body.body : modAst.program.body;
  const at = anchor && container.includes(anchor.node) ? container.indexOf(anchor.node) + 1 : n.cls ? container.length : 0;
  container.splice(at, 0, n.node);
  M.map.set(n.key, { key: n.key, node: n.node, container, cls: n.cls });
  report.added.push(n.key);
}

fs.writeFileSync(outFile, generate(modAst, { comments: true }).code);
const out = [];
for (const [k, v] of Object.entries(report)) out.push(`${k.toUpperCase()} ${v.length}`, ...v.map((x) => "  " + x), "");
fs.writeFileSync(reportFile, out.join("\n"));
console.log(Object.entries(report).map(([k, v]) => `${k} ${v.length}`).join(", "));
