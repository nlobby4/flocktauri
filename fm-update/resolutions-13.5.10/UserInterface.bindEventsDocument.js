bindEventsDocument() {
  var v2_0 = this;
  $(window).on("beforeunload", function () {
    if (v2_0.warnExit) {
      return true;
    }
  });
  $(this).on("windowFocused", function (v3_0) {
    v2_0.onFocus = true;
  });
  $(this).on("windowBlurred", function (v3_0) {
    v2_0.onFocus = false;
    v2_0.shortcutManager.releaseShortcuts(v2_0.dialogHandler.openedDialogs > 0);
  });
  $(document).on("paste", function (v3_0) {
    if (v2_0.dialogHandler.hasActiveDialog()) {
      v2_0.dialogHandler.paste(v3_0);
      return;
    }
    if (room && room.myself) {
      if (v3_0.originalEvent.clipboardData && v3_0.originalEvent.clipboardData.files && v3_0.originalEvent.clipboardData.files.length > 0) {
        v3_0.preventDefault();
        v2_0.uploader.uploadFile(v3_0.originalEvent.clipboardData.files);
        return;
      }
      var v3_1 = room.myself.surface.getCurrentBrush() == "text" && room.myself.surface.brushHandler.brush.enabled;
      if (v3_1 && !UI.dialogHandler.hasActiveDialog()) {
        v3_0.preventDefault();
        var v3_2 = v3_0.originalEvent.clipboardData.getData("text");
        for (var v3_3 = 0; v3_3 < Math.min(v3_2.length, room.myself.surface.brushHandler.brush.maxLength - room.myself.surface.brushHandler.brush.getCurrentLength()); v3_3++) {
          if (v3_2[v3_3].charCodeAt(0) != 10) {
            room.myself.surface.keyPress(v3_2[v3_3].charCodeAt(0));
          }
        }
      }
    }
  });
  $(document).on(this.pointerEvent("move", "ui"), function (v3_0) {
    if (!v2_0.onFocus) {
      return;
    }
    if (v2_0.pinching) {
      return;
    }
    if (!v2_0.isCurrentPointer(v3_0.pointerId)) {
      return;
    }
    var v3_1 = v2_0.getInputPosition(v3_0);
    if (v2_0.mousePointer && v2_0.mousePointer.position && v2_0.mousePointer.position.x == v3_1.x && v2_0.mousePointer.position.y == v3_1.y) {
      return;
    }
    v2_0.mousePointer.move(v3_1.x, v3_1.y);
    v2_0.overBoard = v2_0.mouseOverBoard();
    v2_0.updateCursor(); // _0x32c21d["originalEvent"]["pressure"] && (_0x32c21d["pointerType"] == "mouse" ? _0x1de768["updatePressure"](1) : (_0x1de768["updatePressure"]((Math.round(_0x32c21d["originalEvent"]["pressure"] * 1000) / 1000))));
    var enable1000PressureLevels = localStorage.getItem("enable1000PressureLevels") === "true";
    if (enable1000PressureLevels) {
      if (v3_0.originalEvent.pressure) {
        if (v3_0.pointerType == "mouse" && room?.myself?.surface?.penPressed) {
          v2_0.updatePressure(1);
        } else if (room?.myself?.surface?.penPressed) {
          v2_0.updatePressure(Math.round(v3_0.originalEvent.pressure * 1000) / 1000);
        } else {
          null;
        }
      }
    } else if (v3_0.originalEvent.pressure) {
      if (v3_0.pointerType == "mouse" && room?.myself?.surface?.penPressed) {
        v2_0.updatePressure(1);
      } else if (room?.myself?.surface?.penPressed) {
        v2_0.updatePressure(Math.round(v3_0.originalEvent.pressure * 10) / 10);
      } else {
        null;
      }
    }
    var v3_2;
    if (room && room.myself) {
      v3_2 = room.myself.surface.getCurrentBrush();
    }
    if (v2_0.dialogHandler.draggingDialog() || v2_0.dialogHandler.resizingDialog()) {
      v2_0.dialogHandler.mouseMove(v3_1.x, v3_1.y);
    } else if (v3_2 == "drag" || v2_0.draggingMode) {
      if (v2_0.dragPoint && !v2_0.pinching) {
        var v3_3 = v2_0.drawingArea.offset();
        v2_0.moveBoard(v3_1.x - v3_3.left - v2_0.dragPoint.x, v3_1.y - v3_3.top - v2_0.dragPoint.y);
      }
    } else if (v3_2 == "rotate") {
      if (v2_0.dragPoint && !v2_0.pinching) {
        var v3_4 = Math.atan2(v3_1.x - v2_0.rotationPivotScreen.x, v3_1.y - v2_0.rotationPivotScreen.y);
        var v3_5 = v3_4 * (180 / Math.PI) * -1 + 90;
        v3_5 = v2_0.dragRotation + v3_5 - v2_0.dragInitialRotation;
        if (v2_0.holdingSHIFT) {
          v3_5 = angleSnap(v3_5);
        }
        room.board.changeRotation(v3_5);
      }
    } else if (!v2_0.uploadMode) {
      if (room && room.myself) {
        if (v2_0.drawingAllowed() && room.myself.surface.getBrushShowPen()) {
          if (v2_0.overBoard || room.myself.surface.penPressed) {
            var v3_6 = v2_0.screenToBoard(v3_1.x, v3_1.y);
            room.myself.surface.penMove(v0_15(v3_6.x), v0_15(v3_6.y));
          }
        }
        if (v2_0.overBoard && room.myself.surface.getBrushShowPen()) {
          v2_0.showPen();
        } else {
          v2_0.hidePen();
        }
      }
    } else {
      v2_0.uploader.mouseMove(v3_1.x, v3_1.y);
    }
  });
  $(document).on(this.pointerEvent("up", "ui"), function (v3_0) {
    if (!v2_0.isCurrentPointer(v3_0.pointerId)) {
      return;
    } else {
      v2_0.setCurrentPointer(null);
    }
    v3_0.preventDefault();
    if (!v2_0.draggingMode && (!v3_0.which || v3_0.which == 1)) {
      var v3_1 = v2_0.getInputPosition(v3_0);
      if (v3_0.type == "touchend") {
        v3_1 = new Point(v2_0.mousePointer.position.x, v2_0.mousePointer.position.y);
      }
      v2_0.mousePointer.move(v3_1.x, v3_1.y);
      if (!v2_0.onFocus) {
        return;
      }
      v2_0.hovering = false;
      if (v2_0.dialogHandler.draggingDialog() || v2_0.dialogHandler.resizingDialog()) {
        v2_0.dialogHandler.mouseUp(v3_1.x, v3_1.y);
      } else if (room && room.myself) {
        if (room.myself.surface.getCurrentBrush() == "picker") {
          if (v2_0.mouseOverBoard()) {
            var v3_2 = 5;
            var v3_3 = room.myself.surface.brushHandler.getOption("size");
            var v3_4 = room.myself.surface.brushHandler.getOption("areaaverage") && v3_3 > v3_2;
            if (!v3_4) {
              var v3_5 = v2_0.screenToBoard(v3_1.x, v3_1.y);
              var v3_6 = room.board.getPixelAllLayers(v3_5.x, v3_5.y);
              var v3_7 = "rgb(" + v3_6[0] + "," + v3_6[1] + "," + v3_6[2] + ")";
              v2_0.colorChange(v3_7);
            } else {
              var v3_5 = v2_0.screenToBoard(v3_1.x, v3_1.y);
              var v3_8 = room.board.getAllLayers(v3_5.x - v3_3 / 2, v3_5.y - v3_3 / 2, v3_3, v3_3);
              v3_8.then(function (v9_0) {
                var v9_1 = new AdvancedCanvas(v3_3, v3_3);
                let v9_2 = 0;
                for (let v10_0 in v9_0) {
                  v9_2++;
                }
                var v9_3 = {};
                var v9_4 = [];
                $.each(v9_0, function (v10_0, v10_1) {
                  v9_4.push(v0_19(v10_1).then(function (v11_0) {
                    v9_3[v10_0] = v11_0;
                  }));
                });
                Promise.all(v9_4).then(function () {
                  for (var v10_0 = 0; v10_0 < room.board.nLayers; v10_0++) {
                    if (v10_0 in v9_3) {
                      v9_1.drawImage(v9_3[v10_0], 0, 0);
                    }
                  }
                  var v10_1 = getRadialAvg(v9_1.getImageData(), v3_3 / 2, v3_3 / 2, v3_3 / 2, room.board.displayBackgroundColor);
                  v10_1 = rgba2rgb(v10_1[0], v10_1[1], v10_1[2], v10_1[3] / 255);
                  var v10_2 = "rgb(" + v10_1.r + "," + v10_1.g + "," + v10_1.b + ")";
                  v2_0.colorChange(v10_2);
                  v9_1.remove();
                });
              });
            }
            if (v2_0.userPreferences.getGroupOption("tools", "colorpickerswitch", false)) {
              v2_0.sidebar.toolbar.selectPreviouslyUsed();
            }
          }
        } else if (room.myself.surface.penPressed) {
          var v3_5 = v2_0.screenToBoard(v3_1.x, v3_1.y);
          room.myself.surface.penUp(v0_15(v3_5.x), v0_15(v3_5.y));
        }
        if (room.myself.surface.getCurrentBrush() == "custom") {
          if (v2_0.mouseOverBoard()) {
            if (!v2_0.hasSetCustomBrush) {
              v2_0.dialogHandler.showAlert(textManager.getString("alerts.txtSetCustomBrush"));
            }
          }
        }
        if (v2_0.uploadMode) {
          v2_0.uploader.mouseUp(v3_1.x, v3_1.y);
        }
      }
    }
    v2_0.dragPoint = null;
    v2_0.dragRotation = 0;
    v2_0.dragInitialRotation = 0;
    v2_0.drag(false);
    v2_0.pip.hide();
  });
  $(document).on("fullscreenchange", function (v3_0) {
    v2_0.fitToScreen();
    v2_0.centerBoard();
  });
  $(window).on("resize", function (v3_0) {
    if (room && room.board) {
      if (v2_0.drawingArea.height() < v2_0.boardContainer.height() * room.board.scale || v2_0.drawingArea.width() < v2_0.boardContainer.width() * room.board.scale) {
        v2_0.fitToScreen();
      }
    }
    v2_0.centerBoard();
    if (v2_0.resizeTimeout === undefined) {
      $(v2_0).triggerHandler(new windowResizingStartedEvent().getEvent());
    } else {
      clearTimeout(v2_0.resizeTimeout);
    }
    v2_0.resizeTimeout = setTimeout(v2_0.windowResizeEnded, 500);
  });
  $(window).on("focus", function (v3_0) {
    this.focusTimer = setTimeout(function () {
      $(v2_0).triggerHandler(new windowFocusedEvent().getEvent());
    }, 250);
  });
  $(window).on("blur", function (v3_0) {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
    $(v2_0).triggerHandler(new windowBlurredEvent().getEvent());
  });
  $(document).on("visibilitychange", function (v3_0) {
    if (room && room.myself) {
      room.myself.changeInactive(document.visibilityState == "hidden");
    }
  });
  $(this.boardContainer).on(this.pointerEvent("over"), function (v3_0) {
    v2_0.hovering = true;
  });
  $(this.boardContainer).on(this.pointerEvent("out"), function (v3_0) {
    v2_0.hovering = false;
  });
  $(document).on(this.pointerEvent("click"), "[name=\"leaveRoom\"]", function (v3_0) {
    v3_0.preventDefault();
    v2_0.topbar.pressButton("leaveButton");
  });
  $(document).on(this.pointerEvent("click"), "[name=\"skipUserSync\"]", function (v3_0) {
    v3_0.preventDefault();

    // Check if skipSyncing is enabled
    const skipSyncingEnabled = localStorage.getItem("skipSyncing") === "true";

    // Mark current sync attempt as failed
    $.each(room.transfers, function (v4_0, v4_1) {
      if (v4_1.ttype == "sync" && !v4_1.sending && !v4_1.completed && !v4_1.failed) {
        v4_1.fail();
      }
    });
    if (skipSyncingEnabled) {
      // Enhanced behavior when skipSyncing is enabled - continue to next user
      // Add the current user to failed syncs
      const currentSyncUser = v2_0.firstSyncUser;
      if (currentSyncUser) {
        if (!v2_0.firstSyncFailed) {
          v2_0.firstSyncFailed = [];
        }
        if (!v2_0.firstSyncFailed.includes(currentSyncUser)) {
          v2_0.firstSyncFailed.push(currentSyncUser);
        }
      }

      // Trigger the firstSyncEnded event to move to next user
      $(v2_0).triggerHandler(new firstSyncEndedEvent(currentSyncUser, true).getEvent());
    } else {
      // Original behavior - just hide the button
      v2_0.loadingScreen.container.find("[name=\"skipUserSync\"]").hide();
    }
  });
  $(document).on(this.pointerEvent("click"), "[name=\"socketReconnect\"]", function (v3_0) {
    v3_0.preventDefault();
    $("#warningContainer").empty();
    cm.reset();
    cm.reconnect(1);
  });
  $(document).on("keypress", this.onKeyPressed);
  $(document).on("keydown", this.onKeyDown);
  $(document).on("keyup", this.onKeyUp);
  $(document.body).on("copy", v3_0 => this.onCopy(v3_0));
}
