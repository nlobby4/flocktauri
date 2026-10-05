flipViewDisabled(v2_0) {
  this.keepCentreOnFlip(v2_0);
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
