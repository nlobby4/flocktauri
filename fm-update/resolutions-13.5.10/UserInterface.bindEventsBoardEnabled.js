bindEventsBoardEnabled() {
  var v2_0 = this;
  this.drawingArea.on("dragover dragenter", function (v3_0) {
    v3_0.preventDefault();
    v2_0.boardContainer.css("outline", "3px solid red");
  });
  this.drawingArea.on("dragleave", function (v3_0) {
    v3_0.preventDefault();
    v2_0.boardContainer.css("outline", "3px solid #505050");
  });
  this.drawingArea.on("drop", function (v3_0) {
    v3_0.preventDefault();
    v2_0.boardContainer.css("outline", "3px solid #505050");
    v2_0.uploader.uploadFile(v3_0.originalEvent.dataTransfer.files);
  });
  this.drawingArea.contextmenu(function (v3_0) {
    if (room && room.myself) {
      if (room.myself.inputDevice === "mouse") {
        // Check if the input device is "mouse"
        if (room.myself.surface.brushHandler.hasOption("rightclick")) {
          var v3_1 = room.myself.surface.brushHandler.getOption("rightclick");
          v2_0.rightClick(v3_1);
        }
      }
    }
  });
  this.drawingArea.on(this.pointerEvent("down", "ui"), function (v3_0) {
    if (!v2_0.onFocus) {
      return;
    }
    if (!v2_0.isCurrentPointer(v3_0.pointerId)) {
      return;
    } else {
      v2_0.setCurrentPointer(v3_0.pointerId);
    }
    var v3_1 = v2_0.getInputPosition(v3_0);
    v2_0.mousePointer.move(v3_1.x, v3_1.y);
    if (v2_0.preDraggingMode || v3_0.which && v3_0.which == 2) {
      v3_0.preventDefault();
      v2_0.drag(true);
      if (!v2_0.dragPoint) {
        v2_0.dragPoint = new Point(v2_0.mousePointer.position.x - v2_0.viewLeft, v2_0.mousePointer.position.y - v2_0.viewTop);
      }
      v2_0.pip.show(v2_0.getThumbnail(), room.board.displayBackgroundColor);
    } else if (!v3_0.which || v3_0.which == 1) {
      v3_0.preventDefault();
      var v3_2;
      if (room && room.myself) {
        v3_2 = room.myself.surface.getCurrentBrush();
      }
      if (v3_2 == "drag") {
        if (!v2_0.dragPoint) {
          v2_0.dragPoint = new Point(v2_0.mousePointer.position.x - v2_0.viewLeft, v2_0.mousePointer.position.y - v2_0.viewTop);
        }
        v2_0.pip.show(v2_0.getThumbnail(), room.board.displayBackgroundColor);
      } else if (v3_2 == "rotate") {
        if (!v2_0.dragPoint) {
          v2_0.dragPoint = new Point(0, 0);
          v2_0.setRotationPivot(v2_0.viewLeft + v2_0.viewWidth / 2, v2_0.viewTop + v2_0.viewHeight / 2);
          var v3_3 = Math.atan2(v3_1.x - v2_0.rotationPivotScreen.x, v3_1.y - v2_0.rotationPivotScreen.y);
          v2_0.dragInitialRotation = v3_3 * (180 / Math.PI) * -1 + 90;
          v2_0.dragRotation = room.board.rotation;
        }
      }
    }
  });
  this.boardContainer.find(".slate.myself").on(this.pointerEvent("down", "ui"), function (v3_0) {
    if (!v2_0.onFocus) {
      return;
    }
    if (!v2_0.isCurrentPointer(v3_0.pointerId)) {
      return;
    }
    if (!v2_0.preDraggingMode && (!v3_0.which || v3_0.which == 1)) {
      v3_0.preventDefault();
      var v3_1 = v2_0.getInputPosition(v3_0);
      v2_0.mousePointer.move(v3_1.x, v3_1.y);
      v2_0.hovering = true;
      v2_0.updateInputDevice(v3_0);
      var v3_2;
      if (room && room.myself) {
        v3_2 = room.myself.surface.getCurrentBrush();
      }
      if (v2_0.drawingAllowed()) {
        if (!v2_0.uploadMode || v2_0.uploadMode && !room.myself.surface.getBrushDrawingTool()) {
          var v3_3 = v2_0.screenToBoard(v3_1.x, v3_1.y);
          room.myself.surface.penDown(v0_15(v3_3.x), v0_15(v3_3.y));
        }
      }
      if (room && room.myself) {
        if (v2_0.overBoard && room.myself.surface.getBrushShowPen()) {
          v2_0.showPen();
        } else {
          v2_0.hidePen();
        }
      }
    }
  });
  $(room.board.canvasContainer).on("mouseleave pointerleave", function (v3_0) {
    v2_0.mousePointer.cursor("auto");
  });
  $(room.board).on("scaleChanged", function (v3_0) {
    v2_0.updateViewLimits();
    v2_0.bottombar.setScale(parseInt(v3_0.scale * 1000) / 10);
    if (v3_0.center) {
      v2_0.centerBoard();
    }
    if (room.myself.surface.getCurrentBrush() == "selection" && v2_0.selectionToolbar.visible()) {
      v2_0.showSelectionToolbar();
    }
    $("body").get(0).style.setProperty("--ui-scale", v3_0.scale);
  });
  $(room.board).on("layerLocked layerUnlocked", function (v3_0) {
    v2_0.setupLayerPrivileges();
  });
  $(room.board).on("rotationChanged", function (v3_0) {
    v2_0.updateViewLimits();
    v2_0.bottombar.setRotation(parseInt(v3_0.rotation));
    if (v2_0.pip.isVisible()) {
      var v3_1 = v2_0.drawingArea.offset();
      var v3_2 = v2_0.screenToBoard(v3_1.left, v3_1.top);
      v2_0.pip.setView(v3_2.x, v3_2.y, UI.drawingArea.width(), UI.drawingArea.height(), room.board.scale, room.board.rotation);
    }
  });
  $(room.board).on("layerCountChange", function (v3_0) {
    v2_0._tmp = [];
    for (var v3_1 = 0; v3_1 < v3_0.oldLayers; v3_1++) {
      if (v3_1 in room.board.layers) {
        v2_0._tmp.push(room.board.layers[v3_1].getData());
      }
    }
    v2_0.undoDialog.reset();
    v2_0.sidebar.layerPreview.updatePreviews();
  });
  $(room.board).on("canvasSizeChange", function (v3_0) {
    v2_0._tmp = [];
    for (var v3_1 = 0; v3_1 < room.board.nLayers; v3_1++) {
      v2_0._tmp.push(room.board.layers[v3_1].getData());
    }
  });
  $(room.board).on("layerCountChanged", function (v3_0) {
    var v3_1 = 0;
    var v3_2 = v2_0._tmp.length;
    for (var v3_3 = 0; v3_3 < v3_0.layers; v3_3++) {
      if (v3_3 in v2_0._tmp) {
        room.board.layers[v3_3].putData(v2_0._tmp[v3_3]).then(function () {
          if (++v3_1 == v3_2) {
            v2_0.sidebar.layerPreview.updatePreviews();
          }
        }).catch(function (v7_0) {
          console.error("Error restoring layer data:", v7_0);
        });
      }
    }
    if (v3_0.layers < v3_0.oldLayers) {
      for (var v3_3 = v3_0.layers; v3_3 < v3_0.oldLayers; v3_3++) {
        room.board.layers[v3_0.layers - 1].putData(v2_0._tmp[v3_3]).then(function () {
          v2_0.sidebar.layerPreview.updatePreview(v3_0.layers - 1);
        }).catch(function (v7_0) {
          console.error("Error merging layer data:", v7_0);
        });
      }
    }
    v2_0.sidebar.layerPreview.updateLayerCount();
    v2_0._tmp = null;
    v2_0.setupLayerPrivileges();
    $(room.myself.surface).triggerHandler(new brushChangedEvent(room.myself.surface.getCurrentBrush()).getEvent());
    if (room.myself.surface.currentLayer >= room.board.nLayers) {
      room.myself.surface.setCurrentLayer(0);
    }
  });
  $(this.uploader).on("imageChanged", function (v3_0) {
    if (room && room.myself) {
      v2_0.showPen();
      room.myself.surface.drawSilhouette(v3_0.x, v3_0.y, v3_0.width, v3_0.height, v3_0.rotation);
    }
  });
  $(this.uploader).on("uploaderOpened uploaderClosed", function (v3_0) {
    if (room.myself.surface.getCurrentBrush() == "selection") {
      room.myself.surface.setBrushOptionReadOnly("multilayer", v3_0.type == "uploaderOpened");
    }
  });
}
