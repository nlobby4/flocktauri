bindEvents() {
  var v2_0 = this;
  $(this.user.surface).on("penDown", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penDown(v3_0));
    }
  });
  $(this.user.surface).on("penUp", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penUp(v3_0));
    }
  });
  $(this.user.surface).on("penMove", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penMove(v3_0));
    }
  });
  $(this.user.surface).on("penCancel", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penCancel(v3_0));
    }
  });
  $(this.user.surface).on("layerSelected", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.layerSelected(v3_0));
  });
  $(this.user.surface).on("penHide", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penHide(v3_0));
    }
  });
  $(this.user.surface).on("penShow", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.penShow(v3_0));
    }
  });
  $(this.user.surface).on("keyPress", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.keyPress(v3_0));
    }
  });
  $(this.user.surface).on("modifierDown", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.modifierDown(v3_0));
    }
  });
  $(this.user.surface).on("modifierUp", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.modifierUp(v3_0));
    }
  });
  $(this.user.surface).on("brushParameter", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.brushParameter(v3_0));
    }
  });
  $(this.user.surface).on("colorChanged", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.colorChanged(v3_0));
    }
  });
  $(this.user.surface).on("brushChanged", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.brushChanged(v3_0));
    }
  });
  $(this.user.surface).on("brushOptionChanged", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.brushOptionChanged(v3_0));
    }
  });
  $(this.user.surface).on("uploadModeChanged", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.uploadModeChanged(v3_0));
    }
  });
  $(this.user.surface).on("silhouetteChanged", function (v3_0) {
    if (!v2_0.isAlone) {
      v2_0.outBuffer(v2_0.netcode.silhouetteChanged(v3_0));
    }
  });
  $(this.user.surface).on("layerActionRequest", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.layerActionRequest(v3_0));
  });
  $(this.user.surface).on("userActionRequest", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.userActionRequest(v3_0), null, "userActionRequest");
  });
  $(this.user).on("usernameChanged", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.usernameChanged(v3_0), null, "usernameChanged");
  });
  $(this.user).on("statusChanged", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.statusChanged(v3_0), null, "statusChanged");
  });
  $(this.user).on("inactiveChanged", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.inactiveChanged(v3_0), null, "inactiveChanged");
  });
  $(this.user).on("inputDeviceChanged", function (v3_0) {
    v2_0.outBuffer(v2_0.netcode.inputDeviceChanged(v3_0));
  });
}
