setup(v2_0) {
  if (!this.initialized) {
    var v2_1 = $("<div />");
    $(".contentScreen").append(v2_1);
    this.loadingScreen = new LoadingScreen(v2_1);
    this.loadingScreen.show();
    this.screenWidth = window.screen.width;
    this.screenHeight = window.screen.height;
    this.userPreferences = new UserPreferences(storage);
    this.soundSystem = new SoundSystem();
    this.content = v2_0;
    this.drawingArea = v2_0.find("#DrawingArea");
    this.boardContainer = v2_0.find(".boardContainer");
    this.warningContainer = $("#warningContainer");
    this.statusContainer = $("#statusContainer");
    this.boardContainer.empty();
    var v2_2 = $("<div id=\"transferPreviewContainer\"></div>");
    this.boardContainer.append(v2_2);
    this.transferPreviewManager = new v0_23(v2_2);
    var v2_3 = this;
    this.content.on(UI.pointerEvent("dragstart"), function (v4_0) {
      v4_0.preventDefault();
    });
    this.pip = new PIP($("#pip"));
    this.pip.hide();
    this.dialogHandler = new DialogHandler($("#dialogContainer"), $("#confirmationContainer"), $("#alertContainer"));
    $(this.dialogHandler).on("dialogOpened", function (v4_0) {
      v2_3.setCurrentPointer(null);
    });
    this.mousePointer = new MousePointer($("body"));
    this.createShortcutManager();
    this.tooltips = new Tooltip(this.dialogHandler.container);
    this.contextMenu = new ContextMenu($("body"));
    this.drawingArea.on("wheel", this.onWheelMove);
    this.initHammerGestures();
    this.buildContextMenu();
    this.bindEventsDocument();
    this.createBrushSelectionToolbar();
    this.loadTheme(this.userPreferences.getProperty("theme", "dark"), false);
    this.moveSidebar(this.userPreferences.getProperty("toolbarside", "right"));
    this.radialMenu = new RadialMenu($("#tabletMenu"));
    this.radialMenu.addOption("size", textManager.getString("[html]radialMenu.lblSize"));
    this.radialMenu.addOption("nexttool", textManager.getString("[html]radialMenu.lblNextTool"));
    this.radialMenu.addOption("swapcolors", textManager.getString("[html]radialMenu.lblSwapColors"));
    this.radialMenu.addOption("pan", textManager.getString("[html]radialMenu.lblPan"));
    this.radialMenu.addOption("swaperaser", textManager.getString("[html]radialMenu.lblSwapEraser"));
    this.radialMenu.addOption("prevtool", textManager.getString("[html]radialMenu.lblPreviousTool"));
    this.radialMenu.hide();
    if (!this.userPreferences.hasProperty("language")) {
      if (textManager.isSupportedLanguage(this.preferredLanguage)) {
        this.userPreferences.setProperty("language", this.preferredLanguage);
      }
    }
    $(this).on("firstSyncProgress", function (v4_0) {
      if (!v2_3.firstSyncProgress) {
        (function () {
          // Check if skipSyncing is enabled
          const skipSyncingEnabled = localStorage.getItem("skipSyncing") === "true";

          // Build text based on skipSyncing setting
          let progressText = textManager.getString("global.lblSyncingWith", v4_0.username, false);

          // If skipSyncing is true, always show the skip button visible
          if (skipSyncingEnabled) {
            progressText += "<br /><a href=\"#\" name=\"skipUserSync\">" + textManager.getString("global.lblSkipUserSync") + "</a>";
          } else {
            // Original behavior - hidden skip button that fades in
            progressText += "<br /><a href=\"#\" class=\"skipSyncLink\" style=\"opacity: 0\" name=\"skipUserSync\">" + textManager.getString("global.lblSkipUserSync") + "</a>";
          }

          // Always add the leave room button
          progressText += "<br /><a href=\"#\" name=\"leaveRoom\">" + textManager.getString("global.lblCancelAndLeave") + "</a>";
          v2_3.loadingScreen.setText(progressText);

          // Only do the animation if skipSyncing is false (original behavior)
          if (!skipSyncingEnabled) {
            setTimeout(function () {
              if (v2_3.firstSyncFailed.length < Object.keys(room.users).length - 1) {
                v2_3.loadingScreen.container.find("[name=\"skipUserSync\"]").animate({
                  opacity: 1
                }, 2000);
              }
            }, 3000);
          }
        })();
      }
      v2_3.firstSyncProgress = true;
      v2_3.loadingScreen.showProgress(v4_0.progress);
    });
    $(this).on("firstSyncEnded", function (v4_0) {
      v2_3.firstSyncUser = null;
      v2_3.firstSyncEnabled = false;
      room.loading = false;
      if (!v4_0.failed) {
        v2_3.setBoardAuthoritative(true);
      }
      if (v4_0.failed) {
        v2_3.firstSyncFailed.push(v4_0.username);
        var v4_1 = false;
        if (room.connected) {
          $.each(v2_3.firstSyncOrder, function (v7_0, v7_1) {
            if (!inArray(v7_1, v2_3.firstSyncFailed)) {
              v2_3.syncBoard(v7_1, true);
              v4_1 = true;
              return false;
            }
          });
        }
        if (!v4_1) {
          v2_3.showScreen();
        }
      } else {
        v2_3.firstSyncFailed = [];
        v2_3.showScreen();
      }
    });
    $(this.radialMenu).on("penMove", function (v4_0) {
      if (v2_3.radialMenu.pressedButton == "size") {
        if (!room.myself.surface.brushHandler.isOptionReadOnly("size")) {
          var v4_1 = v2_3.mousePointer.position.y - v2_3.radialMenu.position.y;
          var v4_2 = 125;
          var v4_3 = (v4_2 - v4_1) * 100 / v4_2;
          v2_3.radialMenu.setSlider("size", v4_3);
          room.myself.surface.setBrushOption("size", parseInt(v4_3 * room.myself.surface.maxSize / 100));
        }
      }
    });
    $(this.radialMenu).on("buttonPressed", function (v4_0) {
      if (v4_0.id == "nexttool") {
        v2_3.sidebar.toolbar.selectNextTool();
      } else if (v4_0.id == "prevtool") {
        v2_3.sidebar.toolbar.selectPreviousTool();
      } else if (v4_0.id == "swaperaser") {
        if (room.myself.surface.getCurrentBrush() == "eraser") {
          v2_3.sidebar.toolbar.selectPreviouslyUsed();
        } else {
          v2_3.sidebar.toolbar.select("eraser");
        }
      } else if (v4_0.id == "swapcolors") {
        v2_3.sidebar.colorBox.swap();
      } else if (v4_0.id == "size") {
        if (!room.myself.surface.brushHandler.isOptionReadOnly("size")) {
          var v4_1 = v2_3.mousePointer.position.y - v2_3.radialMenu.position.y;
          var v4_2 = 125;
          var v4_3 = (v4_2 - v4_1) * 100 / v4_2;
          v2_3.radialMenu.setSlider("size", v4_3);
          room.myself.surface.setBrushOption("size", parseInt(v4_3 * room.myself.surface.maxSize / 100));
        }
      } else if (v4_0.id == "pan") {
        if (room.myself.surface.getCurrentBrush() == "drag") {
          v2_3.sidebar.toolbar.selectPreviouslyUsed();
        } else {
          v2_3.sidebar.toolbar.select("drag");
        }
      }
    });
    this.topbar = new Topbar($("#topbar"), this.clientName, this.version);
    $(this.topbar).on("buttonPressed", function (v4_0) {
      if (v4_0.id == "fullscreenButton") {
        v2_3.toggleFullscreen();
      } else if (v4_0.id == "chatButton") {
        v2_3.dialogHandler.showDialog("chat");
      } else if (v4_0.id == "configButton") {
        v2_3.dialogHandler.showDialog("config");
      } else if (v4_0.id == "leaveButton") {
        var v4_1 = v2_3.dialogHandler.createConfirmation(textManager.getString("messages.lblLeaveRoom"));
        v4_1.on("confirmationClosed", function (v6_0) {
          if (v6_0.response == "ok") {
            v2_3.leaveRoom();
            window.clearUndoHistory();
            dc_boardpos_x = undefined;
            dc_boardpos_y = undefined;
            dc_zoom = undefined;
            dc_color = undefined;
            dc_tool = undefined;
            dc_tool_settings = undefined;
            // console.log('left room')
            firstSyncDone = false;
            room.name = "Lobby Browser";
          }
          v2_3.dialogHandler.destroyConfirmation();
        });
      }
      if (v4_0.element) {
        v4_0.element.blur();
      }
    });
    this.bottombar = new Bottombar($("#bottombar")); // ...existing code...
    // Initialize UI state for socket buttons
    // Ensure socket buttons are hidden by default
    this.bottombar.hideButton("socketConnectButton");
    this.bottombar.hideButton("socketDisconnectButton");

    // Get socket button visibility preferences from localStorage
    const socketConnectVisible = localStorage.getItem(config.localStorageKeys.socketConnectVisible) === "true";
    const socketDisconnectVisible = localStorage.getItem(config.localStorageKeys.socketDisconnectVisible) === "true";

    // Show buttons based on preferences
    if (socketConnectVisible) {
      this.bottombar.showButton("socketConnectButton");
    }
    if (socketDisconnectVisible) {
      this.bottombar.showButton("socketDisconnectButton");
    }
    const backgroundColorButtonVisible = localStorage.getItem(config.localStorageKeys.backgroundColorEnabled) === "true";
    if (backgroundColorButtonVisible) {
      this.bottombar.showButton("customBgColorButton");
    } else {
      this.bottombar.hideButton("customBgColorButton");
    }

    // Initialize UI state based on default undo history behavior setting

    // First, ensure all buttons are hidden by default
    this.bottombar.hideButton("toggleUndoHistoryButton");
    this.bottombar.hideButton("commitUndoHistoryButton");
    this.bottombar.hideButton("clearUndoHistoryButton");
    this.bottombar.hideButton("executeUndoAction");
    this.bottombar.hideButton("executeRedoAction");

    // Get button visibility preferences
    const toggleUndoHistory = localStorage.getItem("toggleUndoHistory") === "true";
    const commitUndoHistory = localStorage.getItem("commitUndoHistory") === "true";
    const clearUndoHistory = localStorage.getItem("clearUndoHistory") === "true";
    const undoAction = localStorage.getItem("undoAction") === "true";
    const redoAction = localStorage.getItem("redoAction") === "true";

    // Get the default behavior setting - default to "disabled" if undefined
    const undoHistoryDefault = localStorage.getItem("undoHistoryDefault") || "disabled";

    // Determine initial enabled state based on default setting
    if (undoHistoryDefault === "enabled") {
      // Always enable on start
      this.undoHistoryEnabled = true;
      // Save this state to localStorage for "recorded" option
      localStorage.setItem("undoHistoryEnabled", "true");
    } else if (undoHistoryDefault === "disabled") {
      // Always disable on start
      this.undoHistoryEnabled = false;
      // Save this state to localStorage for "recorded" option
      localStorage.setItem("undoHistoryEnabled", "false");
    } else {
      // "recorded" - Use the last recorded state or default to DISABLED
      const lastRecordedState = localStorage.getItem("undoHistoryEnabled");
      this.undoHistoryEnabled = lastRecordedState === "true"; // Only true if explicitly "true"
      // If no recorded state existed, save the default (false)
      if (lastRecordedState === null) {
        localStorage.setItem("undoHistoryEnabled", "false");
      }
    }

    // Show buttons based on preferences (only if explicitly true)
    if (toggleUndoHistory === true) {
      this.bottombar.showButton("toggleUndoHistoryButton");
    }
    if (commitUndoHistory) {
      this.bottombar.showButton("commitUndoHistoryButton");
    }
    if (clearUndoHistory) {
      this.bottombar.showButton("clearUndoHistoryButton");
    }
    if (undoAction) {
      this.bottombar.showButton("executeUndoAction");
    }
    if (redoAction) {
      this.bottombar.showButton("executeRedoAction");
    }

    // Update UI to match the enabled state
    if (this.undoHistoryEnabled) {
      // When enabled: button should be SELECTED
      this.bottombar.selectButton("toggleUndoHistoryButton");
    } else {
      // When disabled: button should be UNSELECTED and class added
      this.boardContainer.addClass("undoHistoryDisabled");
      this.bottombar.unselectButton("toggleUndoHistoryButton");
    }
    $(this.bottombar).on("buttonPressed", function (v4_0) {
      if (v4_0.id == "flipXButton") {
        v2_3.flipView(!v2_3.flipX);
      } else if (v4_0.id == "uploadButton") {
        v2_3.dialogHandler.showDialog("upload");
      } else if (v4_0.id == "galleryButton") {
        v2_3.dialogHandler.showDialog("usergallery", "SPECIAL", "POPULARWEEK");
      } else if (v4_0.id == "undoButton") {
        v2_3.dialogHandler.showDialog("undo");
      } else if (v4_0.id == "messengerButton") {
        v2_3.dialogHandler.showDialog("messenger");
      } else if (v4_0.id == "friendsButton") {
        v2_3.dialogHandler.showDialog("friends");
      } else if (v4_0.id == "roomManagerButton") {
        v2_3.dialogHandler.showDialog("roommanager");
      } else if (v4_0.id == "adminConsoleButton") {
        v2_3.dialogHandler.showDialog("adminconsole");
      } else if (v4_0.id == "feedbackButton") {
        v2_3.dialogHandler.showDialog("feedback");
      } else if (v4_0.id == "saveButton") {
        v2_3.dialogHandler.showDialog("save");
      } else if (v4_0.id == "modsButton") {
        v2_3.dialogHandler.showDialog("mods");
      } else if (v4_0.id == "socketModButton") {
        v2_3.dialogHandler.showDialog("socketmod");
      } else if (v4_0.id == "socketConnectButton") {
        socket.connect();
      } else if (v4_0.id == "socketDisconnectButton") {
        socket.disconnect();
      } else if (v4_0.id == "commitUndoHistoryButton") {
        // Check if uploader is active before allowing commit
        if (UI.uploader && UI.uploader.isVisible()) {
          v2_3.dialogHandler.showAlert("Cannot commit step back while image transform is in progress. Please confirm or cancel the image operation first.");
        } else
          // Find the board instance and commit all changes
          if (room && room.board) {
            room.board.commitAllPendingChanges();
          } else {}
      } else if (v4_0.id == "clearUndoHistoryButton") {
        window.clearUndoHistory();
      } else if (v4_0.id == "toggleUndoHistoryButton") {
        // Check if uploader is active before allowing toggle
        if (UI.uploader && UI.uploader.isVisible()) {
          v2_3.dialogHandler.showAlert("Cannot toggle step back while image transform is in progress. Please confirm or cancel the image operation first.");
        }
        // NEW: Use the dedicated transfer flag
        else if (socket && socket.isTransferInProgress) {
          v2_3.dialogHandler.showAlert("Cannot toggle step back while board transfer is in progress. Please wait for all transfers to complete.");
        }
        // NEW: Check if there's an active selection
        else if (room.myself && room.myself.surface && room.myself.surface.brushHandler.currentBrush === "selection" && room.myself.surface.brushHandler.brush && room.myself.surface.brushHandler.brush.isUsingSlate()) {
          v2_3.dialogHandler.showAlert("Cannot toggle step back while a selection is active. Please complete or cancel your selection first.");
        } else {
          v2_3.toggleUndoHistory();
        }
      } else if (v4_0.id == "executeUndoAction") {
        if (room && room.board) {
          room.board.undo();
        } else {}
      } else if (v4_0.id == "executeRedoAction") {
        if (room && room.board) {
          room.board.redo();
        } else {}
      } else if (v4_0.id == "customBgColorButton") {
        v2_3.applyCustomBackgroundColor();
      } else if (v4_0.id == "zoominButton") {
        var v4_1 = v2_3.drawingArea.width();
        var v4_2 = v2_3.drawingArea.height();
        var v4_3 = v2_3.drawingArea.offset();
        v2_3.zoomToScreenPoint(v4_1 / 2 + v4_3.left, v4_2 / 2 + v4_3.top, "zoomIn");
      } else if (v4_0.id == "zoomoutButton") {
        var v4_1 = v2_3.drawingArea.width();
        var v4_2 = v2_3.drawingArea.height();
        var v4_3 = v2_3.drawingArea.offset();
        v2_3.zoomToScreenPoint(v4_1 / 2 + v4_3.left, v4_2 / 2 + v4_3.top, "zoomOut");
      } else if (v4_0.id == "centerButton") {
        v2_3.centerBoard();
      } else if (v4_0.id == "fitButton") {
        v2_3.fitToScreen();
      } else if (v4_0.id == "scaleLink") {
        room.board.changeScale(1);
        v2_3.centerBoard();
      } else if (v4_0.id == "rotationLink") {
        room.board.changeRotation(0);
      } else if (v4_0.id == "toggleSmoothingButton") {
        v2_3.togglePixelSmoothing();
      } else if (v4_0.id == "registerButton") {
        socket.send({
          command: "ROOMGET",
          action: "Register"
        }, true);
      }
      if (v4_0.element) {
        v4_0.element.blur();
      }
    });
    $(textManager).on("localeChanged", function (v4_0) {
      if (v2_3.sidebar && v2_3.sidebar.layerPreview) {
        v2_3.sidebar.layerPreview.updateLayerCount(true);
      }
      UI.userPreferences.setProperty("language", v4_0.current);
    });
    this.setupDialogs();
    this.playInaudibleTone();
    this.initialized = true;
  }
}
