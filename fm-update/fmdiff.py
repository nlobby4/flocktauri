#!/usr/bin/env python3
"""Diff two original (obfuscated) flockmod.js builds without deobfuscating them.

The obfuscator reshuffles every build: the string table is rotated and every _0x name is
random, so a plain diff marks nearly every line as changed. This does the minimum to undo that:

  1. Resolve string-table lookups like _0x27a0(0x1c2) to the literal string. The table rotation
     is replayed in Python; none of FlockMod's code is executed.
  2. Prettify with prettier (needs node/npx).
  3. Rename _0x names to v1, v2... numbered per method, so one new variable does not shift the
     names in the rest of the file. Hex numbers become decimal, !![] / ![] become true / false.
  4. Unified diff plus a summary of which methods changed.

Usage:
  fmdiff.py diff OLD.orig.js NEW.orig.js OUTDIR
  fmdiff.py check [--originals DIR]
      Fetch flockmod.com/draw/, and if flockmod.js has a new ?v= hash, save the untouched
      original into DIR (default: originals/ next to this script) and diff it against the
      previous one into DIR/diff-OLDHASH-NEWHASH/. Exit 0 = no change, 10 = new version, 1 = error.
"""
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0"}
DRAW_URL = "https://flockmod.com/draw/"
# Lines at or below this indent start a new naming block (class members sit at 6 in the IIFE)
BLOCK_INDENT = 6

# ---------- step 1: string table ----------


def js_unescape(body):
    def rep(m):
        e = m.group(1)
        if e[0] == "x":
            return chr(int(e[1:], 16))
        if e[0] == "u":
            return chr(int(e[2:-1] if e[1] == "{" else e[1:], 16))
        return {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}.get(e, e)

    return re.sub(r"\\(x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|.)", rep, body, flags=re.S)


def parse_string_array(src, start):
    """Parse a JS array of string literals starting at src[start] == '['. Returns (list, end)."""
    out, i = [], start + 1
    while True:
        while src[i] in " \t\r\n,":
            i += 1
        if src[i] == "]":
            return out, i + 1
        q = src[i]
        if q not in "\"'":
            raise ValueError("string table holds a non-string at %d" % i)
        j = i + 1
        while src[j] != q:
            j += 2 if src[j] == "\\" else 1
        out.append(js_unescape(src[i + 1 : j]))
        i = j + 1


def js_parse_int(s):
    m = re.match(r"\s*([+-]?\d+)", s)
    return float(m.group(1)) if m else float("nan")


def resolve_strings(src):
    m = re.search(r"function (_0x[0-9a-f]+)\(\)\s*\{\s*(?:var|const|let) _0x[0-9a-f]+\s*=\s*\[", src)
    if not m:
        raise ValueError("string table function not found")
    arr_fn = m.group(1)
    table, table_end = parse_string_array(src, m.end() - 1)
    m2 = re.search(
        r"function (_0x[0-9a-f]+)\([^)]*\)\s*\{\s*(?:var|const|let) _0x[0-9a-f]+\s*=\s*"
        + arr_fn
        + r"\(\);[\s\S]{0,400}?=\s*_0x[0-9a-f]+\s*-\s*(0x[0-9a-f]+|\d+)",
        src,
    )
    if not m2:
        raise ValueError("decoder function not found")
    decoder, offset = m2.group(1), int(m2.group(2), 0)

    # Replay the rotation IIFE: shift the table until the parseInt checksum hits the target
    m3 = re.search(r"\}\)?\(" + arr_fn + r",\s*(0x[0-9a-f]+|\d+)\)", src)
    target = int(m3.group(1), 0)
    loop = src[: m3.start()]
    m4 = list(re.finditer(r"try\s*\{\s*(?:var|const|let) _0x[0-9a-f]+\s*=\s*([^;]+);", loop))[-1]
    expr = re.sub(r"parseInt\(_0x[0-9a-f]+\((0x[0-9a-f]+|\d+)\)\)", r"P(\1)", m4.group(1))
    if not re.fullmatch(r"[P0-9a-fx()+\-*/\s]*", expr):
        raise ValueError("unexpected checksum expression: " + expr[:200])
    code = compile(expr, "checksum", "eval")
    for _ in range(len(table)):
        P = lambda i: js_parse_int(table[i - offset])
        try:
            if eval(code, {"__builtins__": {}}, {"P": P}) == target:
                break
        except (ZeroDivisionError, IndexError):
            pass
        table.append(table.pop(0))
    else:
        raise ValueError("string table rotation never matched the checksum")

    # Aliases chain (a = decoder, then b = a), so follow assignments until nothing new turns up
    assigns = re.findall(r"(_0x[0-9a-f]+)\s*=\s*(_0x[0-9a-f]+)\b(?!\()", src)
    aliases = {decoder}
    while True:
        more = {a for a, b in assigns if b in aliases} - aliases
        if not more:
            break
        aliases |= more
    names = "|".join(sorted(aliases, key=len, reverse=True))
    call = re.compile(r"\b(?:" + names + r")\((0x[0-9a-f]+|\d+)(?:,\s*[^()]*)?\)")

    def lit(mm):
        return json.dumps(table[int(mm.group(1), 0) - offset], ensure_ascii=False)

    # Empty the table itself; its contents only differ by order
    body = call.sub(lit, src[: m.end() - 1] + "[]" + src[table_end:])
    # Drop the alias declarations; the obfuscator adds them to methods at random
    al = r"(?:" + names + r")\s*=\s*(?:" + names + r")"
    body = re.sub(r"\b(var|let|const)\s+" + al + r"\s*;", "", body)
    body = re.sub(r"\b(var|let|const)\s+" + al + r"\s*,\s*", r"\1 ", body)
    body = re.sub(r",\s*" + al + r"(?=\s*[,;])", "", body)
    return body


