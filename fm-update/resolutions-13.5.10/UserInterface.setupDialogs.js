setupDialogs() {
  this.chatDialog = this.dialogHandler.createDialog("chat");
  this.configDialog = this.dialogHandler.createDialog("config");
  this.loginDialog = this.dialogHandler.createDialog("login");
  this.undoDialog = this.dialogHandler.createDialog("undo");
  this.roomManagerDialog = this.dialogHandler.createDialog("roommanager");
  this.saveDialog = this.dialogHandler.createDialog("save");
  this.uploadDialog = this.dialogHandler.createDialog("upload");
  this.brushDesignerDialog = this.dialogHandler.createDialog("brushdesigner");
  this.brushGalleryDialog = this.dialogHandler.createDialog("brushgallery");
  this.debugDialog = this.dialogHandler.createDialog("debug");
  this.profileDialog = this.dialogHandler.createDialog("profile");
  this.editProfileDialog = this.dialogHandler.createDialog("editprofile");
  this.colorDialog = this.dialogHandler.createDialog("color");
  this.helpDialog = this.dialogHandler.createDialog("help");
  this.modsDialog = this.dialogHandler.createDialog("mods");
  this.adminConsoleDialog = this.dialogHandler.createDialog("adminconsole");
  this.feedbackDialog = this.dialogHandler.createDialog("feedback");
  this.reportDialog = this.dialogHandler.createDialog("report");
  this.animationDialog = this.dialogHandler.createDialog("animation");
  this.messengerDialog = this.dialogHandler.createDialog("messenger");
  this.friendsDialog = this.dialogHandler.createDialog("friends");
  this.galleryImageDialog = this.dialogHandler.createDialog("galleryimage");
  this.userGalleryDialog = this.dialogHandler.createDialog("usergallery");
  this.userProfileDialog = this.dialogHandler.createDialog("userprofile");
  this.imageViewerDialog = this.dialogHandler.createDialog("imageviewer");
  this.syncDialog = this.dialogHandler.createDialog("sync");
  var v2_0 = this;
  $(this.loginDialog).on("dialogOpened", function (v3_0) {
    v2_0.showScreen();
  });
  $(this.chatDialog).on("unreadMessages", function (v3_0) {
    var v3_1 = "danger";
    if (v3_0.messagetype == "events") {
      v3_1 = "default";
    } else if (v3_0.messagetype == "pm") {
      v3_1 = "secondary";
    }
    v2_0.topbar.setCounter("chatButton", v3_0.messages, v3_1);
  });
  $(this.messengerDialog).on("unreadMessages", function (v3_0) {
    v2_0.bottombar.setCounter("messengerButton", v3_0.messages);
  });
  $(this.friendsDialog).on("unreadMessages", function (v3_0) {
    v2_0.bottombar.setCounter("friendsButton", v3_0.messages);
  });
  $(this.friendsDialog).on("presenceChanged", function (v3_0) {
    var v3_1 = "presenceOnline";
    if (v3_0.presence == "busy") {
      v3_1 = "presenceBusy";
    } else if (v3_0.presence == "invisible") {
      v3_1 = "presenceOffline";
    }
    v2_0.bottombar.setButtonPip("friendsButton", v3_1);
  });
  $(this.saveDialog).on("processFinished", function (v3_0) {
    if (v3_0.process == "GallerySave") {
      socket.send({
        command: "GALLERYSET",
        action: "Upload"
      }, true);
    }
  });
}
