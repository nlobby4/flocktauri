constructor() {
  this.initialized = false;
  this.configured = false;
  this.pointerSupport = window.PointerEvent;
  this.userPreferences;
  this.clientId = v0_18(1, 999999);
  this.sessionId = null;
  this.boardRoom = null;
  this.afterResume = null;
  this.uniqueID = null;
  this.clientName = "FlockMod";
  this.client = "FMH5C";
  this.version = "13.5.10+0";
  this.assetVersion = "20afd97a";
  this.account = new Account("Anonymous");
  this.baseURL = "https://" + domain;
  this.baseDir = "/draw/";
  this.galleryURL = this.baseURL + "/gallery";
  this.hasSetCustomBrush = false;
  this.drawingInactivityMinutes = 2;
  this.firstSyncEnabled = false;
  this.firstSyncProgress = false;
  this.firstSyncUser = null;
  this.firstSyncFailed = [];
  this.firstSyncOrder = [];
  this.manualSync = null;
  this.content;
  this.drawingArea;
  this.boardContainer;
  this.warningContainer;
  this.statusContainer;
  this.uploader;
  this.dragRotation = 0;
  this.dragInitialRotation = 0;
  this.dragPoint = null;
  this.timeDiff = 0;
  this.warnExit = false;
  this.pinching = false;
  this.hovering = false;
  this.draggingMode = false;
  this.preDraggingMode = false;
  this.hammer = null;
  this.gestureStartScale = 1;
  this.gestureStartRotation = 0;
  this.gestureStartBoardLeft = 0;
  this.gestureStartBoardTop = 0;
  this.gestureStartCenter = null;
  this.gesturePivotLocal = null;
  this.gestureHammerRotationOffset = 0;
  this.gestureHammerScaleOffset = 1;
  this.gesturePreviousTransformOrigin = null;
  this.gestureStartPivotScreenOffsetX = 0;
  this.gestureStartPivotScreenOffsetY = 0;
  this.resizeTimeout = undefined;
  this.viewLeft;
  this.viewTop;
  this.viewWidth;
  this.viewHeight;
  this.limitedViewSize = false;
  this.viewOffset = new Point(0, 0);
  this.screenWidth;
  this.screenHeight;
  this.flipX = false;
  this.pixelSmoothing = true;
  this.savedOption = {};
  this.drawingWithPointer = null;
  this.onFocus = true;
  this.focusTimer;
  this.focusedElement = null;
  this.uploadMode = false;
  this.muteInterval = null;
  this.muteSeconds = 0;
  this.muteAnimationId = null;
  this.muteAnimationFPS = 1;
  this.lastMuteUpdateTime = 0;
  this.topbar;
  this.bottombar;
  this.sidebar;
  this.transferPreviewManager;
  this.mousePointer;
  this.overBoard = false;
  this.holdingCTRL = false;
  this.holdingALT = false;
  this.holdingSHIFT = false;
  this.soundSystem;
  this.dialogHandler;
  this.chatDialog;
  this.configDialog;
  this.loginDialog;
  this.undoDialog;
  this.saveDialog;
  this.uploadDialog;
  this.brushDesignerDialog;
  this.brushGalleryDialog;
  this.debugDialog;
  this.profileDialog;
  this.editProfileDialog;
  this.colorDialog;
  this.helpDialog;
  this.feedbackDialog;
  this.reportDialog;
  this.animationDialog;
  this.messengerDialog;
  this.friendsDialog;
  this.galleryImageDialog;
  this.userGalleryDialog;
  this.userProfileDialog;
  this.imageViewerDialog;
  this.syncDialog;
  this.shortcutManager;
  this.tooltips;
  this.selectionToolbar;
  this.userRanks = ["UU", "RU", "TU", "RM", "FM", "LM", "CO", "RO", "GM"];
  this.toolbarSide;
  this.defaultBrush = "pen";
  this.defaultColor = "#000000";
  this.inRoom = false;
  this.preferredLanguage = navigator.language.split("-")[0];
  this._tmp; // Line interpolation feature - initialize based on localStorage
  this.lineInterpolationEnabled = localStorage.getItem("lineInterpolation") === "true";
  if (reconnectAwareSync === "true") {
    this.recommendedSync = this.recommendedSyncModified;
  } else {
    this.recommendedSync = this.recommendedSyncDefault;
  }
  if (persistentBoardSync === "true") {
    this.fitToScreen = this.fitToScreenModified;
    this.centerBoard = this.centerBoardModified;
    this.bindEventsRoom = this.bindEventsRoomModified;
  }
  if (mouseWheelMode === "cap") {
    this.onWheelMove = this.onWheelMoveCap;
  } else if (mouseWheelMode === "fasterScroll") {
    this.onWheelMove = this.onWheelMoveFaster;
  } else {
    this.onWheelMove = this.onWheelMoveDefault;
  }
  if (positionAwareMirroring === true) {
    // Directly compare it as a boolean
    this.flipView = this.flipViewEnabled;
  } else {
    this.flipView = this.flipViewDisabled;
  }
  if (rmbActionFix === true) {
    // Directly compare it as a boolean
    this.bindEventsBoard = this.bindEventsBoardEnabled;
  } else {
    this.bindEventsBoard = this.bindEventsBoardDisabled;
  }
  this.undoHistoryEnabled = false; // Default enabled
  if (localStorage.getItem("undoHistoryEnabled") === "false") {
    this.undoHistoryEnabled = false;
  }
  // Ensure localStorage is set on initialization
  localStorage.setItem("undoHistoryEnabled", this.undoHistoryEnabled.toString());
  this.rotationPivotScreen = null;
  this.rotationPivotBoard = null;
}
