// Align local variable names of `other` to `base` for one merge unit so an inserted local
// doesn't renumber everything after it. Matched bindings take base's name; unmatched ones get
// unique _0x names (re-canonicalized later).
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

let fresh = 0;
const LOCAL = /^v\d+_\d+$/;
const norm = (s) => s.replace(/\bv\d+_\d+\b/g, "_").replace(/\s+/g, " ").slice(0, 400);

function parseUnit(src, isMember) {
  const text = isMember ? `class __U__ {\n${src}\n}` : src;
  return parser.parse(text, { sourceType: "script", errorRecovery: true });
}
function unparse(ast, isMember) {
  let code = generate(ast, { comments: true }).code;
  if (isMember) code = code.replace(/^class __U__ \{\n?/, "").replace(/\n?\}\s*$/, "");
  return code;
}
const crypto = require("crypto");
function scopePath(p) {
  const parts = [];
  for (let q = p; q; q = q.parentPath) {
    if (!q.isFunction() && !q.isClass()) continue;
    let label = q.node.type;
    if (q.node.key) label += ":" + (q.node.key.name || q.node.key.value);
    else if (q.node.id && !LOCAL.test(q.node.id.name)) label += ":" + q.node.id.name;
    else if (q.parentPath && q.parentPath.isCallExpression()) label += ":" + norm(generate(q.parentPath.node.callee).code).slice(0, 60) + "#" + q.parentPath.node.arguments.indexOf(q.node);
    parts.push(label);
  }
  return parts.reverse().join(">");
}
function bindings(ast, src) {
  const out = [];
  traverse(ast, {
    Scope(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) {
        if (!LOCAL.test(name)) continue;
        if (p.isClassDeclaration() && b.identifier === p.node.id) continue;
        let sig;
        const bp = b.path;
        if (b.kind === "param") {
          const fn = bp.getFunctionParent() || bp.parentPath;
          const idx = fn.node.params ? fn.node.params.indexOf(bp.node) : -1;
          sig = `param${idx}/${fn.node.params ? fn.node.params.length : 0}:` + norm(src.slice(fn.node.start, Math.min(fn.node.end, fn.node.start + 160)));
        } else {
          sig = b.kind + ":" + norm(generate(bp.node).code);
        }
        if (b.kind === "param") {
          const fn = bp.getFunctionParent() || bp.parentPath;
          sig = `param${fn.node.params ? fn.node.params.indexOf(bp.node) : -1}@` + scopePath(fn);
        }
        out.push({ name, scope: p.scope, sig, kind: b.kind, path: scopePath(p), start: b.identifier.start });
      }
    },
  });
  out.sort((a, b) => a.start - b.start);
  return out;
}
function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i].sig === b[j].sig ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i].sig === b[j].sig) pairs.push([i, j]), i++, j++;
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

function alignTo(baseSrc, otherSrc, isMember) {
  let bAst, oAst;
  try {
    bAst = parseUnit(baseSrc, isMember);
    oAst = parseUnit(otherSrc, isMember);
  } catch (e) {
    return otherSrc;
  }
  const B = bindings(bAst, isMember ? `class __U__ {\n${baseSrc}\n}` : baseSrc);
  const O = bindings(oAst, isMember ? `class __U__ {\n${otherSrc}\n}` : otherSrc);
  const target = new Map();
  const pairs = lcs(B, O);
  for (const [i, j] of pairs) target.set(O[j], B[i].name);
  // fallback: inside each gap between anchors, pair leftovers with same scope path + kind, in order
  const anchors = [[-1, -1], ...pairs, [B.length, O.length]];
  for (let a = 0; a + 1 < anchors.length; a++) {
    const [i0, j0] = anchors[a], [i1, j1] = anchors[a + 1];
    const usedB = new Set();
    for (let j = j0 + 1; j < j1; j++) {
      for (let i = i0 + 1; i < i1; i++) {
        if (usedB.has(i) || B[i].path !== O[j].path || B[i].kind !== O[j].kind) continue;
        usedB.add(i);
        target.set(O[j], B[i].name);
        break;
      }
    }
  }
  const seenFresh = new Map();
  const freshName = (o) => {
    const h = crypto.createHash("md5").update(o.path + "|" + o.sig).digest("hex").slice(0, 8);
    const k = (seenFresh.get(h) || 0) + 1;
    seenFresh.set(h, k);
    return `_0xf${h}${k > 1 ? "_" + k : ""}`;
  };
  // phase 1: everything to unique temps; phase 2: temps to targets
  const temps = O.map((o) => {
    const tmp = `__t${fresh++}`;
    o.scope.rename(o.name, tmp);
    return tmp;
  });
  O.forEach((o, k) => o.scope.rename(temps[k], target.get(o) || freshName(o)));
  return unparse(oAst, isMember);
}
module.exports = { alignTo };
