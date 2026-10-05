// Put 13.5.10's top-level names into final.canon.js's namespace: name the declarations new in
// 13.5.10, then turn the pinned Anon_N back into v0_N (same numbering as final.canon.js).
// usage: node align10.js new-13.5.10.canon.js new-13.5.10.aligned.js   (also new-13.5.7.pin.js -> base)
const fs = require("fs"), parser = require("@babel/parser"), traverse = require("@babel/traverse").default, generate = require("@babel/generator").default;
const [, , inFile, outFile] = process.argv;
const NEW = {
  v0_0: "ContextMenu", v0_1: "ReorderableImageGrid", v0_2: "LoginDialog", v0_3: "UserProfileDialog",
  v0_4: "ProfileDialog", v0_5: "EditProfileDialog", v0_6: "toHexColor", v0_7: "stripBBCode",
  v0_8: "isValidEmail", v0_9: "copyToClipboard", v0_10: "copyToClipboardFallback",
  v0_11: "IMAGE_DATA_URL_RE", v0_12: "safeImageDataURL", v0_13: "imageSelectedEvent",
  v0_14: "showcaseReorderedEvent", v0_15: "CmdPING", v0_16: "CmdLEFT", v0_17: "CmdBANNED",
};
const ast = parser.parse(fs.readFileSync(inFile, "utf8"), { sourceType: "script", errorRecovery: true });
traverse(ast, {
  Program(p) {
    const s = p.scope;
    const pinned = Object.keys(s.bindings).some((k) => /^Anon_/.test(k));
    if (!pinned) throw new Error("expected Anon_N names");
    const isNew = Object.keys(s.bindings).some((k) => k === "v0_17");
    if (isNew) for (const [a, b] of Object.entries(NEW)) {
      if (s.hasBinding(b)) throw new Error(`${b} already bound`);
      s.rename(a, b);
    }
    for (const k of Object.keys(s.bindings)) if (/^Anon_\d+$/.test(k)) s.rename(k, "v0_" + k.slice(5));
    p.stop();
  },
});
fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
