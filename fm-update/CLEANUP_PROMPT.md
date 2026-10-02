Clean up `C:\Users\Kyle\Documents\git\flocktauri\extension\flockmod.js` so it reads like normal hand-written code. Behaviour must not change at all.

## Background

This file is FlockMod 13.5.7 (deobfuscated) merged with my mods. It's about 69k lines. The merge tooling lives in `flocktauri/fm-update/` and its last step (`canon.js`) gave every local variable a positional name:

- `v<depth>_<n>`, for example `v2_0`, `v3_1`
- `_0xf<hash>` for variables that only exist on one side of the merge
- `v0_<n>` for about 100 top-level classes and functions that are new in 13.5.7 and have no known name (some upstream ones are already named: the `Cmd*` command handlers, `Socket`, `Account`, the `*Event` classes)

`fm-update/mapping.json` holds the names I already recovered. `fm-update/final.canon.js` is the same file before any cleanup; leave it alone.

## What to do

1. **Rename locals and parameters to real names, scope-aware.** Use Babel (`@babel/traverse`, `scope.rename`), never text search and replace. Pick names from how each one is used:
   - `var v2_0 = this` becomes `self`
   - event handler params become `event`
   - `$.each(list, function (v3_0, v3_1)` becomes `(index, item)` or something more specific
   - a canvas context becomes `ctx`

   Avoid names that shadow a global the code uses (`room`, `socket`, `UI`, `textManager`, `$`).
2. **Name the unnamed top-level `v0_<n>` classes and functions by what they do.** For example: the image loader that returns a promise becomes `loadImage`, the command base class becomes `CommandHandler`, the dialog subclasses get names from the form they load (`forms/friends.main.html` gives `FriendsDialog`). Record every rename in `fm-update/cleanup-names.json`.
3. **Light cleanup, no logic changes:**
   - drop deobfuscation leftovers like `if (x) ;` followed by a bare block, and empty `else {}`
   - drop duplicated statements such as the same `getChannelString` call twice in a row
   - drop placeholder comments like `// ... [existing complex transparency lock implementation] ...`
   - drop commented-out dead code blocks
   - drop the emoji `console.log` debug spam in the mod code (keep `console.warn`/`console.error`)
   - run prettier at print width 100 at the end

## Do not rename or change

- Class names, method names and property names that already have real names. `injected.js`, the server protocol and saved settings depend on them.
- Anything `extension/injected.js` uses: `UI`, `room`, `socket`, `Socket`, `FrameBuffer`, `Dialog`, `dialogOpenedEvent`, `dialogClosedEvent`, `decryptMessage`, `hex2rgb`, `rgb2hsv`, `hsv2rgb`, `rgb2hex`, `AdvancedCanvas`, `CmdFAILED`. Check the full list with `node fm-update/injcheck.js`.
- String literals, `localStorage` keys, `window.*` assignments, protocol command names (`BC`, `USERSET`, ...), and `this.clientName = "FlockMod"`.
- `window.clearUndoHistory`. It has a known bug (it re-broadcasts the brush setup after `leaveRoom()`, which causes the "That did not go through" popups). Fix that separately, not as part of this cleanup.

## Prove nothing changed

- `node --check` passes.
- `node fm-update/strict.js extension/flockmod.js` prints the same undefined-globals list as before.
- `node fm-update/injcheck.js` reports nothing missing.
- Write an equivalence check: parse the old (`final.canon.js`) and new file, alpha-normalize every non-global binding to positional names on both, strip comments, regenerate. The output must be identical except for the statements removed on purpose in step 3; list those in your report.
- Rebuild the Tauri app (`npx tauri build`) and tell me to reload the Chrome extension. Then I'll join a room, draw with a few tools, chat and leave.

## Future upstream updates

Keep `final.canon.js` and `cleanup-names.json`. The next FlockMod update should be merged on the canonical copy, then the rename map reapplied. Write that rename step as a re-runnable `fm-update/rename.js` that takes the map. Mention in the report anything that would stop it applying cleanly to a future merge.
