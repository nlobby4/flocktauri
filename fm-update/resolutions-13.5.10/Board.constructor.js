constructor(v2_0, v2_1, v2_2, v2_3, v2_4, v2_5) {
  this.canvasWidth;
  this.canvasHeight;
  this.nLayers = v2_3;
  this.layers = [];
  this.backgroundColor = "#FFFFFF";
  this.bottomTransparency = true;
  this.boardContainer = v2_0;
  this.overrideBackground = false;
  this.overrideBackgroundColor = "#FFFFFF";
  this.displayBackgroundColor = "#FFFFFF";
  this.grid;
  this.gridVisible = false;
  this.gridRows = 0;
  this.gridCols = 0;
  this.onion;
  this.onionSkin = false;
  this.scale = 0;
  this.rotation = 0;
  // Check if smallerZoomStep is enabled
  this.zoomStep = localStorage.getItem("smallerZoomStep") === "true" ? 0.1 : 0.25;
  this.minZoom = 0.25;
  this.maxZoom = 13;
  this.cursorContainer = $("<div />");
  this.cursorContainer.addClass("CursorContainer");
  this.boardContainer.append(this.cursorContainer);
  this.canvasContainer = $("<div />");
  this.canvasContainer.addClass("CanvasContainer");
  this.boardContainer.append(this.canvasContainer);
  this.zIndexFrom = 10;
  this.lastChangeTime = new Date();
  this.changeSize(v2_1, v2_2);
  this.changeLayers(v2_3);
  this.changeTransparency(v2_5);
  this.changeBackground(v2_4);
  this.undoStack = [];
  this.redoStack = [];
  this.maxUndoSteps = parseInt(localStorage.getItem("undoSteps")) || 5;
  this.currentStrokeId = 1; // Track current stroke ID - increment with each new stroke
  this.strokeCommitQueue = []; // Queue for pending stroke commits
  this.isProcessingCommit = false; // Flag to track if we're currently processing a commit
  this.undoneStrokes = new Set(); // Track strokes that have been undone

  // New mapping properties for stroke coordination
  this.strokeIdMap = new Map(); // Maps Board strokeId -> Surface strokeNumber
  this.surfaceStrokeMap = new Map(); // Maps Surface strokeNumber -> Board strokeId
  // Setup localStorage change monitoring
  this.needToUnmuteWhenComplete = false; // New flag to track pending unmute
  this.needToUnblockMessagesWhenComplete = false; // Flag to track pending message unblock
  this.setupUndoHistoryToggleHandler();
  // Add tracking for commit progress
  this.commitProgress = {
    processed: 0,
    total: 0,
    active: false
  };
  if (positionAwareRotation === true) {
    this.changeRotation = this.changeRotationPositionAware;
  } else {
    this.changeRotation = this.changeRotationDefault;
  }
}

// Helper method to check if undo history is enabled
// Helper method to check if undo history is enabled
