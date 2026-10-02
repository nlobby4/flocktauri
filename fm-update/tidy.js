// Light cleanup after rename.js; no logic changes. Every removal is listed in the report.
// usage: node tidy.js in.js out.js report.txt
//
//  - `if (x);` followed by a bare block (deobfuscation leftover) -> the block's statements
//  - empty `else {}`
//  - a statement that repeats the previous one with a pure call (`var c = this.getChannelString(a, b); c = this.getChannelString(a, b);`)
//  - placeholder comments ("// ... [existing ...] ...", "// ...existing code...", "// Rest of the method remains unchanged")
//  - comment lines repeated inside one comment run, and own-line copies of the previous line's trailing comment
//  - commented-out code
//  - console.log calls whose message carries an emoji (debug spam); console.warn/error stay
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inFile, outFile, reportFile] = process.argv;
const src = fs.readFileSync(inFile, "utf8");
const lines = src.split("\n");
const ast = parser.parse(src, { sourceType: "script" });
const report = [];
const where = (n) => `L${n.loc ? n.loc.start.line : "?"}`;
const code = (n) => generate(n, { comments: false }).code;

// Calls with no side effects that are safe to drop when repeated.
const PURE_METHODS = new Set(["getChannelString"]);
const isPure = (e) =>
  t.isIdentifier(e) ||
  t.isThisExpression(e) ||
  t.isLiteral(e) ||
  (t.isMemberExpression(e) && !e.computed && isPure(e.object)) ||
  (t.isCallExpression(e) &&
    t.isMemberExpression(e.callee) &&
    t.isThisExpression(e.callee.object) &&
    t.isIdentifier(e.callee.property) &&
    PURE_METHODS.has(e.callee.property.name) &&
    e.arguments.every(isPure)) ||
  (t.isBinaryExpression(e) &&
    /^(===|!==)$/.test(e.operator) &&
    isPure(e.left) &&
    isPure(e.right)) ||
  (t.isLogicalExpression(e) && isPure(e.left) && isPure(e.right)) ||
  (t.isUnaryExpression(e) && e.operator === "!" && isPure(e.argument));
// Identifiers an expression reads; reading an undeclared one throws, so those must stay.
const reads = (e) =>
  t.isIdentifier(e)
    ? [e.name]
    : t.isMemberExpression(e)
      ? reads(e.object).concat(e.computed ? reads(e.property) : [])
      : t.isBinaryExpression(e) || t.isLogicalExpression(e)
        ? reads(e.left).concat(reads(e.right))
        : t.isUnaryExpression(e)
          ? reads(e.argument)
          : t.isCallExpression(e)
            ? reads(e.callee).concat(...e.arguments.map(reads))
            : [];
const safeTest = (p, e) =>
  isPure(e) && reads(e).every((n) => p.scope.hasBinding(n) || n === "undefined");
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F900}-\u{1F9FF}]/u;

