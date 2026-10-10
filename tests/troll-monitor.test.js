// Checks D's TrollMonitor in extension/injected.js: flags fast scribblers, honours the speed limit
// and the on/off box in Mod Settings (D's wins over Zexium's when both are on).
// Run: node tests/troll-monitor.test.js [path/to/injected.js]  (exits 1 on failure)
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, "../extension/injected.js"), "utf8");
function grabClass(name) {
    const start = src.indexOf("class " + name);
    if (start < 0) throw new Error("class " + name + " not found");
    let depth = 0, i = src.indexOf("{", start);
    for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}" && --depth === 0) break;
    }
    return src.slice(start, i + 1);
}
const classes = grabClass("BroadcastHandler") + "\n" + grabClass("TrollMonitor");

// Fresh monitor + room per scenario
function setup({ settings = {}, store = {} } = {}) {
    let now = 0;
    const flagged = new Set();
    class PenSurface {
        constructor() { this.isMyself = false; this.cursor = {}; this.brushHandler = { currentBrush: "pen", brush: { options: { size: { value: 5 } } } }; }
        penDown() {} penMove() {} penUp() {}
    }
    const makeUser = (username, rank) => ({ username, rank, troll: false, surface: new PenSurface() });
    const room = { users: { fast: makeUser("fast", "UU"), slow: makeUser("slow", "UU"), mod: makeUser("mod", "RM"), surf: makeUser("surf", "UU") } };
    // jQuery stub: one <tr name=username> per user; supports $("tr").filter(fn) and $("tr[name='x']")
    const rows = (names) => ({
        addClass: () => names.forEach(n => flagged.add(n)),
        removeClass: () => names.forEach(n => flagged.delete(n)),
        toggleClass: (c, on) => names.forEach(n => on ? flagged.add(n) : flagged.delete(n)),
    });
    const $ = (sel) => {
        const m = /name='([^']+)'/.exec(sel);
        if (m) return rows([m[1]]);
        return { filter: (fn) => rows(Object.keys(room.users).filter(n => fn.call({ getAttribute: () => n }))) };
    };
    const window = { room, modSettings: { customTrollSound: false, ...settings } };
    const localStorage = { getItem: (k) => (k in store ? store[k] : null) };
    const factory = new Function("room", "$", "messagehandler", "customSound", "window", "Date", "setInterval", "clearInterval", "PenSurface", "localStorage",
        classes + "\nconst broadcasthandler = new BroadcastHandler(); const tm = new TrollMonitor(); return {broadcasthandler, tm};");
    const { broadcasthandler, tm } = factory(room, $, { register() {} }, { play() {} }, window, { now: () => now }, () => 1, () => {}, PenSurface, localStorage);
    tm.getUsers();
    const send = (from, action, x, y) => broadcasthandler.handle({ command: "BC", action, from, x, y });
    // 2s of drawing, polled every 40ms like the real interval
    const scribble = (fastStep = 1500) => {
        send("fast", "Pd", 0, 0); send("slow", "Pd", 0, 0); send("mod", "Pd", 0, 0);
        room.users.surf.surface.penDown(0, 0);  // "surf" only reaches us through FlockMod's own drawing calls
        for (let t = 1; t <= 50; t++) {
            now += 40;
            const fx = (t % 2) * fastStep;     // 1500px every 40ms = 37500 px/s
            send("fast", "Pm", fx, t * 10);
            send("slow", "Pm", t * 2, t * 2);  // ~70 px/s
            send("mod", "Pm", fx, t * 10);     // ranked, same speed as fast
            room.users.surf.surface.penMove(fx, t * 10);
            tm.pollAllPositions();
        }
    };
    const idle = (ms) => { send("fast", "Pu", 0, 500); for (let t = 0; t < ms / 40; t++) { now += 40; tm.pollAllPositions(); } };
    const tick = () => { now += 40; tm.pollAllPositions(); };
    return { flagged, window, store, scribble, idle, room, tick };
}

let fails = 0;
const check = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails++; };
const quiet = console.log; const log = (...a) => { if (!/TROLL DETECTED/.test(a[0])) quiet(...a); };
console.log = log;

{
    const s = setup();
    s.scribble();
    check(s.flagged.has("fast"), "default: fast unranked scribbler is flagged");
    check(!s.flagged.has("slow"), "default: slow drawer is not flagged");
    check(!s.flagged.has("mod"), "default: ranked user is not flagged");
    check(s.flagged.has("surf"), "default: scribbler seen only via PenSurface calls is flagged");
    s.idle(12000);
    check(!s.flagged.has("fast"), "default: flag clears after 10s idle");
}
{
    // ~3750 px/s: over the default 3000, under a raised 5000 limit
    const a = setup(); a.scribble(150);
    check(a.flagged.has("fast"), "limit 3000: 3750 px/s scribbler is flagged");
    const b = setup({ settings: { trollSpeedLimit: 5000 } }); b.scribble(150);
    check(!b.flagged.has("fast"), "limit 5000: 3750 px/s scribbler is not flagged");
}
{
    const s = setup({ settings: { dTrollDetection: false } }); s.scribble();
    check(s.flagged.size === 0, "D's box off: D's detector flags nobody");
    const t = setup({ settings: { dTrollDetection: true }, store: { detectTrolling: "true" } }); t.scribble();
    check(t.flagged.has("fast"), "both boxes on: D's detector still runs");
}
{
    // unticking D's box clears D's own flags
    const s = setup(); s.scribble();
    s.window.modSettings.dTrollDetection = false; s.idle(80);
    check(!s.flagged.has("fast"), "unticking D's box clears D's flag");
}
{
    // fast cursor travel with the pen up, then a slow stroke somewhere else: not a troll
    const s = setup();
    const surf = s.room.users.surf.surface;
    for (let t = 1; t <= 20; t++) { s.tick(); surf.penMove((t % 2) * 1500, 100); }
    surf.penDown(1400, 900);
    for (let t = 1; t <= 20; t++) { s.tick(); surf.penMove(1400 + t * 2, 900); }
    check(!s.flagged.has("surf"), "hovering fast then drawing slowly is not flagged");
}

console.log = quiet;
process.exit(fails ? 1 : 0);
