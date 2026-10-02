// Port 13.4.0-style code to 13.5.7's click storage: clickX/clickY parallel arrays -> clicks: [{x, y}].
// Also new Array() -> [] (13.5.7 source style). Reports any clickX/clickY use it can't rewrite.
// usage: node prep.js in.js out.js
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inFile, outFile] = process.argv;
const ast = parser.parse(fs.readFileSync(inFile, "utf8"), { sourceType: "script", errorRecovery: true });

const isXY = (n, which) =>
  t.isMemberExpression(n) && !n.computed && t.isIdentifier(n.property, { name: which });
const clicksOf = (m) => t.memberExpression(t.cloneNode(m.object), t.identifier("clicks"));
const same = (a, b) => generate(a).code === generate(b).code;
const axis = { clickX: "x", clickY: "y" };

traverse(ast, {
  NewExpression(p) {
    if (t.isIdentifier(p.node.callee, { name: "Array" }) && p.node.arguments.length === 0)
      p.replaceWith(t.arrayExpression([]));
  },
});

traverse(ast, {
  // Statement-level pairs first so the Y half can be dropped.
  ExpressionStatement(p) {
    const e = p.node.expression;
    // E.clickX = [] / F.clickX ; E.clickY = ... -> E.clicks = [] / F.clicks
    if (t.isAssignmentExpression(e, { operator: "=" }) && (isXY(e.left, "clickX") || isXY(e.left, "clickY"))) {
      const isY = isXY(e.left, "clickY");
      const r = e.right;
      const rhsOk = (t.isArrayExpression(r) && r.elements.length === 0) || isXY(r, isY ? "clickY" : "clickX");
      if (rhsOk) {
        if (isY) return p.remove();
        e.left = clicksOf(e.left);
        e.right = t.isArrayExpression(r) ? r : clicksOf(r);
        return;
      }
    }
    // E.clickX.push(a); E.clickY.push(b) -> E.clicks.push({x: a, y: b})
    if (t.isCallExpression(e) && t.isMemberExpression(e.callee) && isXY(e.callee.object, "clickX") &&
        t.isIdentifier(e.callee.property, { name: "push" }) && e.arguments.length === 1) {
      const next = p.getSibling(p.key + 1);
      const ne = next.node && next.node.expression;
      if (ne && t.isCallExpression(ne) && t.isMemberExpression(ne.callee) && isXY(ne.callee.object, "clickY") &&
          same(ne.callee.object.object, e.callee.object.object) && ne.arguments.length === 1) {
        const pt = t.objectExpression([
          t.objectProperty(t.identifier("x"), e.arguments[0]),
          t.objectProperty(t.identifier("y"), ne.arguments[0]),
        ]);
        p.replaceWith(t.expressionStatement(t.callExpression(
          t.memberExpression(clicksOf(e.callee.object), t.identifier("push")), [pt])));
        next.remove();
      }
    }
  },
  ObjectProperty(p) {
    const k = p.node.key;
    if (!p.node.computed && t.isIdentifier(k) && (k.name === "clickX" || k.name === "clickY") && isXY(p.node.value, k.name)) {
      if (k.name === "clickY") return p.remove();
      p.node.key = t.identifier("clicks");
      p.node.value = clicksOf(p.node.value);
    }
  },
  MemberExpression: {
    exit(p) {
      const n = p.node;
      const which = isXY(n, "clickX") ? "clickX" : isXY(n, "clickY") ? "clickY" : null;
      if (!which) return;
      const par = p.parent;
      // E.clickX[i] -> E.clicks[i].x
      if (t.isMemberExpression(par) && par.object === n && par.computed) {
        p.parentPath.replaceWith(t.memberExpression(
          t.memberExpression(clicksOf(n), par.property, true), t.identifier(axis[which])));
        return;
      }
      // E.clickX.length -> E.clicks.length
      if (t.isMemberExpression(par) && par.object === n && t.isIdentifier(par.property, { name: "length" })) {
        p.replaceWith(clicksOf(n));
        return;
      }
      // getLimits(E.clickX) -> getLimits(E.clicks.map((p) => p.x))
      if (t.isCallExpression(par) && t.isIdentifier(par.callee, { name: "getLimits" })) {
        const q = t.identifier("_0xpt");
        p.replaceWith(t.callExpression(t.memberExpression(clicksOf(n), t.identifier("map")),
          [t.arrowFunctionExpression([q], t.memberExpression(q, t.identifier(axis[which])))]));
        return;
      }
    },
  },
});

const out = generate(ast, { comments: true }).code;
fs.writeFileSync(outFile, out);
const left = out.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /\.click[XY]\b|\bclick[XY]\s*:/.test(l));
console.log(`${inFile}: ${left.length} unconverted clickX/clickY uses`);
for (const [i, l] of left) console.log(`  ${i}: ${l.trim()}`);
