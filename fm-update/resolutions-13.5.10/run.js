function run() {
  storage = new LocalStorage("fmod");
  device = new Device(window);
  device.prepare();
  var v1_0 = domain === "flockmod.com" ? "server.flockmod.com" : domain;
  socket = new Socket("wss://" + v1_0 + "/server/");
  cm = new ConnectionManager(socket);
  UI.setup($("#content"));
  textManager.changeLocale(UI.userPreferences.getProperty("language", "en"));
  room = new Room(UI.boardContainer, "Lobby Browser", "L", 1, "1P");
  UI.applyBackgroundOverride();
  var v1_1 = 30;
  var v1_2 = window.setInterval(function () {
    try {
      if (room && room.connected) {
        room.myself.frameBuffer.execFrame();
        $.each(room.users, function (v5_0) {
          room.users[v5_0].frameBuffer.execFrame();
        });
      }
    } finally {
      socket.execFrame();
    }
  }, parseInt(1000 / v1_1));
}
