// Normalize a deobfuscated flockmod.js so different builds/deobfuscators diff cleanly:
//  - obj["name"] -> obj.name, ["name"]() {} -> name() {}, {"name": x} -> {name: x}
//  - rename every _0x... binding to v<depth>_<n> (per scope, in declaration order)
//  - split top-level `a, b, c;` expression statements into separate statements
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inFile, outFile] = process.argv;
const src = fs.readFileSync(inFile, "utf8");
const ast = parser.parse(src, { sourceType: "script", errorRecovery: true, plugins: ["classProperties"] });

const isIdent = (s) => t.isValidIdentifier(s, false);

traverse(ast, {
  MemberExpression(p) {
    const n = p.node;
    if (n.computed && t.isStringLiteral(n.property) && isIdent(n.property.value)) {
      n.property = t.identifier(n.property.value);
      n.computed = false;
    }
  },
  "ClassMethod|ObjectMethod|ObjectProperty|ClassProperty"(p) {
    const n = p.node;
    if (n.computed && t.isStringLiteral(n.key) && isIdent(n.key.value)) {
      n.key = t.identifier(n.key.value);
      n.computed = false;
    } else if (!n.computed && t.isStringLiteral(n.key) && isIdent(n.key.value)) {
      n.key = t.identifier(n.key.value);
    }
  },
  ExpressionStatement(p) {
    const e = p.node.expression;
    if (t.isSequenceExpression(e) && (p.parentPath.isBlockStatement() || p.parentPath.isProgram())) {
      p.replaceWithMultiple(e.expressions.map((x) => t.expressionStatement(x)));
    }
  },
  UnaryExpression(p) {
    // !0 / !1 -> true / false
    const n = p.node;
    if (n.operator === "!" && t.isNumericLiteral(n.argument) && (n.argument.value === 0 || n.argument.value === 1)) {
      p.replaceWith(t.booleanLiteral(n.argument.value === 0));
    }
  },
});

// Pre-pass: move leftover v<d>_<n> names to unique temps so re-canonicalizing can't capture.
let tmp = 0;
traverse(ast, {
  Scope(p) {
    for (const k of Object.keys(p.scope.bindings)) {
      // A class declaration's inner name binding shares its id with the outer one; skip it.
      if (p.isClassDeclaration() && p.scope.bindings[k].path.node === p.node) continue;
      if (/^v\d+_\d+$/.test(k)) p.scope.rename(k, `_0xt${tmp++}`);
    }
  },
});

// Scope renaming: depth-qualified so shadowing can never capture.
traverse(ast, {
  Scope(p) {
    const scope = p.scope;
    let depth = 0;
    for (let s = scope.parent; s; s = s.parent) depth++;
    const names = Object.keys(scope.bindings)
      .filter((k) => /^_0x/.test(k) && !(p.isClassDeclaration() && scope.bindings[k].path.node === p.node))
      .sort((a, b) => scope.bindings[a].identifier.start - scope.bindings[b].identifier.start);
    let i = 0;
    for (const name of names) {
      let nn;
      do nn = `v${depth}_${i++}`; while (nn !== name && (scope.hasBinding(nn) || scope.hasGlobal(nn)));
      if (nn !== name) scope.rename(name, nn);
    }
  },
});

fs.writeFileSync(outFile, generate(ast, { comments: true, retainLines: false }).code);
