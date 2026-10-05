constructor(v2_0) {
  this.surface = v2_0;
  this.x;
  this.y;
  this.size;
  this.pressure = 1;
  this.subPointerVisible = true;
  this.labelOffset = new Point(5, -5);
  this.graphic = $("<div />").addClass("cursor");
  if (this.surface.isMyself) {
    this.graphic.addClass("myself");
  }
  this.pointer = $("<div/>").addClass("pointer");
  this.graphic.append(this.pointer);
  this.subPointer = $("<div/>").addClass("pointer");
  this.graphic.append(this.subPointer);
  this.label = $("<div/>").addClass("pointerLabel");
  this.graphic.append(this.label);
  room.board.cursorContainer.append(this.graphic);

  // Feature toggle: Counter-Strike Cursor
  const csCursorEnabled = localStorage.getItem(window.config && window.config.localStorageKeys && window.config.localStorageKeys.csCursor || "csCursor") === "true";

  // Choose initial pointer style
  if (typeof UI !== "undefined" && UI && UI.flipLabels) {
    UI.flipLabels();
  }
  if (csCursorEnabled && this.surface.isMyself) {
    if (typeof window.OWN_CURSOR_OPACITY !== "number") {
      window.OWN_CURSOR_OPACITY = 0.35;
    }
    this.graphic.css("opacity", window.OWN_CURSOR_OPACITY);
    this.changePointer("pscross");
  } else {
    this.changePointer("circle");
  }
  const _self = this;
  $(this.surface).on("brushOptionChanged", function (e) {
    if (e.option == "size") {
      _self.size = e.value;
      _self.update(_self.x, _self.y, _self.size, _self.pressure);
    } else if (e.option == "pressure") {
      _self.pressure = e.value[1];
      _self.update(_self.x, _self.y, _self.size, _self.pressure);
    }
  });
  $(this.surface).on("penMove penDown penUp", function (e) {
    _self.x = e.x;
    _self.y = e.y;
    _self.update(_self.x, _self.y, _self.size, _self.pressure);
    if (e.type == "penUp" || _self.pressure == 1) {
      _self.hideSubPointer();
    } else if (_self.surface.penPressed) {
      _self.showSubPointer();
    }
  });
  $(this.surface).on("brushChanged", function () {
    _self.size = _self.surface.brushHandler.getOption("size");
    _self.pressure = _self.surface.brushHandler.hasOption("pressure") ? _self.surface.brushHandler.getOption("pressure")[1] : 1;
    _self.update(_self.x, _self.y, _self.size, _self.pressure);
  });
}
