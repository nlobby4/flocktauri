// Propose real names for every canon-named binding (v<d>_<n>) and write cleanup-names.json.
// usage: node name-gen.js final.canon.js cleanup-names.json
//
// Top-level names come from TOP_LEVEL below (picked by hand). Locals are named from how each
// binding is used: its initializer, what it is assigned to, which callback slot it sits in,
// which members are read off it, and the names other code passes in the same argument slot.
// Every pick goes through rename.js's safety check, so a name never captures or shadows.
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const { makeRenamer, isCanon } = require("./rename");

const [, , inFile, outFile] = process.argv;

// Hand-picked names for the 13.5.7 top-level classes/functions and nested function declarations.
const TOP_LEVEL = {
  v0_0: "ExpandOption",
  v0_1: "SelectionModeOption",
  v0_2: "TagManager",
  v0_3: "ImageViewer",
  v0_4: "BBCodeEditor",
  v0_5: "bbcodeToHtml",
  v0_6: "RoomManagerSilencesSubDialog",
  v0_7: "RoomManagerMutesSubDialog",
  v0_8: "ReportDialog",
  v0_9: "FriendsDialog",
  v0_10: "ImageViewerDialog",
  v0_11: "SyncDialog",
  v0_12: "AdminConsoleGallerySubDialog",
  v0_13: "createBlurredThumbnail",
  v0_14: "pixelsEqual",
  v0_15: "truncateToHundredths",
  v0_16: "htmlToText",
  v0_17: "isDigitKeyCode",
  v0_18: "randomInt",
  v0_19: "loadImage",
  v0_20: "toDownloadDataURL",
  v0_21: "toPixelSteps",
  v0_22: "usernameBadgeHtml",
  v0_23: "TransferPreviewManager",
  v0_24: "storedStrokeCensusMin",
  v0_25: "storedArtifactJump",
  v0_26: "CommandHandler",
  v0_27: "CommandRegistry",
  v0_28: "ShortcutCommand",
  v0_29: "SelectToolCommand",
  v0_30: "ToggleDialogCommand",
  v0_31: "ToggleColorDialogCommand",
  v0_32: "AdjustColorCommand",
  v0_33: "StepSliderOptionCommand",
  v0_34: "SetCheckboxOptionCommand",
  v0_35: "SetSliderCheckOptionCommand",
  v0_36: "CycleListOptionCommand",
  v0_37: "UserActionCommand",
  v0_38: "ToggleIgnoreUserCommand",
  v0_39: "CustomActionCommand",
  v0_40: "CustomActionReleaseCommand",
  v0_41: "PickColorBubbleCommand",
  v0_42: "LoadPresetCommand",
  v0_43: "SetBlendModeCommand",
  v0_44: "ToolHoldReleaseCommand",
  v0_45: "ShortcutCommandRegistry",
  v0_46: "ShortcutHandler",
  v0_47: "AdminConsoleCommandsSubDialog",
  v0_48: "AdminConsoleTopUsageSubDialog",
};
// Nested function declarations, by key.
const NESTED = {
  "SaveDialog>saveToGallery>block3|v3_0": "upload",
  "AnimationDialog>play|v2_3": "step",
  "rgb2hex|v1_1": "toHex",
  "v0_13>fn0|v2_5": "drawThumbnail",
  "LocalStorage>exportData|v2_0": "toBlobURL",
  "ConnectionManager>constructor>fn3|v3_1": "continueAfterNegotiation",
  "UserInterface>muteTime>block1>block0|v4_0": "tickMuteTimer",
};

const RESERVED = new Set(
  "break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield await arguments eval undefined NaN Infinity".split(
    " ",
  ),
);
const GENERIC = new Set([
  "value",
  "item",
  "data",
  "obj",
  "result",
  "element",
  "arg",
  "temp",
  "list",
  "str",
  "key",
  "index",
]);

// ---------- name helpers ----------
const lowerFirst = (s) =>
  /^[A-Z]{2,}[a-z]/.test(s)
    ? s.replace(/^[A-Z]+(?=[A-Z][a-z])/, (m) => m.toLowerCase())
    : /^[A-Z0-9_]+$/.test(s)
      ? s.toLowerCase()
      : s[0].toLowerCase() + s.slice(1);
function camel(s) {
  const parts = String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return null;
  return parts
    .map((p, i) => (i ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p.toLowerCase()))
    .join("");
}
function clean(name) {
  if (!name) return null;
  name = String(name)
    .replace(/^[_$]+/, "")
    .replace(/[^\w$]/g, "");
  if (!name) return null;
  if (/^\d/.test(name)) return null;
  name = lowerFirst(name);
  name = segment(name);
  if (RESERVED.has(name))
    name =
      {
        new: "newValue",
        class: "className",
        default: "defaultValue",
        function: "fn",
        delete: "remove",
        this: "self",
        arguments: "args",
        in: "input",
        var: "variable",
        switch: "toggle",
        case: "caseValue",
        for: "target",
        if: "condition",
        return: "returnValue",
        import: "imported",
        export: "exported",
        static: "isStatic",
        enum: "enumValue",
        null: "empty",
        true: "flag",
        false: "flag",
        undefined: "missing",
        typeof: "type",
        do: "action",
      }[name] || null;
  if (!name || name.length > 28 || name.length < 1) return null;
  return name;
}
// "isquickreconnect" -> "isQuickReconnect", using words seen in the file's camelCase names.
const WORDS = new Map();
function learnWords(src) {
  for (const id of src.match(/[A-Za-z][A-Za-z0-9]*/g) || []) {
    if (!/[a-z][A-Z]/.test(id)) continue;
    for (const w of id.split(/(?=[A-Z])/)) {
      const lw = w.toLowerCase();
      if (lw.length >= 2 && /^[a-z]+$/.test(lw)) WORDS.set(lw, (WORDS.get(lw) || 0) + 1);
    }
  }
  for (const [w, c] of WORDS) if (c < 3) WORDS.delete(w);
}
const segCache = new Map();
function segment(name) {
  if (!/^[a-z]{7,}$/.test(name) || WORDS.has(name)) return name;
  if (segCache.has(name)) return segCache.get(name);
  // fewest words, each a known word of 2+ letters
  const best = new Array(name.length + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < name.length; i++) {
    if (!best[i]) continue;
    for (let j = i + 2; j <= name.length; j++) {
      const w = name.slice(i, j);
      if (!WORDS.has(w) || (w.length < 3 && !/^(is|id|to|of|on|by|ui|ip|up|at)$/.test(w))) continue;
      const cand = best[i].concat(w);
      if (!best[j] || cand.length < best[j].length) best[j] = cand;
    }
  }
  const parts = best[name.length];
  const out =
    parts && parts.length > 1 && parts.length <= 4
      ? parts.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("")
      : name;
  segCache.set(name, out);
  return out;
}
function singular(name) {
  if (!name) return null;
  if (/List$/.test(name) && name.length > 4) return name.slice(0, -4);
  if (/ies$/.test(name)) return name.slice(0, -3) + "y";
  if (/(ss|sh|ch|x)es$/.test(name)) return name.slice(0, -2);
  if (/children$/i.test(name)) return name.slice(0, -8) + "child";
  if (/[^s]s$/.test(name) && !/(us|is|ss|Status|status|Options|options|Data|data)$/.test(name))
    return name.slice(0, -1);
  if (/^(data|list|array|items|arr)$/.test(name)) return "item";
  return null;
}
const plural = (n) =>
  !n
    ? null
    : /y$/.test(n) && !/[aeiou]y$/.test(n)
      ? n.slice(0, -1) + "ies"
      : /(s|x|ch|sh)$/.test(n)
        ? n + "es"
        : n + "s";
