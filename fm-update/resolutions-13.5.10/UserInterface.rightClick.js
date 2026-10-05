rightClick(v2_0 = "donothing") {
  if (v2_0 == "cancelstroke") {
    room.myself.surface.penCancel();
  } else if (v2_0 == "showmenu") {
    try {
      this.contextMenu.open($(".boardMenu"), this.mousePointer.position.x, this.mousePointer.position.y);
    } catch (v4_0) {}
  } else if (v2_0 == "swapcolors") {
    this.sidebar.colorBox.swap();
  } else if (v2_0 == "centerboard") {
    this.centerBoard();
  } else if (v2_0 == "fittoscreen") {
    this.fitToScreen();
  } else if (v2_0 == "resetzoom") {
    room.board.changeScale(1);
    self.centerBoard();
  } else if (v2_0 == "rotatereset") {
    room.board.changeRotation(0);
  } else if (v2_0 == "rotate45right") {
    room.board.changeRotation(room.board.rotation + 45);
  } else if (v2_0 == "toggleareaaverage") {
    if (!room.myself.surface.isBrushOptionReadOnly("areaaverage")) {
      room.myself.surface.setBrushOption("areaaverage", !room.myself.surface.getBrushOption("areaaverage"));
    }
  } else if (v2_0 == "togglemultilayer") {
    if (!room.myself.surface.isBrushOptionReadOnly("multilayer")) {
      room.myself.surface.setBrushOption("multilayer", !room.myself.surface.getBrushOption("multilayer"));
    }
  } else if (v2_0 == "togglepressureopacity") {
    if (!room.myself.surface.isBrushOptionReadOnly("togglepressureopacity")) {
      room.myself.surface.setBrushOption("togglepressureopacity", !room.myself.surface.getBrushOption("togglepressureopacity"));
    }
  } else if (v2_0 == "locktransparency") {
    if (!room.myself.surface.isBrushOptionReadOnly("locktransparency")) {
      room.myself.surface.setBrushOption("locktransparency", !room.myself.surface.getBrushOption("locktransparency"));
    }
  } else if (v2_0 == "togglewholepixels") {
    if (!room.myself.surface.isBrushOptionReadOnly("togglewholepixels")) {
      room.myself.surface.setBrushOption("togglewholepixels", !room.myself.surface.getBrushOption("togglewholepixels"));
    }
  } else if (v2_0 == "polygonalselection") {
    if (!room.myself.surface.isBrushOptionReadOnly("polygonalselection")) {
      room.myself.surface.setBrushOption("polygonalselection", !room.myself.surface.getBrushOption("polygonalselection"));
    }
  } else if (v2_0 == "toggleselectionmode") {
    if (!room.myself.surface.isBrushOptionReadOnly("selectionmode")) {
      room.myself.surface.setBrushOption("selectionmode", !room.myself.surface.getBrushOption("selectionmode"));
    }
  } else if (v2_0 == "toggleselectiontype") {
    if (!room.myself.surface.isBrushOptionReadOnly("selectiontype")) {
      room.myself.surface.setBrushOption("selectiontype", !room.myself.surface.getBrushOption("selectiontype"));
    }
  } else if (v2_0 == "togglesnap") {
    if (!room.myself.surface.isBrushOptionReadOnly("snap")) {
      room.myself.surface.setBrushOption("snap", !room.myself.surface.getBrushOption("snap"));
    }
  } else if (v2_0 == "toggleaspectratio") {
    if (!room.myself.surface.isBrushOptionReadOnly("aspectratio")) {
      room.myself.surface.setBrushOption("aspectratio", !room.myself.surface.getBrushOption("aspectratio"));
    }
  } else if (v2_0 == "toggleerasermode") {
    if (!room.myself.surface.isBrushOptionReadOnly("erasermode")) {
      room.myself.surface.setBrushOption("erasermode", !room.myself.surface.getBrushOption("erasermode"));
    }
  } else if (v2_0 == "toggledrawgrid") {
    if (!room.myself.surface.isBrushOptionReadOnly("drawgrid")) {
      room.myself.surface.setBrushOption("drawgrid", !room.myself.surface.getBrushOption("drawgrid"));
    }
  } else if (v2_0 == "cleartext") {
    if (room.myself.surface.getCurrentBrush() == "text") {
      room.myself.surface.penCancel();
    }
  } else if (v2_0 == "switchprevtool") {
    this.sidebar.toolbar.selectPreviouslyUsed();
  } else if (v2_0 == "selecteraser") {
    this.sidebar.toolbar.select("eraser");
  } else if (v2_0 == "nextfont") {
    var v2_1 = "font";
    var v2_2 = "+";
    if (room.myself.surface.hasBrushOption(v2_1)) {
      if (!room.myself.surface.isBrushOptionReadOnly(v2_1)) {
        let v5_0 = [];
        for (let v6_0 in room.myself.surface.brushHandler.brush.options[v2_1].list) {
          v5_0.push(v6_0);
        }
        var v2_3 = room.myself.surface.getBrushOption(v2_1);
        var v2_4 = v5_0.indexOf(v2_3);
        var v2_5;
        if (v2_2 == "+") {
          if (v2_4 + 1 > v5_0.length - 1) {
            v2_5 = 0;
          } else {
            v2_5 = v2_4 + 1;
          }
        } else if (v2_4 - 1 < 0) {
          v2_5 = v5_0.length - 1;
        } else {
          v2_5 = v2_4 - 1;
        }
        room.myself.surface.setBrushOption(v2_1, v5_0[v2_5]);
      }
    }
  }
}