// ---------- statements (run after comments are stripped, so emptied blocks count as empty) ----------
function cleanStatements() {
  traverse(ast, {
    IfStatement(p) {
      const n = p.node;
      // `else if (x) {}` / `if (x) {}` with nothing in it and a side-effect-free test
      if (
        t.isBlockStatement(n.consequent) &&
        n.consequent.body.length === 0 &&
        !n.consequent.innerComments?.length &&
        !n.alternate &&
        safeTest(p, n.test)
      ) {
        report.push(`${where(n)} empty \`if (${code(n.test)}) {}\` removed`);
        if (p.parentPath.isIfStatement() && p.parentPath.node.alternate === n)
          p.parentPath.node.alternate = null;
        else p.remove();
        return;
      }
      if (
        n.alternate &&
        t.isBlockStatement(n.alternate) &&
        n.alternate.body.length === 0 &&
        !n.alternate.innerComments?.length
      ) {
        report.push(`${where(n.alternate)} empty else {} removed`);
        n.alternate = null;
      }
      // `if (x);` + `{ ... }`: the test is only read, the block always runs
      if (t.isEmptyStatement(n.consequent) && !n.alternate && safeTest(p, n.test)) {
        const next = p.getSibling(p.key + 1);
        if (next.node && t.isBlockStatement(next.node)) {
          report.push(
            `${where(n)} \`${code(n)}\` removed; the block after it always ran and still does`,
          );
          const lexical = next.node.body.some(
            (s) =>
              (t.isVariableDeclaration(s) && s.kind !== "var") ||
              t.isClassDeclaration(s) ||
              t.isFunctionDeclaration(s),
          );
          if (!lexical) next.replaceWithMultiple(next.node.body);
          p.remove();
        }
      }
    },
    "BlockStatement|Program"(p) {
      const body = p.node.body;
      for (let i = 1; i < body.length; i++) {
        const a = asg(body[i - 1]),
          b = asg(body[i]);
        if (a && b && a.name === b.name && a.code === b.code && isPure(b.expr)) {
          report.push(`${where(body[i])} repeated \`${code(body[i])}\` removed`);
          p.get("body." + i).remove();
          return;
        }
      }
    },
    ExpressionStatement(p) {
      const e = p.node.expression;
      if (!t.isCallExpression(e) || !t.isMemberExpression(e.callee)) return;
      const { object, property } = e.callee;
      if (
        !t.isIdentifier(object, { name: "console" }) ||
        !t.isIdentifier(property, { name: "log" })
      )
        return;
      const text = e.arguments
        .map((a) =>
          t.isStringLiteral(a)
            ? a.value
            : t.isTemplateLiteral(a)
              ? a.quasis.map((q) => q.value.cooked).join("")
              : "",
        )
        .join(" ");
      if (!EMOJI.test(text)) return;
      // the arguments must be free of side effects to drop the call
      let effects = false;
      p.traverse({
        "CallExpression|AssignmentExpression|UpdateExpression|NewExpression|AwaitExpression"(q) {
          if (q.node === e) return;
          const c = q.node.callee;
          if (
            q.isCallExpression() &&
            t.isMemberExpression(c) &&
            t.isIdentifier(c.property) &&
            /^(join|toFixed|toString|toUpperCase|toLowerCase)$/.test(c.property.name)
          )
            return;
          effects = true;
        },
      });
      if (effects) return;
      if (!p.parentPath.isBlockStatement() && !p.parentPath.isProgram()) return;
      report.push(`${where(p.node)} debug log removed: ${code(p.node).slice(0, 100)}`);
      p.remove();
    },
  });
}
function asg(s) {
  if (
    t.isVariableDeclaration(s) &&
    s.declarations.length === 1 &&
    t.isIdentifier(s.declarations[0].id) &&
    s.declarations[0].init
  )
    return {
      name: s.declarations[0].id.name,
      expr: s.declarations[0].init,
      code: code(s.declarations[0].init),
    };
  if (
    t.isExpressionStatement(s) &&
    t.isAssignmentExpression(s.expression, { operator: "=" }) &&
    t.isIdentifier(s.expression.left)
  )
    return {
      name: s.expression.left.name,
      expr: s.expression.right,
      code: code(s.expression.right),
    };
  return null;
}

// ---------- comments ----------
const drop = new Set(); // comment start offsets
const all = ast.comments;
const lineStartsWithComment = (c) =>
  /^\s*$/.test(src.slice(src.lastIndexOf("\n", c.start - 1) + 1, c.start));

const PLACEHOLDER = (v) => {
  const s = v.trim();
  if (/^\.\.\./.test(s) && /existing|implementation|code|unchanged|same/i.test(s)) return true;
  if (/\.\.\.\s*$/.test(s) && /\b(existing|rest of)\b/i.test(s)) return true;
  if (/\brest of\b.*\b(remains|unchanged|the same|existing)\b/i.test(s)) return true;
  if (/^existing .*\bcode\b.*(unchanged|\.\.\.)/i.test(s)) return true;
  if (/^updated \w+ method\b/i.test(s)) return true;
  if (/^inside the \w+ method, where\b/i.test(s)) return true;
  return false;
};
for (const c of all) {
  if (PLACEHOLDER(c.value)) {
    drop.add(c.start);
    report.push(
      `L${c.loc.start.line} placeholder comment removed: //${c.value.trim().slice(0, 80)}`,
    );
  }
}

// Runs of own-line `//` comments, allowing blank lines inside a run.
const runs = [];
for (const c of all) {
  if (c.type !== "CommentLine" || !lineStartsWithComment(c)) {
    runs.push(null);
    continue;
  }
  const prev = runs.length && runs[runs.length - 1];
  const gapOk =
    prev &&
    lines.slice(prev.end.loc.start.line, c.loc.start.line - 1).every((l) => /^\s*$/.test(l));
  if (prev && gapOk) {
    prev.items.push(c);
    prev.end = c;
  } else runs.push({ items: [c], end: c });
}

