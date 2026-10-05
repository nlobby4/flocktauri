createDialog(v2_0) {
  var v2_1 = this;
  var v2_2;
  if (v2_0 == "login") {
    v2_2 = new LoginDialog(this.container, v2_0);
  } else if (v2_0 == "config") {
    v2_2 = new ConfigDialog(this.container, v2_0);
  } else if (v2_0 == "chat") {
    v2_2 = new ChatDialog(this.container, v2_0);
  } else if (v2_0 == "undo") {
    v2_2 = new UndoDialog(this.container, v2_0);
  } else if (v2_0 == "roommanager") {
    v2_2 = new RoomManagerDialog(this.container, v2_0);
  } else if (v2_0 == "save") {
    v2_2 = new SaveDialog(this.container, v2_0);
  } else if (v2_0 == "upload") {
    v2_2 = new UploadDialog(this.container, v2_0);
  } else if (v2_0 == "brushdesigner") {
    v2_2 = new BrushDesignerDialog(this.container, v2_0);
  } else if (v2_0 == "brushgallery") {
    v2_2 = new BrushGalleryDialog(this.container, v2_0);
  } else if (v2_0 == "debug") {
    v2_2 = new DebugDialog(this.container, v2_0);
  } else if (v2_0 == "profile") {
    v2_2 = new ProfileDialog(this.container, v2_0);
  } else if (v2_0 == "editprofile") {
    v2_2 = new EditProfileDialog(this.container, v2_0);
  } else if (v2_0 == "color") {
    v2_2 = new ColorDialog(this.container, v2_0);
  } else if (v2_0 == "help") {
    v2_2 = new HelpDialog(this.container, v2_0);
  } else if (v2_0 == "mods") {
    v2_2 = new ModsDialog(this.container, v2_0);
  } else if (v2_0 == "adminconsole") {
    v2_2 = new AdminConsoleDialog(this.container, v2_0);
  } else if (v2_0 == "feedback") {
    v2_2 = new FeedbackDialog(this.container, v2_0);
  } else if (v2_0 == "report") {
    v2_2 = new v0_8(this.container, v2_0);
  } else if (v2_0 == "animation") {
    v2_2 = new AnimationDialog(this.container, v2_0);
  } else if (v2_0 == "messenger") {
    v2_2 = new MessengerDialog(this.container, v2_0);
  } else if (v2_0 == "friends") {
    v2_2 = new v0_9(this.container, v2_0);
  } else if (v2_0 == "galleryimage") {
    v2_2 = new GalleryImageDialog(this.container, v2_0);
  } else if (v2_0 == "usergallery") {
    v2_2 = new UserGalleryDialog(this.container, v2_0);
  } else if (v2_0 == "userprofile") {
    v2_2 = new UserProfileDialog(this.container, v2_0);
  } else if (v2_0 == "imageviewer") {
    v2_2 = new v0_10(this.container, v2_0);
  } else if (v2_0 == "sync") {
    v2_2 = new v0_11(this.container, v2_0);
  }
  this.dialogs[v2_0] = v2_2;
  v2_2.form.attr("name", v2_0);
  $(v2_2).on("dialogOpened", function (v3_0) {
    v2_2.formHolder.css("z-index", ++v2_1.zindex);
    v2_1.openedDialogs++;
    if (this.blockBackground) {
      v2_1.blockBackground(this.blockStyle, this.blockOpacity);
    }
    v2_1.activateDialog(this);
    $(v2_1).triggerHandler(new dialogOpenedEvent(v2_2.name).getEvent());
    if (UI.inRoom && socket.connected) {
      var v3_1 = {
        command: "USERSET",
        action: "OpenDialog",
        value: v2_2 instanceof UndoDialog ? "UndoDialog" : v2_2.name
      };
      socket.send(v3_1, true);
    }
  });
  $(v2_2).on("dialogClosed", function (v3_0) {
    v2_1.zindex--;
    v2_1.openedDialogs--;
    v2_1.deactivateDialogs();
    if (v2_1.openedDialogs <= 0) {
      if (this.blockBackground) ;
      {
        v2_1.unblockBackground();
      }
    } else {
      v2_1.activateDialog(v2_1.getNextVisibleDialog());
    }
    $(v2_1).triggerHandler(new dialogClosedEvent(v2_2.name).getEvent());
    if (UI.inRoom && socket.connected) {
      var v3_1 = {
        command: "USERSET",
        action: "CloseDialog",
        value: v2_2.name
      };
      socket.send(v3_1, true);
    }
  });
  return v2_2;
}