# ---------- step 2: prettier ----------


def prettify(src):
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        raise RuntimeError("npx not found; prettier is needed")
    r = subprocess.run(
        [npx, "--yes", "prettier", "--print-width", "100", "--parser", "babel"],
        input=src.encode("utf-8"),
        capture_output=True,
    )
    if r.returncode:
        raise RuntimeError("prettier failed: " + r.stderr.decode("utf-8", "replace")[:500])
    return r.stdout.decode("utf-8")


# ---------- step 3: names ----------

TOKEN = re.compile(r"""("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|//.*$)""")


class Scopes:
    """Names numbered per function, so new code only renumbers inside its own function.

    A line that opens a function pushes a scope covering the deeper-indented lines after it.
    Names are looked up from the innermost scope out; a new one is numbered in the innermost
    scope as v<n> at method level and v<depth>_<n> inside nested functions."""

    def __init__(self):
        self.stack = []

    def line(self, indent, opens):
        while self.stack and indent <= self.stack[-1][0] and len(self.stack) > 1:
            self.stack.pop()
        if indent <= BLOCK_INDENT:
            self.stack = [[indent, {}]]
        elif opens:
            self.stack.append([indent, {}])

    def name(self, n):
        for _, names in reversed(self.stack):
            if n in names:
                return names[n]
        if not self.stack:
            self.stack = [[0, {}]]
        depth, names = len(self.stack) - 1, self.stack[-1][1]
        names[n] = "v%d" % (len(names) + 1) if depth == 0 else "v%d_%d" % (depth, len(names) + 1)
        return names[n]


OPENS = re.compile(r"\bfunction\b[^(]*\(|=>\s*\{\s*$|\)\s*\{\s*$")


def normalize_line(line, scopes):
    parts = TOKEN.split(line)
    for k in range(1, len(parts), 2):
        # Inline strings keep the obfuscator's \x20-style escapes and pick quotes freely, so write
        # every plain string literal back out in one form
        if parts[k][:1] in "\"'":
            parts[k] = json.dumps(js_unescape(parts[k][1:-1]), ensure_ascii=False)
    for k in range(0, len(parts), 2):  # even parts are code, odd parts strings/comments
        s = parts[k]
        s = re.sub(r"!!\[\]", "true", s)
        s = re.sub(r"!\[\]", "false", s)
        s = re.sub(r"\b0x[0-9a-fA-F]+\b", lambda m: str(int(m.group(0), 16)), s)

        parts[k] = re.sub(r"\b_0x[0-9a-f]+\b", lambda m: scopes.name(m.group(0)), s)
    return "".join(parts)


def normalize(pretty):
    out, scopes = [], Scopes()
    for line in pretty.split("\n"):
        stripped = line.lstrip(" ")
        if stripped:
            code = "".join(TOKEN.split(stripped)[0::2])
            scopes.line(len(line) - len(stripped), bool(OPENS.search(code)))
        out.append(normalize_line(line, scopes))
    return out


