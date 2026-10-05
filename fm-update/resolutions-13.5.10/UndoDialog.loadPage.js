loadPage(v2_0) {
  var v2_1 = this;
  if (v2_0 !== undefined) {
    this.form.find(".subcontentOption").removeClass("selected");
    this.form.find(".subcontentOption[data-subcontent=" + v2_0 + "]").addClass("selected");
    this.loading(true);
    if (v2_0 == "preview") {
      this.loadSubcontent(this.loadFile("forms/undo.preview.html"));
      $(this.content).overlayScrollbars({
        className: "os-theme-light",
        overflowBehavior: {
          x: "hidden"
        }
      });
      this.slider = new Slider(this.content.find("#undoPosition"), 0, 1, 1, function (v5_0) {
        if (isNaN(v5_0)) {
          return "";
        } else {
          return v5_0 + 1;
        }
      });
      this.slider.setValue(0);
      this.slider.focus();
      $(this.slider).on("sliderMoved", function (v5_0) {
        if (v2_1.boards[v5_0.value]) {
          v2_1.preview(v5_0.value);
        }
      });
      if (!this.enabled) {
        this.content.find("#undoNow").addClass("disabled");
        this.slider.setReadOnly(true);
      }
      this.content.find("#undoNow").on(UI.pointerEvent("click"), function (v5_0) {
        v5_0.preventDefault();

        // Check for conditions that prevent undo
        if (socket && socket.isTransferInProgress) {
          UI.dialogHandler.showAlert("Cannot perform undo while board transfer is in progress. Please wait for all transfers to complete.");
        } else if (UI.undoHistoryEnabled) {
          UI.dialogHandler.showAlert("Cannot perform undo while step back is enabled. Please disable step back first.");
        } else if (UI.uploader && UI.uploader.isVisible()) {
          UI.dialogHandler.showAlert("Cannot perform undo while image transform is in progress. Please confirm or cancel the image operation first.");
        } else if (room && room.board && room.board.isProcessingCommit) {
          UI.dialogHandler.showAlert("Cannot perform undo while stroke commits are in progress. Please wait for all strokes to finish processing.");
        } else {
          v2_1.doUndo(v2_1.slider.getValue());
        }
      });
      $(this.content.find(".dialogContentArea")).overlayScrollbars({
        className: "os-theme-light",
        overflowBehavior: {
          x: "hidden"
        }
      });
      this.content.find("#undoPreview").css({
        "background-color": room.board.displayBackgroundColor,
        width: room.board.canvasWidth + "px",
        height: room.board.canvasHeight + "px"
      });
      this.content.find("#undoLayers").empty();
      this.layersCheckbox = [];
      for (var v2_2 = 0; v2_2 < room.board.nLayers; v2_2++) {
        var v2_3 = $("<div />");
        v2_3.css({
          float: "left",
          width: 100 / room.board.nLayers + "%"
        });
        v2_3.addClass("smallCheckbox");
        v2_3.attr("name", v2_2);
        this.content.find("#undoLayers").prepend(v2_3);
        var v2_4 = new Checkbox(v2_3, textManager.getString("undo.preview.lblLayer", v2_2 + 1, false));
        v2_4.setValue(true);
        this.layersCheckbox.push(v2_4);
        $(v2_4).on("checkboxChanged", function (v7_0) {
          v2_1.preview(v2_1.slider.getValue());
        });
      }
      this.undoViewer = new v0_3(this.content.find("#undoPreview"), room.board.canvasWidth, room.board.canvasHeight, true);
      this.undoViewer.setBackground(room.board.displayBackgroundColor);
      this.selection = this.undoViewer.selectionTool;
      this.content.find("#toolPan").on("click", function (v5_0) {
        v5_0.preventDefault();
        v2_1.undoViewer.setMode("pan");
        v2_1.currentTool = "pan";
        $(this).addClass("selectedTool").siblings("a").removeClass("selectedTool");
      });
      this.content.find("#toolLasso").on("click", function (v5_0) {
        v5_0.preventDefault();
        v2_1.undoViewer.setMode("lasso");
        v2_1.currentTool = "lasso";
        $(this).addClass("selectedTool").siblings("a").removeClass("selectedTool");
      });
      this.content.find("#toolRect").on("click", function (v5_0) {
        v5_0.preventDefault();
        v2_1.undoViewer.setMode("rect");
        v2_1.currentTool = "rectangle";
        $(this).addClass("selectedTool").siblings("a").removeClass("selectedTool");
      });
      this.content.find("#zoomIn").on("click", function (v5_0) {
        v5_0.preventDefault();
        v2_1.undoViewer.zoomIn();
      });
      this.content.find("#zoomOut").on("click", function (v5_0) {
        v5_0.preventDefault();
        v2_1.undoViewer.zoomOut();
      });
      this.content.find("#toolPan").addClass("selectedTool");
      UI.contextMenu.register({
        selector: "#undoPreview",
        build: function (v5_0) {
          var v5_1 = {
            callback: function (v6_0, v6_1) {
              if (v6_0 == "save") {
                var v6_2 = [];
                for (var v6_3 = 0; v6_3 < room.board.nLayers; v6_3++) {
                  if (v2_1.layersCheckbox[v6_3].getValue()) {
                    v6_2.push(v2_1.boards[v2_1.slider.getValue()][v6_3]);
                  }
                }
                UI.saveDialog.show("custom", v6_2);
              }
            },
            items: {
              save: {
                name: "Save selected layers",
                icon: "fa-floppy-disk"
              }
            }
          };
          $.each(v5_1.items, function (v6_0, v6_1) {
            v5_1.items[v6_0].name &&= function () {
              return textManager.getString("menu.undoPreview." + v6_0, null, false);
            };
          });
          return v5_1;
        }
      });
      this.slider.setup(0, this.boards.length - 1, 1);
      this.slider.setValue(this.slider.max);
      if (this.boards.length > 0) {
        this.undoViewer.loadLayers(this.boards[this.slider.max]);
      }
      this.preview(this.slider.getValue());
      this.refreshCurrenlyUsing();
      if (this.selectionPrevious && this.selectionPrevious.length > 0 && this.selectionInitial) {
        try {
          var v2_5 = this.selectionToolType || "rectangle";
          if (v2_5 == "lasso") {
            this.content.find("#toolLasso").addClass("selectedTool").siblings("a").removeClass("selectedTool");
            this.undoViewer.setMode("lasso");
            this.currentTool = "lasso";
          } else if (v2_5 == "rectangle") {
            this.content.find("#toolRect").addClass("selectedTool").siblings("a").removeClass("selectedTool");
            this.undoViewer.setMode("rect");
            this.currentTool = "rectangle";
          }
          this.undoViewer.selectionTool.currentTool = v2_5;
          this.undoViewer.selectionTool.initialPosition = this.selectionInitial;
          this.undoViewer.selectionTool.setClicks(this.selectionPrevious);
          this.undoViewer.selectionTool.redraw();
        } catch (v6_0) {
          console.error("Error restoring selection:", v6_0);
        }
      }
      this.changed();
      this.loading(false);
    } else if (v2_0 == "settings") {
      this.loadSubcontent(this.loadFile("forms/undo.settings.html"));
      this.intervalInput = new NumericInput(this.content.find("div[name=\"intervalinput\"]"), this.secInterval, 3, 999, textManager.getString("undo.settings.lblSeconds"));
      this.maxInput = new NumericInput(this.content.find("div[name=\"maxinput\"]"), this.maxBoards, 1, 50, textManager.getString("undo.settings.lblSavedBoards"));
      this.enableUndo = new Switch(this.content.find("#enableUndo"), function (v5_0) {
        if (v5_0) {
          return textManager.getString("global.enabled");
        } else {
          return textManager.getString("global.disabled");
        }
      });
      this.enableUndo.setValue(this.enabled);
      this.intervalInput.focus();
      this.content.find("#applyUndoSettings").on(UI.pointerEvent("click"), function (v5_0) {
        v5_0.preventDefault();
        var v5_1 = v2_1.enableUndo.getValue();
        if (v2_1.enabled != v5_1) {
          if (v5_1) {
            v2_1.enable();
          } else {
            v2_1.disable();
          }
        }
        v2_1.secInterval = v2_1.intervalInput.getValue();
        v2_1.maxBoards = v2_1.maxInput.getValue();
        UI.userPreferences.setProperty("undoInterval", v2_1.secInterval);
        UI.userPreferences.setProperty("undoMax", v2_1.maxBoards);
        UI.dialogHandler.showAlert(textManager.getString("alerts.txtSaved"));
      });
      this.content.find("#defaultUndoSettings").on(UI.pointerEvent("click"), function (v5_0) {
        v5_0.preventDefault();
        v2_1.intervalInput.setValue(v2_1.defaultInterval);
        v2_1.maxInput.setValue(v2_1.defaultMax);
      });
      this.scroll = this.content.find(".dialogContentArea").overlayScrollbars({
        className: "os-theme-light",
        overflowBehavior: {
          x: "hidden"
        }
      }).overlayScrollbars();
      this.scroll.addExt("fmExtension");
      this.changed();
      this.loading(false);
    }
    this.processSizeType(this.sizeType);
  }
}
