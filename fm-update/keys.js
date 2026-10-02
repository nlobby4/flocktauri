// Stable keys for bindings in a canonical (canon.js output) file, shared by name-gen.js and rename.js.
//
// A top-level binding's key is its own name ("v0_19").
// A local binding's key is "<owner path>|<name>", e.g. "Socket>receive>fn1|v3_0":
//   - named owners (classes, methods, named functions, `x = function`, `{ key: function }`)
//     contribute their name;
//   - unnamed function/block scopes contribute "fn<k>" / "<type><k>", k counting the unnamed
//     scopes of that kind under the nearest owner, in source order.
// Owner names are taken from the canonical input, so keys must be computed before any rename.
const t = require("@babel/types");
const generate = require("@babel/generator").default;

function keyName(key) {
  if (t.isIdentifier(key)) return key.name;
  if (t.isStringLiteral(key) || t.isNumericLiteral(key)) return String(key.value);
  if (t.isPrivateName(key)) return "#" + key.id.name;
  return null;
}

// Label for a scope-creating node, or null when it is unnamed.
function ownLabel(path) {
  const n = path.node;
  if (path.isClass()) return n.id ? n.id.name : null;
  if (path.isClassMethod() || path.isClassPrivateMethod() || path.isObjectMethod()) {
    const k = n.computed ? null : keyName(n.key);
    if (k == null) return null;
    const pre =
      (n.static ? "static " : "") + (n.kind === "get" || n.kind === "set" ? n.kind + " " : "");
    return pre + k;
  }
  if (path.isFunctionDeclaration()) return n.id ? n.id.name : null;
  if (path.isFunction()) {
    if (n.id) return n.id.name;
    const p = path.parentPath;
    if (p.isVariableDeclarator() && t.isIdentifier(p.node.id)) return p.node.id.name;
    if (p.isAssignmentExpression() && p.node.right === n) {
      const l = p.node.left;
      if (t.isIdentifier(l) || t.isMemberExpression(l)) {
        const s = generate(l).code;
        if (s.length < 80) return s;
      }
    }
    if ((p.isObjectProperty() || p.isClassProperty()) && p.node.value === n && !p.node.computed) {
      const k = keyName(p.node.key);
      if (k != null) return k;
    }
  }
  return null;
}

// Assigns every scope path a label; call once per AST before renaming.
function labelScopes(ast, traverse) {
  const labels = new Map(); // scope block node -> path string
  const counters = new Map(); // owner path string -> {kind: count}
  const seen = new Map(); // full label -> count (disambiguates duplicate method names)
  traverse(ast, {
    Scope(path) {
      if (path.isProgram()) {
        labels.set(path.node, "");
        return;
      }
      // the nearest ancestor scope path with a label
      let parent = path.parentPath;
      while (parent && !labels.has(parent.node)) parent = parent.parentPath;
      const base = parent ? labels.get(parent.node) : "";
      let label = ownLabel(path);
      if (label == null) {
        const kind = path.isFunction()
          ? "fn"
          : path.isCatchClause()
            ? "catch"
            : path.isClass()
              ? "class"
              : path.isSwitchStatement()
                ? "switch"
                : path.isFor() || path.isWhile()
                  ? "loop"
                  : "block";
        const c = counters.get(base) || {};
        c[kind] = (c[kind] || 0) + 1;
        counters.set(base, c);
        label = kind + (c[kind] - 1);
      }
      let full = base ? base + ">" + label : label;
      const n = (seen.get(full) || 0) + 1;
      seen.set(full, n);
      if (n > 1) full += "#" + n;
      labels.set(path.node, full);
    },
  });
  return labels;
}

function bindingKey(labels, scope, name) {
  if (scope.path.isProgram()) return name;
  return labels.get(scope.block) + "|" + name;
}

module.exports = { labelScopes, bindingKey, ownLabel, keyName };
