// Execute the merged file's top level with a permissive browser stub to catch load-time errors
// (class extends before definition, bad top-level statements).
const vm = require("vm"), fs = require("fs");
const file = process.argv[2];
const any = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : k === "length" ? 0 : any()),
  apply: () => any(), construct: () => any(), has: () => true,
});
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] },
  setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, requestAnimationFrame: () => 0,
  Math, JSON, Date, Promise, Object, Array, String, Number, Boolean, Map, Set, WeakMap, Symbol, Error, RegExp, parseInt, parseFloat, isNaN, isFinite,
  Uint8Array, Uint8ClampedArray, Float32Array, Int32Array, ArrayBuffer, Proxy, Reflect, encodeURIComponent, decodeURIComponent, atob: (s) => s, btoa: (s) => s,
};
ctx.window = new Proxy(ctx, { get: (t, k) => (k in t ? t[k] : any()), set: (t, k, v) => ((t[k] = v), true) });
ctx.self = ctx.window; ctx.globalThis = ctx.window;
const context = vm.createContext(new Proxy(ctx, { get: (t, k) => (k in t ? t[k] : any()), has: () => true, set: (t, k, v) => ((t[k] = v), true) }));
try {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  console.log("top-level executed OK");
} catch (e) {
  console.log("LOAD ERROR:", e.stack.split("\n").slice(0, 4).join("\n"));
}
