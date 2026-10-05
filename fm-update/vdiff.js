// Structural diff of two canonical FlockMod builds, per top-level declaration and class member.
// usage: node vdiff.js old.canon.js new.canon.js out-dir
// Writes out-dir/summary.txt and out-dir/<Decl>.<member>.diff (unified diff of each changed unit).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , oldFile, newFile, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const traverse = require("@babel/traverse").default;
// Drop literal raw text so quote style and number spelling don't show as changes.
function parse(f) {
  const ast = parser.parse(fs.readFileSync(f, "utf8"), { sourceType: "script", errorRecovery: true });
  traverse(ast, { "StringLiteral|NumericLiteral|DirectiveLiteral"(p) { delete p.node.extra; } });
  return ast;
}
const code = (n) => generate(n, { comments: false }).code;

function units(file) {
  const out = new Map();
  for (const st of parse(file).program.body) {
    if (t.isClassDeclaration(st)) {
      out.set(`${st.id.name}`, "class " + st.id.name + (st.superClass ? " extends " + code(st.superClass) : ""));
      for (const m of st.body.body) {
        const k = m.key ? m.key.name || m.key.value : "?";
        const kind = m.kind === "constructor" ? "constructor" : (m.static ? "static " : "") + (m.kind || "prop");
        out.set(`${st.id.name}.${k}${kind === "method" || kind === "constructor" ? "" : "[" + kind + "]"}`, code(m));
      }
    } else if (t.isFunctionDeclaration(st)) out.set(st.id.name, code(st));
    else if (t.isVariableDeclaration(st))
      for (const d of st.declarations) out.set(t.isIdentifier(d.id) ? d.id.name : code(d.id), code(d));
    else {
      const c = code(st);
      out.set("stmt:" + c.slice(0, 60).replace(/\s+/g, " "), c);
    }
  }
  return out;
}

const A = units(oldFile), B = units(newFile);
const lines = (s) => s.split("\n").length;
const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "vd"));
function udiff(a, b) {
  fs.writeFileSync(path.join(tmp, "a"), a + "\n");
  fs.writeFileSync(path.join(tmp, "b"), b + "\n");
  try { execFileSync("diff", ["-u", path.join(tmp, "a"), path.join(tmp, "b")]); return ""; }
  catch (e) { return e.stdout.toString().split("\n").slice(2).join("\n"); }
}
const added = [], removed = [], changed = [];
let addL = 0, delL = 0;
for (const [k, v] of B) if (!A.has(k)) added.push([k, lines(v)]);
for (const [k, v] of A) if (!B.has(k)) removed.push([k, lines(v)]);
for (const [k, v] of A) {
  if (!B.has(k) || B.get(k) === v) continue;
  const d = udiff(v, B.get(k));
  const plus = (d.match(/^\+/gm) || []).length, minus = (d.match(/^-/gm) || []).length;
  addL += plus; delL += minus;
  changed.push([k, plus, minus]);
  fs.writeFileSync(path.join(outDir, k.replace(/[^\w.$-]/g, "_").slice(0, 120) + ".diff"), d);
}
for (const [k, v] of B) if (!A.has(k)) fs.writeFileSync(path.join(outDir, "ADDED." + k.replace(/[^\w.$-]/g, "_").slice(0, 120) + ".js"), v);
const s = [];
s.push(`units old ${A.size} new ${B.size}; changed ${changed.length} (+${addL} -${delL} lines), added ${added.length} (${added.reduce((a, x) => a + x[1], 0)} lines), removed ${removed.length} (${removed.reduce((a, x) => a + x[1], 0)} lines)`);
s.push("\nCHANGED (+added -removed lines):");
for (const [k, p, m] of changed) s.push(`  ${k}  +${p} -${m}`);
s.push("\nADDED:");
for (const [k, n] of added) s.push(`  ${k}  (${n} lines)`);
s.push("\nREMOVED:");
for (const [k, n] of removed) s.push(`  ${k}  (${n} lines)`);
fs.writeFileSync(path.join(outDir, "summary.txt"), s.join("\n") + "\n");
console.log(s[0]);
