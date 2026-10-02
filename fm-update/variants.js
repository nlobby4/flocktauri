// 3-way merge mod variant methods (e.g. bindEventsBoardEnabled) against upstream's change to the
// original method (base bindEventsBoard -> new bindEventsBoard), writing results into resolved.js.
// usage: node variants.js resolved.js out.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const { alignTo } = require("./align");

const [, , inF, outF] = process.argv;
const VARIANTS = {
  "UserInterface.bindEventsBoard": ["bindEventsBoardEnabled", "bindEventsBoardDisabled"],
  "UserInterface.onWheelMove": ["onWheelMoveDefault", "onWheelMoveFaster", "onWheelMoveCap"],
  "UserInterface.recommendedSync": ["recommendedSyncDefault", "recommendedSyncModified"],
  "UserInterface.bindEventsRoom": ["bindEventsRoomModified"],
  "UserInterface.fitToScreen": ["fitToScreenModified"],
  "UserInterface.centerBoard": ["centerBoardModified"],
  "UserInterface.flipView": ["flipViewEnabled", "flipViewDisabled"],
  "Board.changeRotation": ["changeRotationDefault", "changeRotationPositionAware"],
  "PenSurface.setBrushOptionReadOnly": ["setBrushOptionReadOnlyModified"],
};

const parse = (s) => parser.parse(s, { sourceType: "script", errorRecovery: true });
function member(ast, cls, name) {
  for (const s of ast.program.body)
    if (t.isClassDeclaration(s) && s.id.name === cls)
      for (const m of s.body.body) if (m.key && (m.key.name || m.key.value) === name) return m;
  return null;
}
const base = parse(fs.readFileSync("base-13.4.0.deob.wc.prep.js", "utf8"));
const neu = parse(fs.readFileSync("new-13.5.7.canon.js", "utf8"));
const src = fs.readFileSync(inF, "utf8");
const ast = parse(src);

// Rename the method key so all three texts share one name during the merge.
const asName = (m, name) => {
  const c = t.cloneNode(m, true);
  c.key = t.identifier(name);
  return generate(c, { comments: true }).code;
};
function diff3(mine, b, theirs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "var-"));
  const [a, o, n] = ["mod", "base", "new"].map((x) => path.join(dir, x));
  fs.writeFileSync(a, mine + "\n");
  fs.writeFileSync(o, b + "\n");
  fs.writeFileSync(n, theirs + "\n");
  let conflicts = 0;
  try {
    execFileSync("git", ["merge-file", "--diff-algorithm=histogram", "--diff3", "-L", "mod", "-L", "base", "-L", "new", a, o, n]);
  } catch (e) {
    conflicts = e.status;
  }
  const r = fs.readFileSync(a, "utf8");
  fs.rmSync(dir, { recursive: true });
  return { code: r, conflicts };
}

const edits = [];
for (const [orig, vars] of Object.entries(VARIANTS)) {
  const [cls, name] = orig.split(".");
  const b = member(base, cls, name), n = member(neu, cls, name);
  for (const v of vars) {
    const m = member(ast, cls, v);
    if (!m) { console.log(`missing ${cls}.${v}`); continue; }
    const bt = asName(b, v), nt = asName(n, v), mt = generate(m, { comments: true }).code;
    const r = diff3(alignTo(bt, mt, true), alignTo(bt, bt, true), alignTo(bt, nt, true));
    console.log(`${cls}.${v}: ${r.conflicts ? r.conflicts + " CONFLICTS" : "merged clean"}`);
    const resolvedF = `variant-${v}.resolved.js`;
    if (r.conflicts && fs.existsSync(resolvedF)) {
      console.log(`  using hand resolution ${resolvedF}`);
      edits.push({ start: m.start, end: m.end, code: fs.readFileSync(resolvedF, "utf8").replace(/\n$/, "") });
    } else if (r.conflicts) fs.writeFileSync(`variant-${v}.conflict.js`, r.code);
    else edits.push({ start: m.start, end: m.end, code: r.code.replace(/\n$/, "") });
  }
}
let out = src;
for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.code + out.slice(e.end);
fs.writeFileSync(outF, out);
