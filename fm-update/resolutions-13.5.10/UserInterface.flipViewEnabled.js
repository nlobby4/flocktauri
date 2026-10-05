flipViewEnabled(v2_0) {
  let x_converted = UI.viewWidth - (UI.drawingArea.offset().left - UI.viewLeft + UI.drawingArea.width());
  let y = UI.drawingArea.offset().top - UI.viewTop;
  room.board.changeRotation(360 - room.board.rotation);
  UI.moveBoard(x_converted * -1, y * -1);
  this.flipLabels();
  if (v2_0) {
    this.bottombar.selectButton("flipXButton");
  } else {
    this.bottombar.unselectButton("flipXButton");
  }
  this.flipX = v2_0;
  this.updateTransform();
  $(this).triggerHandler(new viewFlippedEvent(v2_0).getEvent());
}
