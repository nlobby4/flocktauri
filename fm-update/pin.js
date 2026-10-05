// Give top-level positional names (v0_N) stable names (Anon_N) so canon.js won't renumber them.
// usage: node pin.js in.js out.js
const fs = require("fs"), parser = require("@babel/parser"), traverse = require("@babel/traverse").default, generate = require("@babel/generator").default;
const [, , inFile, outFile] = process.argv;
const ast = parser.parse(fs.readFileSync(inFile, "utf8"), { sourceType: "script", errorRecovery: true });
traverse(ast, { Program(p) { for (const k of Object.keys(p.scope.bindings)) if (/^v0_\d+$/.test(k)) p.scope.rename(k, "Anon_" + k.slice(3)); p.stop(); } });
fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
