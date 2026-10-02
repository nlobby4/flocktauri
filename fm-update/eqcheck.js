// Prove a cleanup changed names, comments and formatting only.
// usage: node eqcheck.js old.js new.js [outdir]
//
// Both files are parsed, every declared binding (top-level ones included) is renamed to a
// positional name (scope depth + declaration order), comments and raw literal spellings are
// dropped, and the code is regenerated. Undeclared globals keep their names. The two outputs
// are then diffed line by line; every difference is printed, and should match a removal
// listed in tidy.js's report.
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

const [, , oldFile, newFile, outDir = "cleanup"] = process.argv;

function normalize(file) {
  const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "script" });
  // Collect every binding's identifier nodes first, then rename them in place (scope.rename
  // walks the whole scope per binding and is far too slow for 11k bindings).
  const jobs = [];
  traverse(ast, {
    Scope(p) {
      let depth = 0;
      for (let s = p.scope.parent; s; s = s.parent) depth++;
      const names = Object.keys(p.scope.bindings)
        .filter((k) => !(p.isClassDeclaration() && p.scope.bindings[k].path.node === p.node))
        .sort(
          (x, y) => p.scope.bindings[x].identifier.start - p.scope.bindings[y].identifier.start,
        );
      names.forEach((name, i) => {
        const b = p.scope.bindings[name];
        const nodes = new Set([b.identifier, ...b.referencePaths.map((r) => r.node)]);
        for (const v of b.constantViolations) for (const n of violationIds(v, name)) nodes.add(n);
        // a class declaration's own name inside its body is a separate binding
        if (b.path.isClassDeclaration()) {
          const inner = b.path.scope.getOwnBinding(name);
          if (inner) for (const r of inner.referencePaths) nodes.add(r.node);
        }
        jobs.push({ nodes, to: `__b${depth}_${i}` });
      });
    },
  });
  for (const j of jobs)
    for (const n of j.nodes) {
      if (n.type !== "Identifier")
        throw new Error(
          `${file}: non-identifier reference ${n.type} at ${n.loc && n.loc.start.line}`,
        );
      n.name = j.to;
    }
  traverse(ast, {
    enter(p) {
      delete p.node.extra;
      p.node.leadingComments = p.node.trailingComments = p.node.innerComments = null;
    },
  });
  ast.comments = [];
  return generate(ast, { comments: false, retainLines: false }).code;
}

// Identifier nodes a constant violation (assignment, update, redeclaration, for-in/of) writes.
function violationIds(v, name) {
  const out = [];
  const take = (n) => {
    if (!n) return;
    const ids = require("@babel/types").getBindingIdentifiers(n, true);
    for (const x of [].concat(ids[name] || [])) out.push(x);
  };
  if (v.isAssignmentExpression()) take(v.node.left);
  else if (v.isUpdateExpression()) take(v.node.argument);
  else if (v.isVariableDeclarator()) take(v.node.id);
  else if (v.isForXStatement()) take(v.node.left);
  else if (v.isFunctionDeclaration() || v.isClassDeclaration()) take(v.node.id);
  else if (v.isCatchClause()) take(v.node.param);
  else throw new Error("unhandled constant violation " + v.type);
  return out;
}

const a = normalize(oldFile).split("\n");
const b = normalize(newFile).split("\n");
fs.writeFileSync(path.join(outDir, "eq.old.js"), a.join("\n"));
fs.writeFileSync(path.join(outDir, "eq.new.js"), b.join("\n"));

// line diff (Myers would be nicer; the files are near-identical, so greedy resync is enough)
const hunks = [];
let i = 0,
  j = 0;
while (i < a.length || j < b.length) {
  if (i < a.length && j < b.length && a[i] === b[j]) {
    i++;
    j++;
    continue;
  }
  // find the nearest resync point
  let best = null;
  for (let d = 1; d < 400 && !best; d++) {
    for (let k = 0; k <= d; k++) {
      const ii = i + k,
        jj = j + (d - k);
      if (ii < a.length && jj < b.length && a[ii] === b[jj] && a[ii + 1] === b[jj + 1]) {
        best = [ii, jj];
        break;
      }
    }
  }
  if (!best) best = [a.length, b.length];
  hunks.push({ oldAt: i + 1, removed: a.slice(i, best[0]), added: b.slice(j, best[1]) });
  [i, j] = best;
}
for (const h of hunks) {
  console.log(`@@ old line ${h.oldAt}: -${h.removed.length} +${h.added.length}`);
  for (const l of h.removed) console.log("- " + l.slice(0, 150));
  for (const l of h.added) console.log("+ " + l.slice(0, 150));
}
console.log(hunks.length ? `${hunks.length} difference(s)` : "identical");
