// Unwrap 13.5.7's IIFE and restore 13.4.0 top-level names from mapping.json.
// usage: node restore.js new.canon.js mapping.json out.js
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inFile, mapFile, outFile] = process.argv;
const { mapping } = JSON.parse(fs.readFileSync(mapFile, "utf8"));
const ast = parser.parse(fs.readFileSync(inFile, "utf8"), { sourceType: "script", errorRecovery: true });

traverse(ast, {
  Program(p) {
    const iife = p.get("body").find((s) => s.isExpressionStatement());
    const fn = iife.get("expression.callee");
    for (const [from, to] of Object.entries(mapping)) {
      if (fn.scope.hasOwnBinding(from)) fn.scope.rename(from, to);
      else console.warn("no binding", from);
    }
    const top = fn.node.body.body.filter((s) => t.isReturnStatement(s));
    if (top.length) throw new Error("top-level return in IIFE; cannot unwrap");
    iife.replaceWithMultiple(fn.node.body.body);
    p.stop();
  },
});
fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
