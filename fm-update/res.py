RES = {
1: '''    var v2_3 = ["donothing", "cancelstroke", "toggleselectionmode", "toggleselectiontype", "togglemultilayer", "swapcolors", "toggleareaaverage", "rotatereset", "rotate45right", "centerboard", "fittoscreen", "resetzoom", "togglesnap", "toggleaspectratio", "toggleerasermode", "toggledrawgrid", "nextfont", "cleartext", "switchprevtool", "selecteraser", "showmenu", "togglepressureopacity", "togglewholepixels", "polygonalselection", "locktransparency"];''',
2: '''      v2_5 = ["donothing", "showmenu", "toggleselectionmode", "toggleselectiontype", "togglemultilayer", "togglewholepixels", "polygonalselection"];''',
3: 'new',
4: 'both',
5: '''      blendmode: previewBlendMode,
      blur: _0xf634ca722''',
6: 'new',
7: 'new', 8: 'new', 9: 'new', 10: 'new',
11: 'MODS_DIALOG',
12: '''    var v2_7 = localStorage.getItem("fixAutoScroll") === "true" ? 5 : 50;
    var _0xf98d0979e = v2_6.max.y === 0 || Math.abs(v2_6.max.y - v2_6.position.y) <= v2_7;''',
13: 'new', 14: 'new',
}
RES.update({
15: '''        var v2_3 = 50;
        var _0xfe494a2c2 = v2_2.max.y === 0 || Math.abs(v2_2.max.y - v2_2.position.y) <= v2_3;
        if (!isBlocked) {
          this.postMessage(v2_0.from, v2_0.id, v2_0.fromUsername, v2_0.message, v2_0.date);
        }''',
16: '''        if (_0xfe494a2c2 && !isBlocked) {''',
17: '''  outBuffer(v2_0, sourceId = null, eventType = null) {
    this.strokeQueued = (this.strokeQueued || 0) + 1;
    this.obuffer.push({
      data: v2_0,
      source: sourceId,
      eventType: eventType,
      authorized: this.isSourceAuthorized(sourceId) || eventType && this.alwaysAuthorizedEvents.has(eventType),
      timestamp: Date.now()
    });''',
18: 'new',
})
RES.update({
19: lambda m, b, n: m[:-1] + n,
20: 'new',
21: lambda m, b, n: m[:-2] + n,
})
RES.update({
22: lambda m, b, n: m[:-2] + n,
23: lambda m, b, n: m[:-1] + n,
})
RES.update({
24: 'new',
25: lambda m, b, n: m[:-1] + n,
})
RES.update({
26: lambda m, b, n: m + n[1:],
27: 'new',
28: 'new',
29: '''    if (v2_0 instanceof BrushSelection || v2_0 instanceof BrushSelectionModded) {''',
30: 'both',
31: 'both',
32: 'mod',
})
def _mods_dialog(m, b, n):
    # upstream dialog list plus the mod's "mods" dialog
    return ['    } else if (v2_0 == "mods") {', '      v2_2 = new ModsDialog(this.container, v2_0);'] + n
RES[11] = _mods_dialog
