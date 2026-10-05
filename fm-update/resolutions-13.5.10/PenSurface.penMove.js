penMove(v2_0, v2_1) {
  v2_0 = formatNumberMod(v2_0);
  v2_1 = formatNumberMod(v2_1);
  const isSelectionTool = this.getCurrentBrush() === "selection";
  const isPolygonalMode = isSelectionTool && this.getBrushOption("polygonalselection") && this.getBrushOption("selectiontype");

  // If feature is disabled or not my surface, ensure all related variables are reset
  if (!this.lineSnapFeatureEnabled || !this.isMyself) {
    // Clear any existing snap state to prevent snapping when disabled
    this.snapDirection = undefined;
    this.snapOrigin = undefined;
    this._wasShiftReleased = false;
    this.lastSnapPoint = null;
  }

  // Only calculate isSnapEnabled if the feature is enabled and it's my surface
  const isSnapEnabled = this.lineSnapFeatureEnabled && this.isMyself ? UI.holdingSHIFT : false;

  // For polygonal mode, block normal penMove events unless explicitly allowed by isAddingPolygonPoint
  if (isPolygonalMode && this.polygonPoints && this.polygonPoints.length > 0) {
    if (!this.isAddingPolygonPoint) {
      // Update cursor position but don't execute drawing logic
      this.cursor.update(v2_0, v2_1, this.brushHandler.getOption("size"));
      return;
    }
  }

  // SNAP FEATURE: Implement axis snapping for pen and eraser tools
  const currentBrush = this.getCurrentBrush();

  // Track SHIFT state only if feature enabled and it's my surface
  if (this.lineSnapFeatureEnabled && this.isMyself && this.penPressed && currentBrush !== "rect" && currentBrush !== "line" && currentBrush !== "ellipse") {
    if (isSnapEnabled && this._wasShiftReleased) {
      this.snapDirection = undefined;
      this.snapOrigin = undefined;
      this._wasShiftReleased = false;
    } else if (!isSnapEnabled && this.snapDirection !== undefined) {
      this._wasShiftReleased = true;
    }
  }
  if (this.lineSnapFeatureEnabled && this.isMyself && this.penPressed && isSnapEnabled && currentBrush !== "rect" && currentBrush !== "line" && currentBrush !== "ellipse" && !this.isConnectingPoints) {
    if (!this.snapOrigin) {
      const boardOrigin = UI.boardToScreen(this.stepFrom.x, this.stepFrom.y);
      this.snapOrigin = {
        x: boardOrigin.x,
        y: boardOrigin.y
      };
    }
    const screenCurrent = UI.boardToScreen(v2_0, v2_1);
    const screenVectorX = screenCurrent.x - this.snapOrigin.x;
    const screenVectorY = screenCurrent.y - this.snapOrigin.y;
    const totalDistance = Math.sqrt(screenVectorX * screenVectorX + screenVectorY * screenVectorY);
    if (this.snapDirection === undefined && totalDistance >= 4) {
      this.snapDirection = Math.abs(screenVectorX) >= Math.abs(screenVectorY) ? "horizontal" : "vertical";
    }
    if (this.snapDirection !== undefined) {
      let snappedScreenX;
      let snappedScreenY;
      if (this.snapDirection === "horizontal") {
        snappedScreenX = this.snapOrigin.x + screenVectorX;
        snappedScreenY = this.snapOrigin.y;
      } else {
        snappedScreenX = this.snapOrigin.x;
        snappedScreenY = this.snapOrigin.y + screenVectorY;
      }
      const snappedBoard = UI.screenToBoard(snappedScreenX, snappedScreenY);
      v2_0 = snappedBoard.x;
      v2_1 = snappedBoard.y;
    }
  }
  if (!isFinite(v2_0) || !isFinite(v2_1)) {
    return;
  }
  var v2_2 = new Point(v2_0, v2_1);
  if (this.penPressed) {
    if (!this.stepFrom || !isFinite(this.stepFrom.x) || !isFinite(this.stepFrom.y)) {
      this.stepFrom = v2_2;
    }
    try {
      this.brushHandler.brush.drawStep(this.stepFrom, v2_2, this.drawColor);
    } catch (v4_0) {}
    this.stepFrom = new Point(v2_0, v2_1);

    // CUSTOM: Record stroke movement with full brush options ONLY if it's our own drawing
    if (this.isMyself && this.currentStrokeData && !this.isReplaying) {
      this.currentStrokeData.moves.push({
        x: v2_0,
        y: v2_1,
        time: new Date().getTime(),
        brushOptions: this.getBrushOptions(),
        color: this.drawColor,
        // Add color to each move point
        layer: this.currentLayer // Add current layer to each move point
      });
    }
  } else {
    this.brushHandler.brush.cursorMove(this.stepFrom, v2_2);
    this.stepFrom = new Point(v2_0, v2_1);

    // Also record moves for selection tool when not pressed (for resizing/positioning)
    if (this.isMyself && !this.isReplaying && this.getCurrentBrush() === "selection" && this.currentStrokeData?.isSelectionStroke && this.uploadMode) {
      this.currentStrokeData.selectionActions.push({
        type: "position",
        x: v2_0,
        y: v2_1,
        time: new Date().getTime(),
        layer: this.currentLayer // Add current layer to selection actions
      });
    }
  }
  this.cursor.update(v2_0, v2_1, this.brushHandler.getOption("size"));
  $(this).triggerHandler(new penMoveEvent(v2_0, v2_1).getEvent());
}
