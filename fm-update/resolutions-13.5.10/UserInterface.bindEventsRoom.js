bindEventsRoom() {
  var v2_0 = this;
  $(room).on("roomChanged", function (v3_0) {
    v2_0.chatDialog.reset();
    room.board.clearLayers();
  });
  $(room).on("roomConnected", function (v3_0) {
    if (v2_0.loginDialog.active) {
      v2_0.loginDialog.hide();
    }
    room.createSession();
    v2_0.firstSyncFailed = [];
    v2_0.firstSyncOrder = [];
    v2_0.sidebar.userList.addMyself();
    room.myself.surface.setUsername(room.myself.username);
    if (v2_0.userPreferences.getGroupOption("graphics", "showusername", true)) {
      room.myself.surface.cursor.showUsername();
    } else {
      room.myself.surface.cursor.hideUsername();
    }
    window.history.pushState("", v3_0.room, "/r/" + v3_0.room);
    v2_0.topbar.setText("DEFAULT", UI.baseURL + "/r/" + v3_0.room);
    v2_0.chatDialog.bindRoomEvents();
    if (v3_0.description.trim() != "" && !v3_0.isquickreconnect) {
      v2_0.chatDialog.createMessage("public", "room", "MOTD", v0_5(v3_0.description));
    }
    $(document).prop("title", "#" + v3_0.room + " - flockmoD");
    v2_0.sidebar.userList.refresh();
    v2_0.sidebar.layerPreview.updateLayerCount();
    v2_0.sidebar.layerPreview.highlight(room.myself.surface.currentLayer);
    v2_0.sidebar.toolbar.highlight(room.myself.surface.getCurrentBrush());
    v2_0.topbar.showButton("chatButton");
    let v3_1 = room.myself.surface.getCurrentBrush();
    let v3_2 = room.myself.surface.drawColor;
    $(room.myself.surface).triggerHandler(new brushChangedEvent(v3_1).getEvent());
    $(room.myself.surface).triggerHandler(new colorChangedEvent(v3_2).getEvent());
    v2_0.sidebar.toolbar.select(v3_1);
    room.myself.surface.setColor(v3_2);
    v2_0.warnExit = true;
    if (!v3_0.isquickreconnect) {
      setTimeout(function (v5_0) {
        room.board.changeRotation(0);
        v2_0.fitToScreen();
        v2_0.boardContainer.fadeIn(1500);
        v2_0.updateViewLimits();
        v2_0.centerBoard();
      }, 1000);
    }
  });
  $(room).on("roomDisconnected", function (v3_0) {
    $(document).prop("title", "flockmoD");
    if (v2_0.selectionToolbar.visible()) {
      v2_0.selectionToolbar.hide();
    }
    v2_0.chatDialog.unbindRoomEvents();
    v2_0.undoDialog.pause();
    v2_0.uploader.cancel();
    v2_0.sidebar.layerPreview.reset();
    if (v2_0.transferPreviewManager) {
      v2_0.transferPreviewManager.clear();
    }
    v2_0.warnExit = false;
    v2_0.topbar.hideButton("chatButton");
    var v3_1 = Object.keys(room.users || {});
    $.each(v3_1, function (v4_0, v4_1) {
      room.removeUser(v4_1);
    });
    v2_0.sidebar.userList.clear();
    room.myself.surface.clearSlate();
  });
  $(room).on("youLeft", function (v3_0) {
    v2_0.topbar.setText("DEFAULT", "Welcome to FlockMod");
    v2_0.boardContainer.fadeOut(400);
    v2_0.sidebar.collapse();
    v2_0.firstSyncFailed = [];
    v2_0.firstSyncOrder = [];
    room.session = 0;
    v2_0.clearMuteTime();
  });
  $(room).on("roomTypeChanged", function (v3_0) {
    if (v3_0.newType == "A") {
      room.board.drawGrid(room.animRows, room.animCols);
      v2_0.sidebar.showComponent("Animation");
    } else {
      room.board.clearGrid();
      v2_0.sidebar.hideComponent("Animation");
      if (v2_0.limitedViewSize) {
        v2_0.resetViewSize();
        v2_0.fitToScreen();
      }
    }
  });
  $(room).on("animationFrameChanged", function (v3_0) {
    if (room.type == "A") {
      room.board.drawGrid(v3_0.rows, v3_0.cols);
      if (v2_0.limitedViewSize) {
        v2_0.resetViewSize();
        v2_0.fitToScreen();
      }
    }
  });
  $(room).on("userJoined", function (v3_0) {
    v2_0.sidebar.userList.addUser(v3_0);
    v2_0.sidebar.userList.sort();
    var v3_1 = room.users[v3_0.username];
    v3_1.surface.slate.canvas.hide();
    room.myself.alone(room.users.length > 0);
    $(v3_1.surface).on("penShow", function (v4_0) {
      if (v3_1.surface.getCurrentBrush() == "text") {
        v3_1.surface.brushHandler.brush.positionText();
      }
    });
    var v3_2;
    var v3_3 = v2_0.userRank(v3_1.rank, false);
    var v3_4 = v3_1.username;
    var v3_5 = (v3_1.country ? " <img class=\"flagIcon\" src=\"" + UI.baseDir + "images/flags/" + v3_1.country + ".png\" alt=\"" + v3_1.country + "\" data-tooltip=\"" + v3_1.country + "\" />" : "") + (v3_1.proxy ? " <span data-tooltip=\"" + textManager.getString("events.txtProxy", null, false) + "\">" + new Icon("fa-network-wired").html() + "</span>" : "") + (v3_1.hasIP() ? " (" + v3_1.ip + ")" : "");
    if (v3_0.wasintheroom) {
      if (!v3_0.isquickreconnect) {
        v3_2 = textManager.getString("events.txtUserInRoom", [v3_3, v3_4, v3_5], false);
      }
    } else {
      v3_2 = textManager.getString("events.txtUserEnters", [v3_3, v3_4, v3_5], false) + (v3_0.isquickreconnect ? " (QUICK RECONNECT)" : "");
    }
    if (v3_2) {
      v2_0.chatDialog.createMessage("public", "room", "EVENT", v3_2);
      if (v2_0.chatDialog.existsChannel(v3_1.username, "user")) {
        v2_0.chatDialog.createMessage(v3_1.username, "user", "EVENT", v3_2);
      }
    }
  });
  $(room).on("userLeft", function (v3_0) {
    room.myself.alone(room.users.length > 0);
    if (v2_0.firstSyncEnabled && v2_0.firstSyncUser == v3_0.username) {
      $(v2_0).triggerHandler(new firstSyncEndedEvent(v3_0.username, true).getEvent());
    }
  });
  $(room).on("userLeaving", function (v3_0) {
    var v3_1 = room.users[v3_0.username];
    var v3_2 = v2_0.userRank(v3_1.rank, false);
    var v3_3 = v3_1.username;
    var v3_4 = (v3_1.country ? " <img class=\"flagIcon\" src=\"" + UI.baseDir + "images/flags/" + v3_1.country + ".png\" alt=\"" + v3_1.country + "\" data-tooltip=\"" + v3_1.country + "\" />" : "") + (v3_1.proxy ? " <span data-tooltip=\"Proxy\">" + new Icon("fa-network-wired").html() + "</span>" : "") + (v3_1.hasIP() ? " (" + v3_1.ip + ")" : "");
    var v3_5 = v3_0.reason && v3_0.reason != "LEFT_ROOM" ? " (" + v3_0.reason + ")" : "";
    var v3_6 = textManager.getString("events.txtUserLeaves", [v3_2, v3_3, v3_4, v3_5], false);
    v2_0.chatDialog.createMessage("public", "room", "EVENT", v3_6);
    if (v2_0.chatDialog.existsChannel(v3_1.username, "user")) {
      v2_0.chatDialog.createMessage(v3_1.username, "user", "EVENT", v3_6);
    }
    v2_0.sidebar.userList.removeUser(v3_0);
    $.each(room.transfers, function (v4_0, v4_1) {
      if (v4_1.username == v3_0.username && !v4_1.completed && !v4_1.failed) {
        v4_1.fail();
      }
    });
  });
  $(room).on("muteTimerStarted", function (v3_0) {
    v2_0.muteTime(v3_0.time);
  });
  $(room).on("roomPrivilegesChanged", function (v3_0) {
    v2_0.setupPrivileges(room.privileges);
  });
  $(room).on("userRenamed", function (v3_0) {
    var v3_1 = v2_0.userRank(v3_0.beforeRank, false);
    var v3_2 = v2_0.userRank(v3_0.afterRank, false);
    var v3_3 = textManager.getString("events.txtNowKnown", [v3_1, v3_0.beforeUsername, v3_2, v3_0.afterUsername], false);
    v2_0.chatDialog.createMessage("public", "room", "EVENT", v3_3);
    if (v2_0.chatDialog.existsChannel(v3_0.beforeUsername, "user")) {
      v2_0.chatDialog.createMessage(v3_0.beforeUsername, "user", "EVENT", v3_3);
    }
    if (v2_0.chatDialog.existsChannel(v3_0.afterUsername, "user")) {
      v2_0.chatDialog.createMessage(v3_0.afterUsername, "user", "EVENT", v3_3);
    }
  });
  $(room).on("roomToolsChanged", function (v3_0) {
    v2_0.setupTools(room.tools);
  });
  $(room.myself).on("muteChanged", function (v3_0) {
    if (!v3_0.status) {
      v2_0.syncBrushes();
      v2_0.clearMuteTime();
      v2_0.bottombar.setText("");
    }
  });
  $(room.myself).on("rankChanged", function (v3_0) {
    v2_0.setupPrivileges(room.privileges);
    v2_0.setupTools(room.tools);
    v2_0.profileDialog.checkAccountType();
  });
  $(room.myself.surface).on("colorChanged", function (v3_0) {
    v2_0.sidebar.colorBox.setPrimary(v3_0.color);
    v2_0.sidebar.colorWheel.setColor(v3_0.color);
  });
  $(room.myself.surface).on("brushOptionChanged", function (v3_0) {
    v2_0.savedOption[v3_0.option] = v3_0.value;
  });
  $(room.myself.surface).on("penDown", function (v3_0) {
    var v3_1 = room.myself.surface.getCurrentBrush();
    if (v3_1 == "selection" && v2_0.selectionToolbar.visible()) {
      v2_0.selectionToolbar.hide();
    }
  });
  $(room.myself.surface).on("penUp", function (v3_0) {
    var v3_1 = room.myself.surface.getCurrentBrush();
    if (v3_1 == "selection") {
      var v3_2 = room.myself.surface.brushHandler.brush;
      if (v3_2.moved || v3_2.getOption("selectionmode")) {
        v2_0.showSelectionToolbar();
      }
    }
  });
  $(room.myself.surface).on("brushChanged", function (v3_0) {
    v2_0.setCurrentPointer(null);
    var v3_1 = room.myself.surface.getCurrentBrush();
    if (v3_1 != "selection" && v2_0.selectionToolbar.visible()) {
      v2_0.selectionToolbar.hide();
    }
    $.each(room.myself.surface.getBrushOptions(), function (v4_0, v4_1) {
      if (v2_0.userPreferences.getGroupOption("syncedoptions", v4_0)) {
        if (v4_0 in v2_0.savedOption) {
          if (!room.myself.surface.isBrushOptionReadOnly(v4_0)) {
            room.myself.surface.setBrushOption(v4_0, v2_0.savedOption[v4_0]);
          }
        }
      }
    });
    if (v2_0.radialMenu.isVisible()) {
      var v3_2 = room.myself.surface.brushHandler.getOption("size");
      v2_0.radialMenu.setSlider("size", v3_2 * 100 / room.myself.surface.maxSize);
    }
  });
  $(room.myself).on("userUnwanted", function (v3_0) {
    setTimeout(function () {
      socket.disconnect(true);
      socket = null;
      if (v3_0.reason == "ban") {
        var v4_0 = textManager.getString("alerts.txtYouHaveBeenBanned");
        if (v3_0.message) {
          v4_0 += "<br /><span class=\"smallDate\">" + escapeHTML(v3_0.message) + "</span>";
        }
        UI.hideScreen(v4_0, false, 1, "fa-radiation-alt");
      } else if (v3_0.reason == "kick") {
        UI.hideScreen(textManager.getString("alerts.txtYouHaveBeenKicked"), false, 1, "fa-exclamation-circle");
      }
    }, 1000);
  });
  $(room.board).on("backgroundColorChanged", function (v3_0) {
    v2_0.boardContainer.css("background-color", v3_0.newColor);
  });
  $(room.board).on("canvasSizeChanged", function (v3_0) {
    v2_0.boardContainer.css({
      width: v3_0.newWidth,
      height: v3_0.newHeight
    });
    room.myself.surface.slate.changeSize(v3_0.newWidth, v3_0.newHeight);
    $.each(room.users, function (v4_0, v4_1) {
      v4_1.surface.slate.changeSize(v3_0.newWidth, v3_0.newHeight);
    });
    v2_0.undoDialog.reset();
    v2_0.sidebar.layerPreview.updatePreviewSize();
    v2_0.fitToScreen();
    v2_0.centerBoard();
    if (v2_0.uploader.isVisible()) {
      if (v2_0.uploader.isOutOfBounds()) {
        v2_0.uploader.resetPosition();
      }
    }
    for (var v3_1 = 0; v3_1 < room.board.nLayers; v3_1++) {
      if (v3_1 in v2_0._tmp) {
        room.board.putLayerData(v3_1, v2_0._tmp[v3_1], 0, 0, v3_0.newWidth, v3_0.newHeight);
      }
    }
    v2_0._tmp = null;
  });
  $(v2_0).on("viewFlipped", function (v3_0) {
    if (room.myself.surface.getCurrentBrush() == "selection" && v2_0.selectionToolbar.visible()) {
      v2_0.showSelectionToolbar();
    }
  });
}
