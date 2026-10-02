// Post-merge ports that don't map onto a single merge unit.
// usage: node post.js in.js out.js
const fs = require("fs");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inF, outF] = process.argv;
const parse = (s) => parser.parse(s, { sourceType: "script", errorRecovery: true });
const gen = (n) => generate(n, { comments: true }).code;
function member(ast, cls, name) {
  for (const s of ast.program.body)
    if (t.isClassDeclaration(s) && s.id.name === cls)
      for (const m of s.body.body) if (m.key && (m.key.name || m.key.value) === name) return m;
  throw new Error(`no ${cls}.${name}`);
}
let src = fs.readFileSync(inF, "utf8");
const edits = [];
const ast = parse(src);
const replaceNode = (node, code) => edits.push({ start: node.start, end: node.end, code });

// 1. Socket.receive: mod's pre-dispatch block goes before commandRegistry.execute.
{
  const mod = parse(fs.readFileSync("mod-13.4.0.wc.prep.js", "utf8"));
  const body = member(mod, "Socket", "receive").body.body;
  const stop = body.findIndex((s) => t.isIfStatement(s) && /v2_2\.command == "CONNECTION"/.test(generate(s.test).code));
  const prelude = body.slice(2, stop); // skip `var v2_1 = this;` and the old decode line
  if (!/parseJSON\(decryptMessage/.test(gen(body[1]))) throw new Error("unexpected mod receive shape");
  const decl = prelude.map(gen).join("\n").match(/\b(?:var|let|const)\s+v2_\d+/g);
  if (decl) console.log("warning: prelude declares", decl);
  const recv = member(ast, "Socket", "receive");
  const exec = recv.body.body.find((s) => /commandRegistry\.execute/.test(gen(s)));
  replaceNode(exec, "// mod: pre-dispatch hooks (ported from 13.4.0 receive)\n" + prelude.map(gen).join("\n") + "\n" + gen(exec));
  console.log(`receive: inserted ${prelude.length} mod statements`);
}

// 2. MESSENGERNEW: drop messages from blocked users.
{
  const m = member(ast, "CmdMESSENGERNEW", "execute");
  const p = m.params[0].name;
  const first = m.body.body[0];
  edits.push({
    start: first.start, end: first.start,
    code: `try {
  const blockedUsers = JSON.parse(localStorage.getItem("blockedUsers")) || [];
  if (${p} && ${p}.message && blockedUsers.includes(${p}.message.fromUsername)) {
    return;
  }
} catch (e) {}
`,
  });
  console.log("MESSENGERNEW: blocked-user filter added");
}

// 3. Custom background: don't let room updates overwrite it.
{
  let n = 0;
  for (const s of ast.program.body) {
    if (!t.isClassDeclaration(s) || !/^Cmd/.test(s.id.name)) continue;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (t.isExpressionStatement(node) && /\.room\.changeBackground\(/.test(generate(node).code)) {
        replaceNode(node, `if (!UI.customBgActive) {\n${gen(node)}\n}`);
        n++;
        return;
      }
      for (const k of Object.keys(node)) if (k !== "loc" && k !== "leadingComments" && k !== "trailingComments") {
        const v = node[k];
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v.type === "string") walk(v);
      }
    };
    walk(s);
  }
  console.log(`customBgActive guards: ${n}`);
}

for (const e of edits.sort((a, b) => b.start - a.start)) src = src.slice(0, e.start) + e.code + src.slice(e.end);
// 4. 13.5.7 renamed the broadcast command BROADCAST -> BC (Transfer("BROADCAST") target type is unchanged).
{
  const before = src;
  src = src.replace(/(\w+)\.command === "BROADCAST"/g, '($1.command === "BC" || $1.command === "BROADCAST")');
  src = src.replace(/command: "BROADCAST",/g, 'command: "BC",');
  console.log("BROADCAST->BC edits:", (before.match(/command === "BROADCAST"|command: "BROADCAST",/g) || []).length);
}
// 5. App titles: flockmoD (clientName is sent to the server, so it stays "FlockMod").
src = src.replace(/(\$\(document\)\.prop\("title", (?:"#" \+ [^)]*? \+ )?)"( - )?FlockMod"/g, (m, a, b) => a + '"' + (b || "") + 'flockmoD"');
src = src.replace('window.history.pushState("", "FlockMod"', 'window.history.pushState("", "flockmoD"');
src = src.replace('"Initializing FlockMod..."', '"Initializing flockmoD..."');
fs.writeFileSync(outF, src);
