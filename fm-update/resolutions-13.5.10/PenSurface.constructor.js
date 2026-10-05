constructor(v2_0 = false) {
  this.isMyself = v2_0;
  this.user = null;
  this.penPressed = false;
  this.uploadMode = false;
  this.slate = new AdvancedCanvas(room.board.canvasWidth, room.board.canvasHeight);
  this.slate.canvas.addClass("slate " + (this.isMyself ? "myself" : "noMouseInteraction"));
  this.slateInUse = false;
  room.board.canvasContainer.append(this.slate.canvas);
  this.setCurrentLayer(0);
  this.drawColor = "#000000";
  this.stepFrom;
  this.cursor = new Cursor(this);
  this.cursor.hide();
  this.lastPenDown;
  this.lastPenUp;
  this.maxSize = 140;
  this.modifiersDown = [];
  this.brushHandler = new BrushHandler(this);
  if (fixSelectionOptionsStuck === "true") {
    this.setBrushOptionReadOnly = this.setBrushOptionReadOnlyModified;
  }
  // Set lineSnap feature based on localStorage
  this.lineSnapFeatureEnabled = localStorage.getItem("lineSnappingShift") === "true";
  if (fixSelectionOptionsStuck === "true") {
    this.setBrushOptionReadOnly = this.setBrushOptionReadOnlyModified;
  }
  if (v2_0) {
    // Only initialize recording for ourselves
    this.strokes = [];
    this.currentStrokeData = null;
    this.strokeCount = 0;
    this.isReplaying = false;

    // Text tool specific tracking
    this.textModeActive = false;
    this.textModeKeyEvents = [];
    this.textModeStartTime = null;
    this.textModeStartPoint = null;

    // Make replay accessible from console
    window.replayStroke = strokeNum => this.replayStroke(strokeNum);
    window.replayAllStrokes = () => this.replayAllStrokes();
    window.showStrokeToOthers = strokeNum => this.showStrokeToOthers(strokeNum);
    this.textInputLock = false;
    this.pendingTextCaptures = [];
    this.lastTextCaptureTime = 0;
    this.textStrokeNumbers = new Set(); // Track assigned stroke numbers

    this.polygonPoints = []; // Store points for polygonal selection
    this.isAddingPolygonPoint = false; // Flag to handle penMove only from penDown
    this.isClosingPolygon = false; // Flag to allow penUp when closing
    this._lastPolygonalPenDownTime = null; // For double-click detection
    this._lastPolygonalPoint = null;
  }
}