def normalize_file(path):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    # Prettify twice: the second pass rewraps lines now that names have stable lengths
    return prettify("\n".join(normalize(prettify(resolve_strings(src))))).split("\n")


# ---------- step 4: diff ----------


def member_header(lines, idx):
    """Nearest line above idx that starts a class member or class, for the summary."""
    for i in range(idx, -1, -1):
        s = lines[i]
        st = s.lstrip(" ")
        if st and len(s) - len(st) <= BLOCK_INDENT and not st.startswith(("}", ")", "]", "//")):
            return st.rstrip(" {")[:110]
    return "(top of file)"


def version_of(path):
    with open(path, encoding="utf-8") as f:
        found = sorted(set(re.findall(r"\b13\.\d+\.\d+\b", f.read())))
    return ", ".join(found) or "?"


def diff_files(old_path, new_path, outdir):
    os.makedirs(outdir, exist_ok=True)
    a, b = normalize_file(old_path), normalize_file(new_path)
    for name, lines in (("old.norm.js", a), ("new.norm.js", b)):
        with open(os.path.join(outdir, name), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines))
    diff = list(
        difflib.unified_diff(a, b, "old " + os.path.basename(old_path), "new " + os.path.basename(new_path), n=3, lineterm="")
    )
    with open(os.path.join(outdir, "changes.diff"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(diff) + "\n")

    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    members = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        key = member_header(b, j1) if j2 > j1 else member_header(a, i1)
        rec = members.setdefault(key, [0, 0])
        rec[0] += i2 - i1
        rec[1] += j2 - j1
    with open(os.path.join(outdir, "summary.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("old: %s (version %s)\nnew: %s (version %s)\n" % (old_path, version_of(old_path), new_path, version_of(new_path)))
        f.write("normalized lines: old %d, new %d\n" % (len(a), len(b)))
        f.write("changed spots: %d\n\n" % len(members))
        for key, (rm, add) in members.items():
            f.write("-%-4d +%-4d %s\n" % (rm, add, key))
    return len(members)


# ---------- check mode ----------


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def check(originals):
    os.makedirs(originals, exist_ok=True)
    page = fetch(DRAW_URL).decode("utf-8", "replace")
    m = re.search(r"/draw/js/fm/flockmod\.js\?v=([0-9A-Za-z]+)", page)
    if not m:
        print("fmdiff: flockmod.js not found on the draw page")
        return 1
    new_hash = m.group(1)
    # latest.txt names the hash the last check saw; it is the "old" side of the next diff
    latest_file = os.path.join(originals, "latest.txt")
    old_hash = open(latest_file).read().strip() if os.path.exists(latest_file) else ""
    if old_hash == new_hash:
        print("fmdiff: no change (%s)" % new_hash)
        return 0
    new_path = os.path.join(originals, "flockmod.%s.orig.js" % new_hash)
    if not os.path.exists(new_path):
        with open(new_path, "wb") as f:
            f.write(fetch("https://flockmod.com/draw/js/fm/flockmod.js?v=" + new_hash))
        with open(os.path.join(originals, "draw.%s.html" % new_hash), "w", encoding="utf-8") as f:
            f.write(page)
    print("fmdiff: new flockmod.js %s (version %s)" % (new_hash, version_of(new_path)))
    old_path = os.path.join(originals, "flockmod.%s.orig.js" % old_hash)
    if not old_hash or not os.path.exists(old_path):
        print("fmdiff: no earlier original to compare with")
    else:
        outdir = os.path.join(originals, "diff-%s-%s" % (old_hash, new_hash))
        n = diff_files(old_path, new_path, outdir)
        print("fmdiff: %d changed spots, report in %s" % (n, outdir))
    with open(latest_file, "w") as f:
        f.write(new_hash + "\n")
    return 10


def main(argv):
    if len(argv) == 4 and argv[0] == "diff":
        t = time.time()
        n = diff_files(argv[1], argv[2], argv[3])
        print("%d changed spots, report in %s (%.0fs)" % (n, argv[3], time.time() - t))
        return 0
    if argv and argv[0] == "check":
        originals = argv[2] if len(argv) == 3 and argv[1] == "--originals" else os.path.join(HERE, "originals")
        return check(originals)
    print(__doc__)
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Exception as e:  # keep the exit code meaningful for whatever triggered this
        print("fmdiff: error: %s" % e)
        sys.exit(1)
