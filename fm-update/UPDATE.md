# Updating flocktauri to a new FlockMod version

## Current method (since 13.5.11)

Kyle wants the obfuscated originals compared directly, not a full deobfuscation. `fmdiff.py` does that.

1. `python fmdiff.py check` fetches flockmod.com/draw/. If the `flockmod.js?v=` hash differs from `originals/latest.txt`, it saves the untouched original as `originals/flockmod.HASH.orig.js` (plus `draw.HASH.html`) and writes `originals/diff-OLD-NEW/`. Exit 0 means no change, 10 means a new version, 1 means an error. Keep every original; the next update diffs against it.
2. `fmdiff.py` resolves the string table in Python (no FlockMod code runs), prettifies twice, and renames `_0x` names to `v1`, `v2_3`... per function. A real update comes out at a few thousand diff lines. `summary.txt` lists the changed methods.
3. Read `changes.diff` and port each hunk by hand into `extension/flockmod.js`. Property names and strings are real; to find which helper a junk name is, look at its definition in the resolved source (`work-13.5.11/lookup.py` and `freeids.py` show how).
4. Mirror handshake changes exactly (see Rules). Then run `node --check`, `loadtest.js`, `strict.js` and `injcheck.js` on the file.

13.5.11 was done this way; see `CHANGES-13.5.11.md`. `fmdiff.py diff OLD.orig.js NEW.orig.js OUTDIR` runs the diff on two files directly.

## Old method (13.5.7 to 13.5.10)

This is how 13.5.7 was updated to 13.5.10 (v1.6.0). It needs webcrack and name recovery, which Kyle no longer wants.

**The idea:** don't redo a full merge. Diff old vanilla FlockMod against new vanilla FlockMod, then port only that difference into our modded file, one method at a time.

- A method FlockMod changed but the mods never touched takes the new version automatically.
- A method changed on both sides gets merged by hand. In 13.5.10 that was 22 methods, most of them one or two lines.

Everything here lives in `fm-update/`, which is gitignored and stays on this PC. Only `extension/` and the version files go into git.

## What you need on disk

- `new-13.5.10.aligned.js`: vanilla 13.5.10, deobfuscated and named. This is the **old vanilla** for the next update. Don't delete it.
- `final.canon.js`: our modded client in canonical form (13.5.10 plus all mods). The port runs on this.
- `cleanup-names.json`: the readable variable names used to turn `final.canon.js` into `extension/flockmod.js`.
- The scripts: `canon.js`, `pin.js`, `match.js`, `restore.js`, `align10.js`, `vdiff.js`, `port.js`, `show3.js`, `name-gen.js`, `rename.js`, `tidy.js`, `strict.js`, `injcheck.js`, `cdp.js`, `shot.js`, plus `work-13.5.10/hscheck.js` and `work-13.5.10/consolelog.js`.

Use `C="node --max-old-space-size=8000"` for every big step. Run everything from `fm-update/`.

In the examples below the new version is **13.5.11** and its asset hash is **HASH**. Replace both.

## 1. Get the new FlockMod

```
curl -s -A "Mozilla/5.0" https://flockmod.com/draw/ -o draw-live.html
grep -oE '/draw/js/fm/flockmod.js\?v=[^"]*' draw-live.html       # gives HASH
curl -s -A "Mozilla/5.0" "https://flockmod.com/draw/js/fm/flockmod.js?v=HASH" -o flockmod.HASH.orig.js
grep -oE '13\.[0-9]+\.[0-9]+' flockmod.HASH.orig.js | sort -u   # confirm the version
```

Also compare the `<script>` list in `draw-live.html` with the previous one. 13.5.10 broke because the page stopped loading `jquery.contextMenu.min.js`. A removed library is the first thing to look for.

## 2. Deobfuscate and canonicalize

```
npx -y webcrack flockmod.HASH.orig.js -o wcout-13.5.11
cp wcout-13.5.11/deobfuscated.js wc-13.5.11.js
$C canon.js wc-13.5.11.js wc-13.5.11.canon.js
npx prettier --print-width 100 --parser babel wc-13.5.11.canon.js --write
```

## 3. Recover the names

The new file has mangled names (`v1_123`). Match them against the old vanilla.