function stripVerb(name) {
  const m =
    /^(get|create|calculate|load|find|make|build|compute|read|fetch|generate|retrieve|extract|collect|prepare|obtain)([A-Z]\w*)$/.exec(
      name,
    );
  return m ? lowerFirst(m[2]) : null;
}
function fromSelector(sel) {
  if (typeof sel !== "string") return null;
  let m = /^<(\w+)/.exec(sel.trim());
  if (m) {
    const cls = /class=["']([\w-]+)/.exec(sel);
    if (cls) return camel(cls[1]);
    return (
      {
        a: "link",
        img: "img",
        div: "div",
        span: "span",
        input: "input",
        li: "li",
        ul: "list",
        tr: "row",
        td: "cell",
        button: "button",
        canvas: "canvas",
        textarea: "textarea",
        select: "select",
        option: "option",
        label: "label",
        i: "icon",
        p: "paragraph",
        table: "table",
        style: "style",
      }[m[1]] || m[1]
    );
  }
  m =
    /name=["']?([\w-]+)/.exec(sel) ||
    /#([\w-]+)[^#.\s]*\s*$/.exec(sel) ||
    /\.([\w-]+)[^#.\s]*\s*$/.exec(sel) ||
    /#([\w-]+)/.exec(sel) ||
    /\.([A-Za-z][\w-]+)/.exec(sel);
  if (m) return camel(m[1]);
  if (/^[a-z]+$/.test(sel.trim())) return sel.trim();
  return null;
}
// The literal text of a string, or of the leading literal part of a concatenation/template.
function nameOfStr(n) {
  if (t.isStringLiteral(n)) return n.value;
  if (t.isTemplateLiteral(n)) return n.quasis[0].value.cooked;
  if (t.isBinaryExpression(n) && n.operator === "+") return nameOfStr(n.left);
  return null;
}
// For `"...name=\"" + x + ...`: the attribute x is spliced into.
function concatContext(refPath) {
  let p = refPath;
  while (
    p.parentPath &&
    p.parentPath.isBinaryExpression({ operator: "+" }) &&
    p.parentPath.node.right === p.node
  ) {
    const left = p.parentPath.node.left;
    const lit = t.isStringLiteral(left)
      ? left.value
      : t.isBinaryExpression(left) && t.isStringLiteral(left.right)
        ? left.right.value
        : null;
    if (lit == null) return null;
    if (/nth-child\($/.test(lit)) return "index";
    const m = /([\w-]+)=["']?$/.exec(lit) || /([\w-]+)\s*[:=]\s*$/.exec(lit);
    return m ? camel(m[1].replace(/^data-/, "")) : null;
  }
  return null;
}
const VERBS = new Set(
  "set add remove update show hide draw send handle init on toggle apply clear reset create load save open close start stop enable disable select render refresh check validate process parse trigger emit dispatch run execute do make build bind unbind attach detach move resize scroll fetch request register unregister push pop insert delete append prepend replace sync change convert format compute calculate get is has can should will notify log print use try find sort filter map merge split join copy clone fill flip rotate scale translate fade animate play pause resume connect disconnect join leave login logout upload download export import encode decode encrypt decrypt compress decompress mark unmark count".split(
    " ",
  ),
);
// A method name that reads as a noun ("hardwareProperties", "currentWord") names its result.
function nounish(name) {
  const first = name.split(/(?=[A-Z])/)[0];
  return first && !VERBS.has(first) && name.length > 3 && /^[a-z]/.test(name);
}

const CTOR_NAMES = {
  Image: "img",
  Date: "date",
  AdvancedCanvas: "canvas",
  Promise: "promise",
  Uint8Array: "bytes",
  Uint8ClampedArray: "pixels",
  Array: "list",
  Object: "obj",
  RegExp: "regex",
  FileReader: "reader",
  XMLHttpRequest: "xhr",
  WebSocket: "ws",
  MutationObserver: "observer",
  ResizeObserver: "observer",
  IntersectionObserver: "observer",
  Error: "error",
  Blob: "blob",
  FormData: "formData",
  URL: "url",
  URLSearchParams: "params",
  DOMParser: "parser",
  TextEncoder: "encoder",
  TextDecoder: "decoder",
  AbortController: "controller",
  Set: "set",
  Map: "map",
  WeakMap: "map",
  Function: "fn",
  Path2D: "path",
  OffscreenCanvas: "canvas",
  ImageData: "imageData",
  Float32Array: "values",
  Int32Array: "values",
  Uint16Array: "values",
  Uint32Array: "values",
  ArrayBuffer: "buffer",
  DataView: "view",
  Audio: "audio",
  Notification: "notification",
  CustomEvent: "event",
  Event: "event",
  KeyboardEvent: "event",
  MouseEvent: "event",
};

// Builtin call signatures: callee key -> param names by position.
const SIGS = {
  ".drawImage": ["img", "x", "y", "width", "height"],
  ".fillRect": ["x", "y", "width", "height"],
  ".strokeRect": ["x", "y", "width", "height"],
  ".clearRect": ["x", "y", "width", "height"],
  ".rect": ["x", "y", "width", "height"],
  ".getImageData": ["x", "y", "width", "height"],
  ".createImageData": ["width", "height"],
  ".putImageData": ["imageData", "x", "y"],
  ".moveTo": ["x", "y"],
  ".lineTo": ["x", "y"],
  ".translate": ["x", "y"],
  ".rotate": ["angle"],
  ".arc": ["x", "y", "radius", "startAngle", "endAngle"],
  ".fillText": ["text", "x", "y"],
  ".strokeText": ["text", "x", "y"],
  ".measureText": ["text"],
  ".setItem": ["key", "value"],
  ".getItem": ["key"],
  ".removeItem": ["key"],
  ".setTimeout": ["callback", "delay"],
  setTimeout: ["callback", "delay"],
  setInterval: ["callback", "interval"],
  ".text": ["text"],
  ".html": ["html"],
  ".val": ["value"],
  ".addClass": ["className"],
  ".removeClass": ["className"],
  ".hasClass": ["className"],
  ".toggleClass": ["className"],
  ".css": ["property"],
  ".attr": ["attribute"],
  ".prop": ["property"],
  "Math.atan2": ["dy", "dx"],
  "Math.pow": ["base", "exponent"],
  "Math.hypot": ["dx", "dy"],
  parseInt: ["str", "radix"],
  ".getString": ["key", "params"],
  ".toDataURL": ["mimeType", "quality"],
  ".setAttribute": ["attribute", "value"],
  ".getElementById": ["id"],
  ".querySelector": ["selector"],
  ".querySelectorAll": ["selector"],
  ".appendChild": ["child"],
  ".append": ["child"],
  ".push": ["item"],
  ".includes": ["item"],
  ".indexOf": ["item"],
  ".split": ["separator"],
  ".join": ["separator"],
  ".encode": ["text"],
  ".decode": ["bytes"],
  btoa: ["str"],
  atob: ["base64"],
  rgb2hex: ["rgb"],
  hex2rgb: ["hex"],
  rgb2hsv: ["r", "g", "b"],
  hsv2rgb: ["h", "s", "v"],
  rgb2hsl: ["r", "g", "b"],
  hsl2rgb: ["h", "s", "l"],
  escapeHTML: ["text"],
  encryptMessage: ["message", "encryption"],
  decryptMessage: ["message", "encryption"],
  "new Point": ["x", "y"],
  "new Rect": ["x", "y", "width", "height"],
  "new AdvancedCanvas": ["width", "height"],
  "new Icon": ["iconClass"],
  "new Promise": ["executor"],
};

const EVENT_MEMBERS = new Set(
  "preventDefault stopPropagation stopImmediatePropagation which keyCode originalEvent target currentTarget pageX pageY clientX clientY offsetX offsetY key code ctrlKey shiftKey altKey metaKey button buttons touches changedTouches pointerType pressure deltaY deltaX deltaMode pointerId isTrusted relatedTarget dataTransfer clipboardData detail".split(
    " ",
  ),
);
const CTX_MEMBERS = new Set(
  "drawImage fillRect strokeRect clearRect beginPath closePath moveTo lineTo stroke fill arc fillStyle strokeStyle lineWidth globalAlpha globalCompositeOperation putImageData getImageData createImageData save restore translate rotate scale setTransform fillText measureText lineCap lineJoin quadraticCurveTo bezierCurveTo imageSmoothingEnabled filter clip createLinearGradient createRadialGradient shadowBlur shadowColor font textAlign textBaseline".split(
    " ",
  ),
);
const JQ_MEMBERS = new Set(
  "find addClass removeClass toggleClass hasClass html css attr on off one show hide fadeIn fadeOut append prepend empty closest parent children siblings data trigger triggerHandler val prop each remove is eq first last next prev outerWidth outerHeight innerWidth innerHeight offset position scrollTop animate slideUp slideDown".split(
    " ",
  ),
);
const STR_MEMBERS = new Set(
  "split toLowerCase toUpperCase trim startsWith endsWith substring substr charAt charCodeAt replace replaceAll padStart padEnd localeCompare match".split(
    " ",
  ),
);
const ARR_MEMBERS = new Set(
  "push pop shift unshift splice forEach map filter reduce some every sort findIndex concat flat flatMap".split(
    " ",
  ),
);

// ---------- main ----------
const provisional = new Map(); // Identifier node -> {name, w} picked in an earlier round
const source = fs.readFileSync(inFile, "utf8");
learnWords(source);
const ast = parser.parse(source, { sourceType: "script" });
const renamer = makeRenamer(ast);
const targets = renamer.jobs.filter((j) => isCanon(j.name));

// Signature votes: callee key -> [Map(name -> weight)] by position.
const sigVotes = new Map();
function vote(key, i, name, w) {
  if (SIGS[key.replace(/\/\d+$/, "")]) return;
  name = clean(name);
  if (!name) return;
  let arr = sigVotes.get(key);
  if (!arr) sigVotes.set(key, (arr = []));
  const m = arr[i] || (arr[i] = new Map());
  m.set(name, (m.get(name) || 0) + w);
}
function voteA(key, arity, i, name, w) {
  vote(key, i, name, w);
  vote(key + "/" + arity, i, name, w);
}
function sigNameA(key, arity, i) {
  if (SIGS[key]) return sigName(key, i);
  const exact = sigVotes.has(key + "/" + arity) ? sigName(key + "/" + arity, i) : null;
  return (
    exact ||
    (SIGS[key] ? sigName(key, i) : sigVotes.has(key + "/" + arity) ? null : sigName(key, i))
  );
}
function sigName(key, i) {
  const b = SIGS[key];
  if (b && b[i]) return { name: b[i], w: 4 };
  const arr = sigVotes.get(key);
  if (!arr || !arr[i]) return null;
  let best = null,
    total = 0;
  for (const [n, w] of arr[i]) {
    total += w;
    if (!best || w > best.w) best = { name: n, w };
  }
  if (!best || best.w < total * 0.5) return null;
  return { name: best.name, w: Math.min(4, 1 + best.w) };
}
// Class hierarchy, so method signatures are shared only along an inheritance chain.
const classes = new Map(); // class name -> { sup, methods: Set }
const methodDefiners = new Map(); // method name -> number of classes/objects defining it
function buildClassMap(ast) {
  traverse(ast, {
    Class(p) {
      const id = p.node.id && (TOP_LEVEL[p.node.id.name] || p.node.id.name);
      const sup = t.isIdentifier(p.node.superClass)
        ? TOP_LEVEL[p.node.superClass.name] || p.node.superClass.name
        : null;
      const methods = new Set();
      for (const m of p.node.body.body)
        if ((t.isClassMethod(m) || t.isClassProperty(m)) && !m.computed && t.isIdentifier(m.key))
          methods.add(m.key.name);
      if (id) classes.set(id, { sup, methods });
      for (const m of methods) methodDefiners.set(m, (methodDefiners.get(m) || 0) + 1);
    },
    "ObjectMethod|AssignmentExpression"(p) {
      const k = p.isObjectMethod()
        ? !p.node.computed && t.isIdentifier(p.node.key)
          ? p.node.key.name
          : null
        : t.isFunction(p.node.right) && t.isMemberExpression(p.node.left) && !p.node.left.computed
          ? p.node.left.property.name
          : null;
      if (k) methodDefiners.set(k, (methodDefiners.get(k) || 0) + 1);
    },
  });
}
// The topmost class on C's chain that defines method m.
function rootDefiner(cls, m) {
  let root = null;
  for (let c = cls, guard = 0; c && classes.has(c) && guard < 50; c = classes.get(c).sup, guard++)
    if (classes.get(c).methods.has(m)) root = c;
  return root;
}
const enclosingClass = (path) => {
  const c = path.findParent((q) => q.isClass());
  return c && c.node.id ? TOP_LEVEL[c.node.id.name] || c.node.id.name : null;
};
// A member call's key: Class.m for this/self calls and for methods defined once, else the
// builtin ".m" when there is a builtin signature; unrelated same-named methods never share votes.
const propTypes = new Map(); // property name -> class name (when every `.prop = new X` agrees)
const globalTypes = new Map(); // top-level var -> class name
function buildTypeMap(ast) {
  const seen = new Map();
  traverse(ast, {
    AssignmentExpression(p) {
      const { left, right } = p.node;
      if (
        t.isMemberExpression(left) &&
        !left.computed &&
        t.isIdentifier(left.property) &&
        !t.isNullLiteral(right) &&
        !t.isIdentifier(right, { name: "undefined" })
      ) {
        const isNew =
          t.isNewExpression(right) &&
          t.isIdentifier(right.callee) &&
          classes.has(TOP_LEVEL[right.callee.name] || right.callee.name);
        if (!isNew) seen.set(left.property.name, null);
      }
      if (!t.isNewExpression(right) || !t.isIdentifier(right.callee)) return;
      const cls = TOP_LEVEL[right.callee.name] || right.callee.name;
      if (!classes.has(cls)) return;
      if (t.isMemberExpression(left) && !left.computed && t.isIdentifier(left.property)) {
        const k = left.property.name;
        seen.set(k, seen.has(k) && seen.get(k) !== cls ? null : cls);
      } else if (t.isIdentifier(left) && !p.scope.getBinding(left.name)?.scope.parent)
        globalTypes.set(left.name, cls);
    },
    ObjectProperty(p) {
      if (!p.node.computed && t.isIdentifier(p.node.key)) seen.set(p.node.key.name, null);
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (
        t.isIdentifier(id) &&
        t.isNewExpression(init) &&
        t.isIdentifier(init.callee) &&
        p.scope.path.isProgram()
      ) {
        const cls = TOP_LEVEL[init.callee.name] || init.callee.name;
        if (classes.has(cls)) globalTypes.set(id.name, cls);
      }
    },
  });
  for (const [k, v] of seen) if (v) propTypes.set(k, v);
}
function receiverClass(recv, path) {
  if (
    t.isIdentifier(recv) &&
    globalTypes.has(recv.name) &&
    path &&
    !path.scope.getBinding(recv.name)?.scope.parent
  )
    return globalTypes.get(recv.name);
  if (
    t.isMemberExpression(recv) &&
    !recv.computed &&
    t.isIdentifier(recv.property) &&
    propTypes.has(recv.property.name)
  )
    return propTypes.get(recv.property.name);
  return null;
}
function methodKey(m, recv, path) {
  const rc = receiverClass(recv, path);
  if (rc) {
    const r = rootDefiner(rc, m);
    if (r) return r + "." + m;
  }
  const selfish =
    t.isThisExpression(recv) ||
    (t.isIdentifier(recv) &&
      path &&
      (() => {
        const b = path.scope.getBinding(recv.name);
        return b && b.path.isVariableDeclarator() && t.isThisExpression(b.path.node.init);
      })());
  if (selfish && path) {
    const c = enclosingClass(path);
    const r = c && rootDefiner(c, m);
    if (r) return r + "." + m;
  }
  if (SIGS["." + m]) return "." + m;
  if ((methodDefiners.get(m) || 0) === 1) {
    for (const [c, info] of classes) if (info.methods.has(m)) return rootDefiner(c, m) + "." + m;
    return "." + m;
  }
  return null;
}
function calleeKey(node, path) {
  const c = node.callee;
  if (t.isSuper(c) && path) {
    const cls = path.findParent((q) => q.isClass());
    const sup = cls && cls.node.superClass;
    return t.isIdentifier(sup) ? "new " + (TOP_LEVEL[sup.name] || sup.name) : null;
  }
  const pre = t.isNewExpression(node) ? "new " : "";
  if (t.isIdentifier(c)) return pre + c.name;
  if (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.property)) {
    if (
      t.isIdentifier(c.object) &&
      /^(Math|JSON|Object|Array|Number|String|Date|Promise|localStorage|console)$/.test(
        c.object.name,
      )
    )
      return c.object.name + "." + c.property.name;
    if (pre) return null;
    return methodKey(c.property.name, c.object, path);
  }
  return null;
}
// The callee key a function definition answers to.
function definitionKey(fnPath) {
  const n = fnPath.node;
  if (fnPath.isClassMethod()) {
    if (n.kind === "constructor") {
      const cls = fnPath.parentPath.parentPath.node;
      return cls.id ? "new " + (TOP_LEVEL[cls.id.name] || cls.id.name) : null;
    }
    if (n.computed || !t.isIdentifier(n.key)) return null;
    const c = enclosingClass(fnPath);
    const r = c && rootDefiner(c, n.key.name);
    return r ? r + "." + n.key.name : "." + n.key.name;
  }
  if (fnPath.isObjectMethod())
    return n.computed || !t.isIdentifier(n.key)
      ? null
      : (methodDefiners.get(n.key.name) || 0) === 1
        ? "." + n.key.name
        : null;
  if (fnPath.isFunctionDeclaration() && n.id) return TOP_LEVEL[n.id.name] || n.id.name;
  const p = fnPath.parentPath;
  if (p.isAssignmentExpression() && t.isMemberExpression(p.node.left) && !p.node.left.computed)
    return (methodDefiners.get(p.node.left.property.name) || 0) === 1
      ? "." + p.node.left.property.name
      : null;
  if (p.isVariableDeclarator() && t.isIdentifier(p.node.id))
    return TOP_LEVEL[p.node.id.name] || p.node.id.name;
  return null;
}

// Name an expression would naturally give the variable holding it.
function exprName(e, depth = 0) {
  if (!e || depth > 3) return null;
  if (t.isThisExpression(e)) return { name: "self", w: 10 };
  if (t.isAwaitExpression(e)) return exprName(e.argument, depth + 1);
  if (t.isParenthesizedExpression(e)) return exprName(e.expression, depth + 1);
  if (t.isIdentifier(e)) {
    if (!isCanon(e.name))
      return { name: TOP_LEVEL[e.name] ? lowerFirst(TOP_LEVEL[e.name]) : e.name, w: 2 };
    const pv = provisional.get(e);
    return pv && pv.w >= 1 ? { name: pv.name, w: Math.max(0.5, Math.min(pv.w, 4) - 1) } : null;
  }
  if (t.isNewExpression(e) && t.isIdentifier(e.callee)) {
    if (isCanon(e.callee.name) && !TOP_LEVEL[e.callee.name]) return null;
    const c = TOP_LEVEL[e.callee.name] || e.callee.name;
    if (c === "Date") return { name: e.arguments.length ? "date" : "now", w: 5 };
    return { name: CTOR_NAMES[c] || lowerFirst(c), w: 6 };
  }
  if (t.isMemberExpression(e)) {
    if (!e.computed && t.isIdentifier(e.property)) {
      const p = e.property.name;
      if (p === "length") {
        const o = exprName(e.object, depth + 1);
        return { name: o && singular(o.name) ? singular(o.name) + "Count" : "length", w: 3 };
      }
      if (p === "data" && t.isMemberExpression(e.object)) return { name: "pixels", w: 2 };
      if (/^(target|currentTarget)$/.test(p)) return { name: "target", w: 4 };
      if (p === "result" && t.isMemberExpression(e.object)) return { name: "result", w: 3 };
      return { name: p, w: 5 };
    }
    if (e.computed) {
      if (t.isStringLiteral(e.property)) return { name: camel(e.property.value), w: 4 };
      const o = exprName(e.object, depth + 1);
      if (o && singular(o.name)) return { name: singular(o.name), w: 4 };
      return null;
    }
  }
  if (t.isCallExpression(e)) {
    const c = e.callee;
    const a0 = e.arguments[0];
    if (t.isIdentifier(c)) {
      const fn = TOP_LEVEL[c.name] || c.name;
      if (/^(parseInt|parseFloat|Number|String|Boolean)$/.test(fn))
        return a0 ? exprName(a0, depth + 1) : null;
      if (fn === "$" || fn === "jQuery") {
        if (t.isThisExpression(a0)) return { name: "$this", w: 3 };
        const s = fromSelector(nameOfStr(a0));
        if (s) return { name: s, w: 4 };
        if (a0 && t.isMemberExpression(a0) && !a0.computed) return { name: a0.property.name, w: 3 };
        return { name: "element", w: 2 };
      }
      if (fn === "loadImage") return { name: "img", w: 6 };
      if (/^(rgb2hsv)$/.test(fn)) return { name: "hsv", w: 6 };
      if (/^(hex2rgb|hsv2rgb|hsl2rgb)$/.test(fn)) return { name: "rgb", w: 6 };
      if (fn === "rgb2hex") return { name: "hex", w: 6 };
      if (fn === "rgb2hsl") return { name: "hsl", w: 6 };
      if (fn === "dateToObj") return { name: "date", w: 5 };
      if (fn === "escapeHTML") return { name: "escaped", w: 4 };
      if (fn === "fetch") return { name: "response", w: 6 };
      if (/^(setTimeout)$/.test(fn)) return { name: "timeout", w: 5 };
      if (/^(setInterval)$/.test(fn)) return { name: "interval", w: 5 };
      if (fn === "requestAnimationFrame") return { name: "frameId", w: 5 };
      if (fn === "calculateAspectRatioFit") return { name: "fit", w: 5 };
      if (fn === "usernameBadgeHtml") return { name: "usernameHtml", w: 5 };
      if (fn === "bbcodeToHtml") return { name: "html", w: 5 };
      if (fn === "getLengthDescription") return { name: "lengthDescription", w: 5 };
      const sv = stripVerb(fn);
      if (sv) return { name: sv, w: 4 };
      if (/^(is|has|can|should)[A-Z]/.test(fn)) return { name: fn, w: 3 };
      if (/^[a-z]+2[a-z]+$/.test(fn)) return { name: fn.split("2")[1], w: 4 };
      if (/^(atob)$/.test(fn)) return { name: "decoded", w: 3 };
      if (/^(btoa)$/.test(fn)) return { name: "base64", w: 3 };
      if (/^(encryptMessage)$/.test(fn)) return { name: "encrypted", w: 3 };
      if (/^(decryptMessage)$/.test(fn)) return { name: "decrypted", w: 3 };
      return null;
    }
    if (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.property)) {
      const m = c.property.name;
      const objName = () => exprName(c.object, depth + 1);
      if (t.isIdentifier(c.object)) {
        const o = c.object.name;
        if (o === "Math") {
          if (m === "atan2") return { name: "angle", w: 4 };
          if (m === "sqrt" || m === "hypot") return { name: "distance", w: 3 };
          if (m === "random") return { name: "random", w: 2 };
          if (/^(floor|round|ceil|abs|trunc)$/.test(m))
            return a0 ? weaken(exprName(a0, depth + 1)) : null;
          if (m === "max" || m === "min") {
            for (const a of e.arguments) {
              const r = exprName(a, depth + 1);
              if (r && r.name !== "self") return weaken(r);
            }
            return null;
          }
          return null;
        }
        if (o === "JSON")
          return m === "parse"
            ? { name: a0 ? parsedName(a0) : "data", w: 4 }
            : m === "stringify"
              ? { name: "json", w: 4 }
              : null;
        if (o === "Object")
          return m === "keys"
            ? { name: "keys", w: 4 }
            : m === "values"
              ? { name: "values", w: 4 }
              : m === "entries"
                ? { name: "entries", w: 4 }
                : m === "assign"
                  ? { name: "merged", w: 2 }
                  : null;
        if (o === "Date" && m === "now") return { name: "now", w: 5 };
        if (o === "performance" && m === "now") return { name: "now", w: 5 };
        if (o === "localStorage" && m === "getItem")
          return { name: storageName(nameOfStr(a0)) || "stored", w: 5 };
        if (o === "document" && m === "createElement")
          return { name: fromSelector("<" + (nameOfStr(a0) || "div")) || "element", w: 6 };
        if (o === "document" && /^(getElementById|querySelector)$/.test(m))
          return {
            name:
              fromSelector((m === "getElementById" ? "#" : "") + (nameOfStr(a0) || "")) ||
              "element",
            w: 5,
          };
        if (o === "textManager" && m === "getString")
          return { name: textName(nameOfStr(a0)), w: 4 };
        if (o === "Array" && m === "from") return a0 ? exprName(a0, depth + 1) : null;
      }
      switch (m) {
        case "getContext":
          return { name: "ctx", w: 9 };
        case "getImageData":
          return { name: "imageData", w: 7 };
        case "createImageData":
          return { name: "imageData", w: 7 };
        case "toDataURL":
          return { name: "dataUrl", w: 6 };
        case "getBoundingClientRect":
          return { name: "rect", w: 6 };
        case "split":
          return { name: "parts", w: 4 };
        case "join":
          return { name: "joined", w: 2 };
        case "indexOf":
        case "findIndex":
        case "lastIndexOf":
          return { name: "index", w: 5 };
        case "includes":
          return { name: "included", w: 2 };
        case "now":
          return { name: "now", w: 4 };
        case "val":
          return e.arguments.length ? null : { name: "value", w: 3 };
        case "offset":
          return e.arguments.length ? null : { name: "offset", w: 5 };
        case "position":
          return e.arguments.length ? null : { name: "position", w: 5 };
        case "width":
        case "height":
        case "outerWidth":
        case "outerHeight":
        case "innerWidth":
        case "innerHeight":
        case "scrollTop":
          return e.arguments.length ? null : { name: m, w: 5 };
        case "attr":
        case "data":
        case "prop":
        case "css":
          return e.arguments.length === 1 && nameOfStr(a0)
            ? { name: camel(nameOfStr(a0)), w: 4 }
            : null;
        case "find":
        case "closest":
        case "children":
        case "parents":
        case "siblings":
        case "querySelector":
        case "querySelectorAll": {
          const s = fromSelector(nameOfStr(a0));
          if (s) return { name: m === "querySelectorAll" ? plural(s) : s, w: 4 };
          if (m === "find" && a0 && t.isFunction(a0)) {
            const o = objName();
            return o && singular(o.name)
              ? { name: singular(o.name), w: 4 }
              : { name: "found", w: 2 };
          }
          return null;
        }
        case "parent":
          return { name: "parent", w: 3 };
        case "getElementById":
          return { name: fromSelector("#" + (nameOfStr(a0) || "")) || "element", w: 5 };
        case "eq":
        case "first":
        case "last":
        case "get":
          if (m === "get" && a0 && nameOfStr(a0)) return { name: camel(nameOfStr(a0)), w: 4 };
          {
            const o = objName();
            return o ? { name: singular(o.name) || o.name, w: 3 } : null;
          }
        case "pop":
        case "shift":
        case "at": {
          const o = objName();
          return o && singular(o.name) ? { name: singular(o.name), w: 4 } : null;
        }
        case "filter":
        case "slice":
        case "concat":
        case "sort":
        case "reverse":
        case "trim":
        case "toLowerCase":
        case "toUpperCase":
        case "substring":
        case "substr":
        case "replace":
        case "replaceAll":
        case "toFixed":
        case "clone":
        case "cloneNode": {
          const o = objName();
          return o && o.name !== "self" ? weaken(o) : null;
        }
        case "map":
          return { name: "mapped", w: 1 };
        case "match":
        case "exec":
          return { name: "match", w: 4 };
        case "test":
          return { name: "matches", w: 3 };
        case "is":
          return nameOfStr(a0) && /^:\w+$/.test(nameOfStr(a0))
            ? { name: camel(nameOfStr(a0).slice(1)), w: 4 }
            : null;
        case "getString":
          return { name: textName(nameOfStr(a0)), w: 4 };
        case "getItem":
          return { name: storageName(nameOfStr(a0)) || "stored", w: 5 };
        case "json":
          return { name: "data", w: 5 };
        case "text":
          return e.arguments.length ? null : { name: "text", w: 4 };
        case "html":
          return e.arguments.length ? null : { name: "html", w: 4 };
        case "getOption":
        case "getBrushOption":
        case "getParameter":
        case "getGroupOption":
        case "getProperty":
        case "getValue":
          if (nameOfStr(a0)) return { name: camel(nameOfStr(a0)), w: 4 };
          if (t.isMemberExpression(a0) && !a0.computed) return { name: a0.property.name, w: 3 };
          return { name: m === "getValue" ? "value" : "option", w: 2 };
        case "getChannelString":
          return { name: "channel", w: 5 };
        case "getChannelObject":
          return { name: "channel", w: 5 };
        case "createConfirmation":
          return { name: "confirmation", w: 5 };
        case "createController":
          return { name: "controller", w: 5 };
        case "screenToBoard":
          return { name: "boardPos", w: 5 };
        case "getInputPosition":
          return { name: "pos", w: 5 };
        case "getSelected":
          return { name: "selected", w: 4 };
        case "userRank":
          return { name: "rank", w: 4 };
        case "rankToIndex":
          return { name: "rankIndex", w: 4 };
        case "loadFile":
          return { name: "html", w: 4 };
        case "then":
        case "catch":
        case "finally":
          return { name: "promise", w: 2 };
        case "bind":
          return { name: "bound", w: 2 };
        case "getTime":
          return { name: "time", w: 4 };
        case "toString":
          return weaken(objName());
        case "pad":
          return null;
      }
      const sv = stripVerb(m);
      if (sv)
        return {
          name:
            sv === "value" || sv === "data"
              ? objName() && objName().name !== "self"
                ? objName().name + (sv === "value" ? "Value" : "Data")
                : sv
              : sv,
          w: 4,
        };
      if (/^(is|has|can|should)[A-Z]/.test(m)) return { name: m, w: 3 };
      if (/^to[A-Z]/.test(m)) return { name: lowerFirst(m.slice(2)), w: 3 };
      if (nounish(m)) return { name: m, w: 2.5 };
      return null;
    }
  }
  if (t.isObjectExpression(e)) {
    const ks = e.properties
      .map(
        (p) =>
          (t.isObjectProperty(p) || t.isObjectMethod(p)) &&
          !p.computed &&
          (p.key.name || p.key.value),
      )
      .filter(Boolean);
    if (ks.includes("command")) return { name: "message", w: 6 };
    if (ks.length >= 2 && ks.every((k) => /^(x|y)$/.test(k))) return { name: "point", w: 5 };
    if (ks.length >= 2 && ks.every((k) => /^(width|height)$/.test(k)))
      return { name: "size", w: 5 };
    if (ks.length >= 3 && ks.every((k) => /^(r|g|b|a)$/.test(k))) return { name: "rgb", w: 5 };
    if (ks.length >= 3 && ks.every((k) => /^(x|y|width|height|w|h)$/.test(k)))
      return { name: "rect", w: 5 };
    if (
      ks.length >= 2 &&
      ks.every((k) => /^(red|green|blue|yellow|orange|purple|grey|gray)$/.test(k))
    )
      return { name: "colors", w: 5 };
    if (ks.includes("type") && ks.includes("data")) return { name: "payload", w: 3 };
    return { name: ks.length ? "options" : "obj", w: 1 };
  }
  if (t.isArrayExpression(e)) {
    if (e.elements.length && e.elements.every((x) => t.isStringLiteral(x)))
      return { name: "names", w: 1 };
    return { name: "list", w: 1 };
  }
  if (t.isTemplateLiteral(e)) {
    const s = e.quasis.map((q) => q.value.cooked).join("");
    if (/<\w/.test(s)) return { name: "html", w: 4 };
    return { name: "text", w: 2 };
  }
  if (t.isStringLiteral(e)) {
    if (/<\w/.test(e.value)) return { name: "html", w: 4 };
    return null;
  }
  if (t.isBinaryExpression(e)) {
    if (e.operator === "+" && (hasHtml(e.left) || hasHtml(e.right))) return { name: "html", w: 4 };
    if (/^(===|==|!==|!=|<|>|<=|>=|instanceof|in)$/.test(e.operator)) return null;
    if (e.operator === "-" && isMember(e.left, "x") && isMember(e.right, "x"))
      return { name: "dx", w: 5 };
    if (e.operator === "-" && isMember(e.left, "y") && isMember(e.right, "y"))
      return { name: "dy", w: 5 };
    if (e.operator === "/" && (isMember(e.left, "width") || isMember(e.left, "height")))
      return { name: "ratio", w: 2 };
    if (e.operator === "/" && !t.isNumericLiteral(e.right)) return { name: "ratio", w: 1 };
    if (
      e.operator === "*" &&
      t.isMemberExpression(e.right) &&
      t.isIdentifier(e.right.property, { name: "PI" })
    )
      return { name: "radians", w: 3 };
    if (
      e.operator === "/" &&
      t.isMemberExpression(e.right) &&
      t.isIdentifier(e.right.property, { name: "PI" })
    )
      return { name: "degrees", w: 3 };
    if (e.operator === "+" && t.isStringLiteral(e.left) && /^[#@]$/.test(e.left.value)) return null;
    if (/^[-+]$/.test(e.operator) && t.isNumericLiteral(e.right)) {
      const l = exprName(e.left, depth + 1);
      if (l && l.name !== "self") return weaken(l);
    }
    return null;
  }
  if (t.isConditionalExpression(e)) {
    const a = exprName(e.consequent, depth + 1),
      b = exprName(e.alternate, depth + 1);
    if (a && b && a.name === b.name) return a;
    return weaken(a && (!b || a.w >= b.w) ? a : b);
  }
  if (t.isLogicalExpression(e)) {
    if (/^(&&)$/.test(e.operator)) return weaken(exprName(e.right, depth + 1));
    return exprName(e.left, depth + 1) || weaken(exprName(e.right, depth + 1));
  }
  if (t.isFunction(e)) return { name: "callback", w: 1 };
  if (t.isUnaryExpression(e) && e.operator === "!") return null;
  return null;
}
const weaken = (r) => (r ? { name: r.name, w: Math.max(0.5, r.w - 2) } : null);
const hasHtml = (n) =>
  (t.isStringLiteral(n) && /<\/?\w/.test(n.value)) ||
  (t.isTemplateLiteral(n) && n.quasis.some((q) => /<\/?\w/.test(q.value.cooked))) ||
  (t.isBinaryExpression(n) && n.operator === "+" && (hasHtml(n.left) || hasHtml(n.right)));
const isMember = (n, p) =>
  t.isMemberExpression(n) && !n.computed && t.isIdentifier(n.property, { name: p });
function parsedName(a) {
  if (
    t.isCallExpression(a) &&
    t.isMemberExpression(a.callee) &&
    t.isIdentifier(a.callee.property, { name: "getItem" })
  )
    return storageName(nameOfStr(a.arguments[0])) || "stored";
  return "data";
}
function storageName(k) {
  if (!k) return null;
  const c = camel(k.replace(/^fm(?=[A-Z])/, "").replace(/^socketMod_/, ""));
  return c;
}
function textName(k) {
  if (!k) return "text";
  const last = k
    .split(".")
    .pop()
    .replace(/^(lbl|txt|btn|opt|msg|err|tit|title)(?=[A-Z])/, "");
  const c = camel(last);
  return c ? c + "Text" : "text";
}

// ---------- evidence ----------
function addCand(m, r, mult = 1) {
  if (!r) return;
  const n = clean(r.name);
  if (!n) return;
  m.set(n, (m.get(n) || 0) + r.w * mult);
}

// Where a function sits as a callback: returns a describer for its params.
function callbackRole(fnPath) {
  const p = fnPath.parentPath;
  if (p.isCallExpression() || p.isNewExpression()) {
    const node = p.node;
    const argi = node.arguments.indexOf(fnPath.node);
    if (argi < 0) return null;
    const c = node.callee;
    if (p.isNewExpression() && t.isIdentifier(c, { name: "Promise" })) return ["resolve", "reject"];
    if (p.isNewExpression() && t.isIdentifier(c) && /Observer$/.test(c.name))
      return [c.name === "MutationObserver" ? "mutations" : "entries", "observer"];
    if (t.isIdentifier(c)) {
      if (/^(setTimeout|setInterval)$/.test(c.name)) return [];
      if (c.name === "requestAnimationFrame") return ["timestamp"];
      return null;
    }
    if (!t.isMemberExpression(c) || c.computed || !t.isIdentifier(c.property)) return null;
    const m = c.property.name;
    const recv = c.object;
    const recvName = () => {
      const r = exprName(recv);
      return r && r.name !== "self" ? r.name : null;
    };
    if (t.isIdentifier(recv, { name: "$" }) || t.isIdentifier(recv, { name: "jQuery" })) {
      if (m === "each") {
        const coll = node.arguments[0];
        const r = coll ? exprName(coll) : null;
        const sing = r && singular(r.name);
        const arrayish =
          t.isArrayExpression(coll) ||
          (r &&
            /(s|List)$/.test(r.name) &&
            !/(Options|options|settings|Settings|params|Params|data|Data)$/.test(r.name));
        if (sing && arrayish) return ["index", sing];
        if (arrayish) return ["index", "item"];
        return ["key", "value"];
      }
      if (/^(ajax|get|post|getJSON)$/.test(m)) return ["response"];
      if (m === "grep" || m === "map") return ["item", "index"];
      return null;
    }
    if (
      /^(on|one|off|bind|click|change|keydown|keyup|keypress|mousedown|mouseup|mousemove|mouseenter|mouseleave|mouseover|mouseout|dblclick|submit|focus|blur|input|scroll|resize|contextmenu|hover|addEventListener|removeEventListener|trigger|focusin|focusout|select|wheel)$/.test(
        m,
      )
    )
      return ["event"];
    if (m === "each") return ["index", "element"];
    if (/^(forEach|map|filter|some|every|find|findIndex|findLast|flatMap)$/.test(m)) {
      const r = recvName();
      const s = r && singular(r);
      return [s || "item", "index", "array"];
    }
    if (m === "sort") return ["a", "b"];
    if (m === "reduce") {
      const r = recvName();
      const s = r && singular(r);
      return ["acc", s || "item", "index"];
    }
    if (m === "then") {
      if (argi === 1) return ["error"];
      const inner = recv;
      if (t.isCallExpression(inner)) {
        const ic = inner.callee;
        if (t.isIdentifier(ic) && (ic.name === "loadImage" || TOP_LEVEL[ic.name] === "loadImage"))
          return ["img"];
        if (t.isIdentifier(ic, { name: "fetch" })) return ["response"];
        if (t.isMemberExpression(ic) && t.isIdentifier(ic.property, { name: "json" }))
          return ["data"];
        if (t.isMemberExpression(ic) && t.isIdentifier(ic.property, { name: "blob" }))
          return ["blob"];
        if (t.isMemberExpression(ic) && t.isIdentifier(ic.property, { name: "text" }))
          return ["text"];
        if (
          t.isMemberExpression(ic) &&
          t.isIdentifier(ic.property) &&
          /DataURL$/i.test(ic.property.name)
        )
          return ["dataUrl"];
        if (t.isMemberExpression(ic) && t.isIdentifier(ic.property)) {
          const s = stripVerb(ic.property.name);
          if (s) return [s];
        }
      }
      return ["result"];
    }
    if (m === "catch" || m === "fail") return ["error"];
    if (m === "done") return ["response"];
    if (m === "replace" || m === "replaceAll") return ["match", "group1", "group2", "group3"];
    if (m === "toBlob") return ["blob"];
    if (m === "setTimeout" || m === "setInterval") return [];
    return null;
  }
  if (
    p.isAssignmentExpression() &&
    p.node.right === fnPath.node &&
    t.isMemberExpression(p.node.left) &&
    !p.node.left.computed
  ) {
    const n = p.node.left.property.name;
    if (/^on[a-z]+$/.test(n)) return ["event"];
    if (n === "callbackFunction") return ["value"];
  }
  return null;
}

// Collect evidence for one binding.
function evidence(j) {
  const m = new Map();
  const b = j.binding;
  const bp = b.path;
  // declaration
  if (b.kind === "param") {
    const fn = j.scope.path;
    const idx = fn.node.params.findIndex(
      (p) =>
        p === bp.node ||
        (t.isAssignmentPattern(p) && p.left === bp.node) ||
        (t.isRestElement(p) && p.argument === bp.node),
    );
    const role = callbackRole(fn);
    if (role && role[idx])
      addCand(m, {
        name: role[idx],
        w: /^(item|value|element|result|key)$/.test(role[idx]) ? 3 : 7,
      });
    if (!b.referencePaths.length && !b.constantViolations.length)
      addCand(m, { name: "unused", w: 0.4 });
    const dk = definitionKey(fn);
    if (dk && idx >= 0) {
      const s = sigNameA(dk, fn.node.params.length, idx);
      if (s) addCand(m, s);
    }
    const pnode = fn.node.params[idx];
    if (t.isAssignmentPattern(pnode)) {
      const d = pnode.right;
      if (t.isArrayExpression(d)) addCand(m, { name: "list", w: 0.5 });
      if (t.isBooleanLiteral(d)) addCand(m, { name: "flag", w: 0.3 });
      if (t.isStringLiteral(d)) {
        addCand(m, { name: "str", w: 0.3 });
        if (/^[a-z]+$/.test(d.value) && j.scope.path.isClassMethod({ kind: "constructor" }))
          addCand(m, { name: "namespace", w: 0.2 });
      }
    }
    if (t.isRestElement(pnode)) addCand(m, { name: "args", w: 3 });
    // server command handlers: execute(message)
    if (dk === ".execute" && idx === 0) {
      const cls = fn.parentPath.parentPath.node;
      if (
        cls.superClass &&
        t.isIdentifier(cls.superClass) &&
        (TOP_LEVEL[cls.superClass.name] || cls.superClass.name) === "CommandHandler"
      ) {
        addCand(m, { name: "message", w: 6 });
        addCand(m, { name: "data", w: 4 });
      }
    }
    // setFoo(v), isBasicRotation(v), uint8ArrayToBase64(v): one param named after the method's noun
    if (fn.node.params.length === 1 && dk && !dk.startsWith("new ")) {
      const mn = dk.replace(/^\./, "");
      let mm = /(?:By|For|With)([A-Z]\w*)$/.exec(mn);
      const to = /^([a-z][A-Za-z0-9]*?)To[A-Z]/.exec(mn);
      if (to && !VERBS.has(to[1].split(/(?=[A-Z])/)[0]))
        addCand(m, { name: { uint8Array: "bytes", rgb: "rgb", hex: "hex" }[to[1]] || to[1], w: 2 });
      if (mm) addCand(m, { name: lowerFirst(mm[1]), w: 2 });
      else if (
        (mm =
          /^(set|is|has|enable|disable|show|hide|remove|add|select|update|toggle|load|open|delete|validate|parse|format|apply|use)([A-Z]\w*)$/.exec(
            mn,
          ))
      ) {
        const words = mm[2].split(/(?=[A-Z])/);
        const noun =
          mm[1] === "is" || mm[1] === "has"
            ? words[words.length - 1]
            : words.length > 2
              ? words.slice(-2).join("")
              : mm[2];
        addCand(m, { name: lowerFirst(noun), w: 1.8 });
      }
    }
  } else if (bp.isVariableDeclarator()) {
    if (t.isIdentifier(bp.node.id)) addCand(m, exprName(bp.node.init));
    else addCand(m, { name: "value", w: 0.2 });
    // for loops
    const decl = bp.parentPath;
    const loop = decl.parentPath;
    if (
      loop &&
      loop.isForStatement() &&
      loop.node.init === decl.node &&
      t.isNumericLiteral(bp.node.init)
    ) {
      addCand(m, { name: loopIndexName(loop), w: 9 });
    }
    if (
      loop &&
      (loop.isForInStatement() || loop.isForOfStatement()) &&
      loop.node.left === decl.node
    ) {
      if (loop.isForInStatement()) addCand(m, { name: "key", w: 8 });
      else {
        const r = exprName(loop.node.right);
        addCand(m, {
          name:
            (r && singular(r.name)) ||
            (t.isCallExpression(loop.node.right) &&
            t.isIdentifier(loop.node.right.callee.property, { name: "entries" })
              ? "entry"
              : "item"),
          w: 8,
        });
      }
    }
    if (t.isObjectPattern(bp.node.id)) {
      for (const pr of bp.node.id.properties)
        if (
          t.isObjectProperty(pr) &&
          (pr.value === b.identifier ||
            (t.isAssignmentPattern(pr.value) && pr.value.left === b.identifier)) &&
          !pr.computed
        )
          addCand(m, { name: pr.key.name, w: 10 });
    }
  } else if (bp.isCatchClause()) {
    addCand(m, { name: "error", w: 10 });
  } else if (bp.isFunctionDeclaration()) {
    addCand(m, { name: "helper", w: 0.1 });
  } else if (bp.isClassDeclaration()) {
    addCand(m, { name: "Local", w: 0.1 });
  }
  // later assignments
  for (const cv of b.constantViolations) {
    if (
      cv.isAssignmentExpression() &&
      cv.node.operator === "=" &&
      t.isIdentifier(cv.node.left) &&
      cv.node.left.name === j.name
    ) {
      const r = exprName(cv.node.right);
      if (r) addCand(m, r, 0.6);
    }
    if (cv.isAssignmentExpression() && cv.node.operator === "+=" && hasHtml(cv.node.right))
      addCand(m, { name: "html", w: 3 });
  }
  // references
  const members = new Set();
  let called = 0,
    computedKeyOf = null,
    stringCmp = 0,
    numeric = 0;
  for (const r of b.referencePaths) {
    const p = r.parentPath;
    const n = p.node;
    if (p.isMemberExpression() && n.object === r.node) {
      if (!n.computed && t.isIdentifier(n.property)) members.add(n.property.name);
      else if (n.computed && t.isNumericLiteral(n.property)) members.add("[n]");
      continue;
    }
    if (p.isMemberExpression() && n.property === r.node && n.computed) {
      const o = exprName(n.object);
      computedKeyOf = o ? o.name : computedKeyOf || "?";
      continue;
    }
    if ((p.isCallExpression() || p.isNewExpression()) && n.callee === r.node) {
      if (p.isNewExpression()) addCand(m, { name: "ctor", w: 3 });
      else called++;
      continue;
    }
    const ctx = concatContext(r);
    if (ctx) addCand(m, { name: ctx, w: 3 });
    // x flows into a named variable through ?: / || / &&
    {
      let q = r;
      while (
        q.parentPath &&
        ((q.parentPath.isConditionalExpression() && q.parentPath.node.test !== q.node) ||
          q.parentPath.isLogicalExpression())
      )
        q = q.parentPath;
      if (q !== r) {
        const qp = q.parentPath;
        if (qp.isVariableDeclarator() && qp.node.init === q.node && t.isIdentifier(qp.node.id)) {
          const pv = isCanon(qp.node.id.name) ? null : qp.node.id.name;
          if (pv) addCand(m, { name: pv, w: 2.5 });
        } else if (
          qp.isAssignmentExpression() &&
          qp.node.right === q.node &&
          t.isMemberExpression(qp.node.left) &&
          !qp.node.left.computed
        )
          addCand(m, { name: qp.node.left.property.name, w: 2.5 });
        else if (
          qp.isObjectProperty() &&
          qp.node.value === q.node &&
          !qp.node.computed &&
          t.isIdentifier(qp.node.key)
        )
          addCand(m, { name: qp.node.key.name, w: 2 });
      }
    }
    // .attr("src", v), .css("left", v), localStorage.setItem("key", v)
    if (
      p.isCallExpression() &&
      n.arguments[1] === r.node &&
      t.isMemberExpression(n.callee) &&
      t.isIdentifier(n.callee.property) &&
      /^(attr|css|prop|data|setItem|setAttribute|setGroupOption|setProperty)$/.test(
        n.callee.property.name,
      ) &&
      nameOfStr(n.arguments[0]) &&
      /^[\w-]+$/.test(nameOfStr(n.arguments[0]))
    ) {
      addCand(m, {
        name:
          n.callee.property.name === "setItem"
            ? storageName(nameOfStr(n.arguments[0]))
            : camel(nameOfStr(n.arguments[0])),
        w: 3,
      });
    }
    if ((p.isCallExpression() || p.isNewExpression()) && n.arguments.includes(r.node)) {
      const k = calleeKey(n, p);
      if (k) {
        const s = sigNameA(k, n.arguments.length, n.arguments.indexOf(r.node));
        if (s) addCand(m, s, b.kind === "param" ? 1 : 0.6);
      }
      continue;
    }
    if (
      p.isAssignmentExpression() &&
      n.right === r.node &&
      t.isMemberExpression(n.left) &&
      !n.left.computed
    ) {
      const pn = n.left.property.name;
      addCand(m, { name: pn, w: b.kind === "param" ? 6 : 3 });
      continue;
    }
    if (
      p.isAssignmentExpression() &&
      n.right === r.node &&
      t.isIdentifier(n.left) &&
      !isCanon(n.left.name)
    ) {
      addCand(m, { name: n.left.name, w: 2 });
      continue;
    }
    if (
      p.isVariableDeclarator() &&
      n.init === r.node &&
      t.isIdentifier(n.id) &&
      !isCanon(n.id.name)
    ) {
      addCand(m, { name: n.id.name, w: 2 });
      continue;
    }
    if (p.isObjectProperty() && n.value === r.node && !n.computed) {
      const k = n.key.name || n.key.value;
      if (typeof k === "string") addCand(m, { name: camel(k), w: b.kind === "param" ? 4 : 2.5 });
      continue;
    }
    // { top: v + "px" }
    if (
      p.isBinaryExpression({ operator: "+" }) &&
      n.left === r.node &&
      t.isStringLiteral(n.right) &&
      /^(px|%|em|deg)$/.test(n.right.value)
    ) {
      const q = p.parentPath;
      if (
        q.isObjectProperty() &&
        q.node.value === n &&
        !q.node.computed &&
        t.isIdentifier(q.node.key)
      )
        addCand(m, { name: q.node.key.name, w: 3 });
      if (
        q.isCallExpression() &&
        q.node.arguments[1] === n &&
        t.isMemberExpression(q.node.callee) &&
        t.isIdentifier(q.node.callee.property, { name: "css" }) &&
        nameOfStr(q.node.arguments[0])
      )
        addCand(m, { name: camel(nameOfStr(q.node.arguments[0])), w: 3 });
    }
    if (p.isBinaryExpression({ operator: "in" }) && n.left === r.node) {
      const o = exprName(n.right);
      addCand(m, { name: o && singular(o.name) ? singular(o.name) + "Key" : "key", w: 2 });
      continue;
    }
    if (p.isBinaryExpression() && /^(==|===|!=|!==)$/.test(n.operator)) {
      const other = n.left === r.node ? n.right : n.left;
      if (t.isStringLiteral(other)) stringCmp++;
      else if (t.isIdentifier(other) && !isCanon(other.name) && b.kind === "param")
        addCand(m, { name: other.name, w: 1 });
      else if (
        t.isMemberExpression(other) &&
        !other.computed &&
        t.isIdentifier(other.property) &&
        other.property.name !== "length"
      )
        addCand(m, { name: other.property.name, w: 1.5 });
      continue;
    }
    if (p.isBinaryExpression() && /^[-*/%<>]|^<=|^>=/.test(n.operator)) numeric++;
    if (p.isSwitchStatement() && n.discriminant === r.node) stringCmp += 2;
    if (p.isReturnStatement()) {
      const fn = p.getFunctionParent();
      const dk = fn && definitionKey(fn);
      if (dk && dk.startsWith(".")) {
        const sv = stripVerb(dk.slice(1));
        if (sv) addCand(m, { name: sv, w: 2 });
      }
    }
  }
  const has = (s) => [...members].some((x) => s.has(x));
  const count = (s) => [...members].filter((x) => s.has(x)).length;
  if (count(EVENT_MEMBERS) >= 1 && !has(CTX_MEMBERS))
    addCand(m, { name: "event", w: 3 + 2 * count(EVENT_MEMBERS) });
  if (count(CTX_MEMBERS) >= 2) addCand(m, { name: "ctx", w: 9 });
  if (members.has("getContext")) addCand(m, { name: "canvas", w: 6 });
  if (members.has("data") && members.has("width") && members.has("height"))
    addCand(m, { name: "imageData", w: 4 });
  if (members.has("command") || members.has("option")) addCand(m, { name: "message", w: 3 });
  if (members.size && [...members].every((x) => /^(x|y)$/.test(x)))
    addCand(m, { name: "point", w: 3 });
  if (members.size && [...members].every((x) => /^(width|height)$/.test(x)))
    addCand(m, { name: "size", w: 2 });
  if (members.size && [...members].every((x) => /^(r|g|b|a)$/.test(x)))
    addCand(m, { name: "rgb", w: 3 });
  if (members.size && [...members].every((x) => /^(h|s|v)$/.test(x)))
    addCand(m, { name: "hsv", w: 3 });
  if (members.has("then")) addCand(m, { name: "promise", w: 2 });
  if (members.has("username") && !members.has("command")) addCand(m, { name: "user", w: 2 });
  if (count(JQ_MEMBERS) >= 2) addCand(m, { name: "element", w: 1.5 });
  if (count(STR_MEMBERS) >= 1) addCand(m, { name: "str", w: 1 });
  if (count(ARR_MEMBERS) >= 1 || members.has("[n]")) addCand(m, { name: "list", w: 1 });
  if (members.has("length") && !members.size === 1) addCand(m, { name: "list", w: 0.5 });
  if (called) addCand(m, { name: "callback", w: 3 });
  if (computedKeyOf && b.kind === "param")
    addCand(m, {
      name:
        computedKeyOf !== "?" && singular(computedKeyOf) ? singular(computedKeyOf) + "Key" : "key",
      w: 1.5,
    });
  else if (computedKeyOf) addCand(m, { name: "key", w: 1 });
  if (stringCmp) addCand(m, { name: "type", w: 0.8 });
  if (numeric) addCand(m, { name: "value", w: 0.5 });
  return m;
}

function loopIndexName(loop) {
  let d = 0;
  for (let p = loop.parentPath; p && !p.isFunction() && !p.isProgram(); p = p.parentPath)
    if (p.isForStatement() && p.node.init && t.isVariableDeclaration(p.node.init)) d++;
  return ["i", "j", "k", "l", "m"][d] || "n";
}

function ranked(m) {
  return [...m].sort(
    (a, b) =>
      b[1] - a[1] ||
      (GENERIC.has(a[0]) ? 1 : 0) - (GENERIC.has(b[0]) ? 1 : 0) ||
      b[0].length - a[0].length,
  );
}
function fallback(j) {
  if (j.binding.kind === "param") return "value";
  if (j.binding.path.isFunctionDeclaration()) return "helper";
  return "value";
}

buildClassMap(ast);
buildTypeMap(ast);

// ---------- pass 1: seed signature votes from real names and call sites ----------
traverse(ast, {
  Function(fn) {
    const dk = definitionKey(fn);
    if (!dk) return;
    fn.node.params.forEach((p, i) => {
      const id = t.isAssignmentPattern(p) ? p.left : p;
      if (t.isIdentifier(id) && !isCanon(id.name)) voteA(dk, fn.node.params.length, i, id.name, 1);
    });
  },
  "CallExpression|NewExpression"(p) {
    const k = calleeKey(p.node, p);
    if (!k) return;
    p.node.arguments.forEach((a, i) => {
      if (t.isIdentifier(a) && isCanon(a.name)) return;
      const r = exprName(a);
      if (r && r.name !== "self" && r.w >= 3) voteA(k, p.node.arguments.length, i, r.name, 0.5);
    });
  },
});
// this.x = param in constructors names constructor args directly
traverse(ast, {
  ClassMethod(fn) {
    if (fn.node.kind !== "constructor") return;
    const dk = definitionKey(fn);
    if (!dk) return;
    fn.node.params.forEach((p, i) => {
      const id = t.isAssignmentPattern(p) ? p.left : p;
      if (!t.isIdentifier(id)) return;
      const b = fn.scope.getOwnBinding(id.name);
      const arity = fn.node.params.length;
      if (!b) return;
      for (const r of b.referencePaths) {
        const q = r.parentPath;
        if (
          q.isAssignmentExpression() &&
          q.node.right === r.node &&
          t.isMemberExpression(q.node.left) &&
          t.isThisExpression(q.node.left.object) &&
          !q.node.left.computed
        )
          voteA(dk, arity, i, q.node.left.property.name, 2);
      }
    });
  },
});

// ---------- pass 2: score, then pick in scope order ----------
const results = { topLevel: {}, locals: {} };
const stats = { named: 0, fallback: 0 };
const fallbacks = [];
const pick = (j, cands) => {
  for (const name of cands) {
    if (!name) continue;
    if (!renamer.check(j, name)) return name;
  }
  return null;
};

// Three rounds: each round's strong picks become provisional names (read by exprName through
// aliases and call arguments) and signature votes for the next round.
let scored = targets.map((j) => ({ j, m: evidence(j) }));
for (let round = 0; round < 2; round++) {
  const extra = new Map();
  for (const { j, m } of scored) {
    const top = ranked(m)[0];
    if (!top || top[1] < 1 || GENERIC.has(top[0])) continue;
    for (const r of j.binding.referencePaths) provisional.set(r.node, { name: top[0], w: top[1] });
    if (j.binding.kind !== "param" || top[1] < 4) continue;
    const fn = j.scope.path;
    const dk = definitionKey(fn);
    const idx = fn.node.params.findIndex(
      (p) =>
        p === j.binding.path.node || (t.isAssignmentPattern(p) && p.left === j.binding.path.node),
    );
    if (dk && idx >= 0) extra.set(dk + "#" + idx, [dk, fn.node.params.length, idx, top[0]]);
  }
  for (const [dk, ar, idx, name] of extra.values()) voteA(dk, ar, idx, name, 1);
  // call sites whose arguments now have provisional names
  traverse(ast, {
    "CallExpression|NewExpression"(p) {
      const k = calleeKey(p.node, p);
      if (!k) return;
      p.node.arguments.forEach((a, i) => {
        if (!t.isIdentifier(a) || !isCanon(a.name)) return;
        const pv = provisional.get(a);
        if (pv && pv.w >= 4) voteA(k, p.node.arguments.length, i, pv.name, 0.5);
      });
    },
  });
  scored = targets.map((j) => ({ j, m: evidence(j) }));
}

for (const { j, m } of scored) {
  let name;
  if (j.scope.path.isProgram()) {
    name = TOP_LEVEL[j.name];
    if (!name) throw new Error("no top-level name for " + j.name);
    const why = renamer.check(j, name);
    if (why) throw new Error(`${j.name} -> ${name}: ${why}`);
    renamer.rename(j, name);
    results.topLevel[j.key] = name;
    continue;
  }
  if (NESTED[j.key]) {
    name = NESTED[j.key];
    const why = renamer.check(j, name);
    if (why) throw new Error(`${j.key} -> ${name}: ${why}`);
  } else {
    const r = ranked(m);
    const best = r.length ? r[0][1] : 0;
    const cands = r.filter(([, w]) => w >= best * 0.5).map(([n]) => n);
    if (process.env.DEBUG_KEY && new RegExp(process.env.DEBUG_KEY).test(j.key))
      console.log(
        j.key,
        r
          .slice(0, 6)
          .map(([n, w]) => n + ":" + w.toFixed(1))
          .join(" "),
        cands.map((c) => c + "=" + (renamer.check(j, c) || "ok")).join(", "),
      );
    name = pick(j, cands);
    if (!name && r.length && r[0][1] >= 1.5) {
      for (let k = 2; !name && k < 50; k++) name = pick(j, [r[0][0] + k]);
    }
    if (!name) {
      const f = fallback(j);
      name = pick(j, [f]);
      for (let k = 2; !name && k < 99; k++) name = pick(j, [f + k]);
      stats.fallback++;
      fallbacks.push(j.key);
    } else stats.named++;
  }
  renamer.rename(j, name);
  results.locals[j.key] = name;
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 1) + "\n");
console.log(
  `top-level ${Object.keys(results.topLevel).length}, locals ${Object.keys(results.locals).length} (from evidence ${stats.named}, fallback ${stats.fallback})`,
);
if (process.env.SHOW_FALLBACKS) for (const f of fallbacks) console.log("  fallback", f);
