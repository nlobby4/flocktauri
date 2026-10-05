execute(v2_0) {
  this.room.connected &&= false;
  this.room.createMyself(v2_0.you.name, v2_0.you.rank);
  if (!this.UI.configured) {
    this.UI.configured = true;
    this.UI.setupControls();
    this.UI.bindEvents();
  }
  this.UI.sessionId = v2_0.sessionId;
  this.room.capacity = v2_0.capacity;
  this.room.description = unescapeHTML(v2_0.description);
  this.room.private = v2_0.hidden;
  this.room.adultsonly = v2_0.adultsonly;
  this.room.changeSize(v2_0.size);
  this.room.changeTransparency(v2_0.bottomtransparency);
  this.room.changeAnimationOptions(v2_0.animrows, v2_0.animcols);
  this.room.changeType(v2_0.type);
  this.room.changeLayers(v2_0.numlayers);
  if (!UI.customBgActive) {
    this.room.changeBackground(v2_0.background, true);
  }
  this.room.change(v2_0.room);
  if (this.UI.boardRoom !== null && this.UI.boardRoom !== v2_0.room) {
    this.room.board.clearLayers();
    this.UI.boardRoom = null;
  }
  this.room.myself.changeMute(v2_0.you.muted);
  this.room.myself.changeSilence(v2_0.you.silenced);
  this.room.setPrivileges(v2_0.you.privileges);
  this.room.setTools(v2_0.you.tools);
  if (v2_0.you.uid && v2_0.you.uid > 0) {
    this.room.myself.setAccount(v2_0.you.regusername, v2_0.you.uid);
  }
  this.room.myself.galleryMod = v2_0.you.galleryMod === true;
  if (v2_0.you.muted && v2_0.you.mutetime) {
    this.UI.muteTime(parseInt(v2_0.you.mutetime));
  }
  if ("registered" in v2_0) {
    if (v2_0.registered) {
      this.UI.bottombar.hideButton("registerButton");
    } else {
      this.UI.bottombar.showButton("registerButton");
    }
  }
  this.UI.setupScreenSize(this.UI.getScreenSize());
  this.UI.showAllLayers();
  this.UI.inRoom = true;
  $.each(v2_0.lockedlayers, function (v3_0, v3_1) {
    this.room.board.lockLayer(v3_1);
  }.bind(this));
  this.room.setConnected(true, v2_0.isquickreconnect);
  this.UI.sidebar.layerPreview.updatePreviews();
}
