execute(v2_0) {
  // mod: the server refuses stray broadcasts (e.g. brush settings re-sent around leaving a room);
  // they are harmless, so no "That did not go through" popup or console warning
  this.UI.dialogHandler.clearLoading();
}