// repeated lines within a run; own-line copies of the previous line's trailing comment
for (const r of runs.filter(Boolean)) {
  const seen = new Set();
  for (const c of r.items) {
    const v = c.value.trim();
    if (v && seen.has(v) && !drop.has(c.start)) {
      drop.add(c.start);
      report.push(`L${c.loc.start.line} repeated comment removed: //${v.slice(0, 80)}`);
    }
    seen.add(v);
  }
}
for (let i = 1; i < all.length; i++) {
  const a = all[i - 1],
    b = all[i];
  if (
    a.type === "CommentLine" &&
    b.type === "CommentLine" &&
    !lineStartsWithComment(a) &&
    lineStartsWithComment(b) &&
    b.loc.start.line === a.loc.start.line + 1 &&
    a.value.trim() === b.value.trim() &&
    !drop.has(b.start)
  ) {
    drop.add(b.start);
    report.push(
      `L${b.loc.start.line} copy of the trailing comment above removed: //${b.value.trim().slice(0, 80)}`,
    );
  }
}

// commented-out code
function parsesAsCode(text) {
  const s = text.trim();
  if (!s || !/[;(){}=]/.test(s)) return false;
  const tryParse = (x) => {
    try {
      const r = parser.parse(x, {
        sourceType: "script",
        allowReturnOutsideFunction: true,
        errorRecovery: false,
      });
      return (
        r.program.body.length > 0 &&
        !r.program.body.every(
          (b) =>
            t.isExpressionStatement(b) &&
            (t.isIdentifier(b.expression) || t.isLiteral(b.expression)),
        )
      );
    } catch (e) {
      return false;
    }
  };
  if (tryParse(s)) return true;
  if (tryParse("class X {" + s + "}")) return true; // a method
  if (tryParse("({" + s.replace(/,\s*$/, "") + "})") && /:/.test(s)) return true; // object members
  if (tryParse("{" + s + "\n}")) return true; // a block's opening part, closed later
  if (tryParse("x = {" + s + "\n}")) return true;
  if (tryParse(s + "\n}")) return true; // a block's closing part
  if (tryParse("{" + s)) return true;
  return false;
}
let deadRuns = 0;
for (const r of runs.filter(Boolean)) {
  const items = r.items.filter((c) => !drop.has(c.start));
  if (!items.length) continue;
  // split the run at blank lines into paragraphs
  const paras = [];
  let cur = [];
  for (const c of items) {
    if (cur.length && c.loc.start.line !== cur[cur.length - 1].loc.start.line + 1) {
      paras.push(cur);
      cur = [];
    }
    cur.push(c);
  }
  paras.push(cur);
  // a paragraph is code when it parses, or when at least half its lines are complete statements
  const lineIsCode = (c) => /[;{}]\s*$|^\s*[}\])]/.test(c.value) && parsesAsCode(c.value);
  const isCode = paras.map(
    (ps) =>
      parsesAsCode(ps.map((c) => c.value).join("\n")) ||
      ps.every((c) => /^\s*[}\])]+[;,)]*\s*$/.test(c.value)) ||
      ps.filter(lineIsCode).length * 2 >= ps.length,
  );
  // keep usage examples ("Can be called from anywhere like:")
  paras.forEach((ps, i) => {
    if (ps.some((c) => /:\s*$/.test(c.value) && !/[;{}]\s*$/.test(c.value))) isCode[i] = false;
  });
  const codeLines = paras.reduce((n, ps, i) => n + (isCode[i] ? ps.length : 0), 0);
  const total = items.length;
  if (codeLines === 0) continue;
  // a whole run that is mostly code goes; its prose lines are notes on that dead code
  const wholeRun = parsesAsCode(items.map((c) => c.value).join("\n")) || codeLines / total >= 0.6;
  const victims = wholeRun ? items : paras.filter((_, i) => isCode[i]).flat();
  for (const c of victims) drop.add(c.start);
  deadRuns++;
  report.push(
    `L${items[0].loc.start.line}-${items[items.length - 1].loc.start.line} commented-out code removed (${victims.length} lines): //${victims[0].value.trim().slice(0, 70)}`,
  );
}

// strip dropped comments from every node
traverse(ast, {
  enter(p) {
    for (const k of ["leadingComments", "trailingComments", "innerComments"]) {
      const cs = p.node[k];
      if (cs && cs.length) p.node[k] = cs.filter((c) => !drop.has(c.start));
    }
  },
});
ast.comments = all.filter((c) => !drop.has(c.start));

// removals can empty an enclosing block, so repeat until nothing changes
for (let n = -1; n !== report.length;) {
  n = report.length;
  cleanStatements();
}
fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
fs.writeFileSync(reportFile, report.join("\n") + "\n");
console.log(
  `tidy: ${report.length} report lines (${deadRuns} commented-out code runs, ${drop.size} comments dropped)`,
);