```
$C pin.js new-13.5.10.aligned.js old.pin.js     # v0_N -> Anon_N so canon.js can't renumber them
$C canon.js old.pin.js old.pin.js
npx prettier --print-width 100 --parser babel old.pin.js --write
$C match.js old.pin.js wc-13.5.11.canon.js mapping-13.5.11.json
```

Read what `match.js` prints:
- **old unmatched:** classes it couldn't find. Usually they moved, not vanished. In 13.5.10, `LoginDialog`, `ProfileDialog` and `CmdLEFT` moved.
- **low-score matches:** check each one with `node meth.js` on both files. A wrong match is worse than no match.

```
$C restore.js wc-13.5.11.canon.js mapping-13.5.11.json new-13.5.11.named.js
$C canon.js new-13.5.11.named.js new-13.5.11.canon.js
npx prettier --print-width 100 --parser babel new-13.5.11.canon.js --write
```

Anything still unnamed is now `v0_0`, `v0_1`, and so on.

- List them: `node work-13.5.10/tops.tmp.js new-13.5.11.canon.js | grep '^v0_'`
- Name each one from how it's used: `grep -oE 'register\("[A-Z_]+", v0_N\)|new v0_N\(' new-13.5.11.canon.js` or the form it loads.
- Give moved classes their old names back.

Then edit the `NEW` table at the top of `align10.js` with those names (it currently holds the 13.5.10 list), change its `v0_17` check to the highest new `v0_N`, and run:

```
$C align10.js new-13.5.11.canon.js new-13.5.11.aligned.js
$C align10.js old.pin.js old.aligned.js
```

Both files now use the same top-level names as `final.canon.js`.

## 4. See what FlockMod changed

```
$C vdiff.js old.aligned.js new-13.5.11.aligned.js vd-13.5.11
```

`vd-13.5.11/summary.txt` lists every changed, added and removed method with line counts, and there's one `.diff` per changed method. This answers "how much changed". If whole classes show as removed and added, step 3 missed a rename.

## 5. Port it into the modded file

```
mkdir -p resolutions-13.5.11
$C port.js old.aligned.js final.canon.js new-13.5.11.aligned.js resolutions-13.5.11 port-out.js port-report.txt
```

`port-report.txt` lists:
- **TAKEN:** the new version went in as is.
- **ADDED / REMOVED:** new upstream code inserted, deleted code dropped.
- **CONFLICT:** methods both sides changed. These are the hand merges.

For the conflicts, dump each one:

```
$C show3.js old.aligned.js final.canon.js new-13.5.11.aligned.js c-13.5.11 Class.method Class.method2 ...
```

That writes `Class.method.base.js`, `.mod.js`, `.new.js`, `.UPSTREAM.diff` (what FlockMod changed) and `.MOD.diff` (what the mods changed). For each one:

1. Copy `.mod.js` and apply the upstream diff to it. `patch -F3 copy.js < Class.method.UPSTREAM.diff` handles most of them; do the rest by hand.
2. Read the result and check the two changes don't fight. In 13.5.10, FlockMod's new keepCentreOnFlip did the same job as Zexium's mirroring, so his version stays alone when his option is on.
3. Save it as `resolutions-13.5.11/Class.method.js` (just the method, or the whole function for a top-level one).

Rerun `port.js` until it reports no conflicts except the cases below.

**Things to watch for**
- **"changed upstream but missing in mod":** Zexium split some methods into variants. `flipView` became `flipViewEnabled`/`flipViewDisabled`, `bindEventsBoard` became `bindEventsBoardEnabled`/`Disabled`, and `bindEventsRoom` also has `bindEventsRoomModified`. Apply the upstream change to every variant and save each as its own resolution file. Other variants to keep in mind: `centerBoardModified`, `fitToScreenModified`, `recommendedSyncModified`, `setBrushOptionReadOnlyModified`.
- **Removed upstream things the mod code still calls.** Grep `port-out.js` for every removed method or library (for example `$.contextMenu`, `reportDrop`). Fix those call sites with a resolution file too. A resolution file for a method upstream didn't change still gets applied.
- **Hand edits made directly to `extension/flockmod.js`** after the last update aren't in `final.canon.js` and will be lost. Before starting, check with:
  `diff --strip-trailing-cr <(rebuild of final.canon.js) extension/flockmod.js`
  and turn each edit into a resolution file. v1.5.1's popup fix in `CmdFAILED.execute` was carried this way.

## 6. Safety checks

```
node --check port-out.js
cd .. && node fm-update/strict.js fm-update/port-out.js && node fm-update/injcheck.js fm-update/port-out.js && cd fm-update
```

- `strict.js` should print the same list as before: `value hideRow showRow Option DarkWebDB Chart moment UploaderProxy roundToEighth frameBuffer sourceId resolve`.
- `injcheck.js` should report nothing missing.

**The handshake must stay vanilla.** Edit `work-13.5.10/hscheck.js` to point at the new aligned file, then run it. Only `UserInterface.constructor` and `UserInterface.setup` may differ, since Zexium changed other parts of them. For those two, diff the lines containing `CONNECTION`, `WHOIAM`, `getBotString`, `getProperties`, `ready.`, `clientName` and `version` against vanilla. They must match exactly.

## 7. Make it readable and install it

```
$C name-gen.js port-out.js gen-names.json
node -e 'const g=require("./gen-names.json"),o=require("./cleanup-names.json");require("fs").writeFileSync("cleanup-names.json",JSON.stringify({topLevel:{...g.topLevel,...o.topLevel},locals:{...g.locals,...o.locals}},null,1))'
cp port-out.js final.canon.js
npx prettier --print-width 100 --parser babel final.canon.js --write
$C rename.js final.canon.js cleanup-names.json cleanup/renamed.js > cleanup/rename-report.txt
$C tidy.js cleanup/renamed.js cleanup/tidied.js cleanup/tidy-report.txt
npx prettier --print-width 100 --parser babel cleanup/tidied.js > cleanup/final.js
node --check cleanup/final.js
cp cleanup/final.js ../extension/flockmod.js && sed -i 's/$/\r/' ../extension/flockmod.js
```

The names merge keeps every existing name and only adds names for new code.

**Keep a copy of the old `final.canon.js` and `cleanup-names.json`** before overwriting them, or work on copies. If a step goes wrong, those two files and `new-13.5.10.aligned.js` are all you need to start over.

## 8. Test

Start the app with remote debugging:

```
cd .. && WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222" npx tauri dev
```

Then, from `fm-update/`:
- `node work-13.5.10/consolelog.js 25` reloads the page and prints errors and exceptions.
- `node cdp.js 'return UI.version'` should print the new version.
- `node shot.js out.png` takes a screenshot.

Join a quiet room. Don't chat or draw while testing with scripts. By hand, check:
1. The pen, eraser and selection tools.
2. Dynamic opacity and lock transparency.
3. Right-click menus.
4. Flip with the mirroring tweak on and off.
5. The Mods dialog.
6. Leaving and rejoining a room.

## 9. Release

From the repo root:

```
node bump-version.js minor           # updates package.json, manifest.json, tauri.conf.json, Cargo.toml
npx tauri build
```

Make `release-X.Y.Z/` and copy in:
- `src-tauri/target/release/bundle/msi/*.msi`
- `src-tauri/target/release/bundle/nsis/*-setup.exe`
- `extension.zip` containing a `flockmod-extension/` folder with `content.js`, `flockmod.css`, `flockmod.js`, `homography.js`, `injected.js`, `manifest.json` and `rules.json`. Build it with Python's `zipfile` so the paths use forward slashes; PowerShell's `Compress-Archive` writes backslashes.
- `NOTES.md`, in the same style as `release-1.6.0/NOTES.md`.

Add `release-X.Y.Z/` to the root `.gitignore`. Commit only the root `.gitignore`, `extension/flockmod.js`, `extension/manifest.json`, `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `src-tauri/tauri.conf.json`.

## Rules

- **Never change the connect handshake or device info:** `CONNECTION`/`WHOIAM`, `getBotString`, the `ready.*` ids, `device.getProperties`, `this.clientName`. They must match the new vanilla exactly. A wrong value there has caused an IP ban before.
- **Don't change** protocol messages, command names, string literals or `localStorage` keys.
- **Move scratch files into a `work-<version>/` folder** instead of deleting them.
- **Gotcha:** Node and Git Bash map `/tmp` to different folders on Windows. Pass explicit paths under `fm-update/` instead of `/tmp`.
