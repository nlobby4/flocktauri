// Apply a binding rename map (cleanup-names.json) to a canonical flockmod.js.
// usage: node rename.js in.canon.js cleanup-names.json out.js
//
// Keys come from keys.js and are computed on the input before anything is renamed. A rename
// that would capture or be captured by another binding (or shadow a global) is skipped and
// reported, never forced. Missing keys and bindings still carrying canon names are reported.
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const { labelScopes, bindingKey } = require("./keys");

const isCanon = (n) => /^v\d+_\d+$/.test(n) || /^_0x/.test(n);

// Every binding in the file with its key, plus a safe renamer shared with name-gen.js.
function makeRenamer(ast) {
  const labels = labelScopes(ast, traverse);
  const jobs = [];
  let program;
  traverse(ast, {
    Program(p) {
      program = p;
    },
    Scope(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) {
        // a class declaration's inner self-binding is handled with the outer one
        if (p.isClassDeclaration() && b.path.node === p.node) continue;
        const key = bindingKey(labels, p.scope, name);
        jobs.push({ key, name, scope: p.scope, binding: b });
      }
    },
  });
  const forbid = forbiddenNames(program);
  const subtree = subtreeNames(program);
  return {
    jobs,
    program,
    check: (j, to) => unsafe(j, to, forbid, subtree),
    rename: (j, to) => doRename(j, to, subtree),
  };
}

function planRenames(ast, renames) {
  const r = makeRenamer(ast);
  const jobs = r.jobs.map((j) => Object.assign(j, { to: renames[j.key] }));
  const usedKeys = new Set();
  let applied = 0;
  const skipped = [];
  for (const j of jobs) {
    if (!j.to) continue;
    usedKeys.add(j.key);
    if (j.to === j.name) continue;
    const why = r.check(j, j.to);
    if (why) {
      skipped.push(`${j.key} -> ${j.to}: ${why}`);
      continue;
    }
    r.rename(j, j.to);
    applied++;
  }
  const unused = Object.keys(renames).filter((k) => !usedKeys.has(k));
  const leftover = jobs.filter((j) => isCanon(j.binding.identifier.name)).map((j) => j.key);
  return { applied, skipped, unused, leftover };
}

// Names that may never be introduced: every top-level binding and every global the file
// reads, except a few browser globals that are idiomatic local names (still capture-checked).
function forbiddenNames(program) {
  const s = new Set(Object.keys(program.scope.bindings));
  for (const g of Object.keys(program.scope.globals)) s.add(g);
  for (const ok of [
    "self",
    "event",
    "name",
    "status",
    "top",
    "parent",
    "length",
    "value",
    "resolve",
    "origin",
    "screen",
    "history",
    "open",
    "close",
    "print",
    "frames",
    "closed",
    "external",
    "menubar",
    "toolbar",
    "scroll",
    "find",
    "focus",
    "blur",
    "stop",
  ])
    s.delete(ok);
  return s;
}

// For each scope block: every identifier name that appears inside it (bindings and references).
function subtreeNames(program) {
  const m = new Map();
  const add = (scope, name) => {
    for (let s = scope; s; s = s.parent) {
      let set = m.get(s.block);
      if (!set) m.set(s.block, (set = new Set()));
      if (set.has(name) && s !== scope) break; // ancestors already have it
      set.add(name);
    }
  };
  program.traverse({
    Identifier(p) {
      if (!p.isReferencedIdentifier() && !p.isBindingIdentifier()) return;
      add(p.scope, p.node.name);
    },
    // JSX-free file; labels and property keys are not names in scope
  });
  return m;
}

// The scope whose whole subtree a binding can see. Block-level function declarations in sloppy
// mode also create a var in the enclosing function (Annex B), so check that scope instead.
function reachScope(j) {
  if (j.binding.kind === "hoisted" && !j.scope.path.isFunction() && !j.scope.path.isProgram())
    return j.scope.getFunctionParent() || j.scope.getProgramParent();
  return j.scope;
}

function unsafe(j, to, forbid, subtree) {
  if (!/^[A-Za-z_$][\w$]*$/.test(to)) return "not an identifier";
  if (forbid.has(to) && !j.scope.path.isProgram()) return "shadows a global or top-level name";
  const reach = reachScope(j);
  if ((subtree.get(reach.block) || new Set()).has(to)) return "name already used inside the scope";
  if (j.scope.path.isProgram() && forbid.has(to)) return "top-level name taken";
  if (j.scope.hasOwnBinding(to)) return "already bound in scope";
  return null;
}

function doRename(j, to, subtree) {
  const from = j.binding.identifier.name;
  j.scope.rename(from, to);
  // a class declaration also binds its own name in the class scope
  if (j.binding.path.isClassDeclaration()) {
    const inner = j.binding.path.scope;
    if (inner.hasOwnBinding(from)) inner.rename(from, to);
  }
  // record the new name everywhere it now physically appears
  const b = j.binding;
  const where = [
    reachScope(j),
    b.path.scope,
    ...b.referencePaths.map((r) => r.scope),
    ...b.constantViolations.map((c) => c.scope),
  ];
  for (const start of new Set(where)) {
    for (let s = start; s; s = s.parent) {
      let set = subtree.get(s.block);
      if (!set) subtree.set(s.block, (set = new Set()));
      if (set.has(to)) break;
      set.add(to);
    }
  }
}

module.exports = { planRenames, makeRenamer, isCanon };

if (require.main === module) main();

function main() {
  const [, , inFile, mapFile, outFile] = process.argv;
  if (!outFile) {
    console.error("usage: node rename.js in.canon.js cleanup-names.json out.js");
    process.exit(2);
  }
  const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
  const renames = Object.assign({}, map.topLevel, map.locals);
  const ast = parser.parse(fs.readFileSync(inFile, "utf8"), { sourceType: "script" });
  const plan = planRenames(ast, renames);
  const { applied, skipped, unused, leftover } = plan;

  fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
  console.log(
    `renamed ${applied}, skipped ${skipped.length}, unused map keys ${unused.length}, canon names left ${leftover.length}`,
  );
  for (const s of skipped.slice(0, 50)) console.log("  skipped", s);
  for (const u of unused.slice(0, 50)) console.log("  unused key", u);
  for (const l of leftover.slice(0, 50)) console.log("  left", l);
}
