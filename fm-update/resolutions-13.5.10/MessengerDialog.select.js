select(v2_0) {
  this.loading(true);
  this.selectedUserUID = v2_0;

  // Highlight the selected user
  this.content.find(".messengerUser.selected").removeClass("selected");
  this.content.find(".messengerUser[data-uid=\"" + v2_0 + "\"]").addClass("selected");
  const v2_1 = this.content.find(".messengerUser.selected").data("isglobal");
  const v2_2 = this.content.find(".messengerUser.selected").data("blocked");
  this.content.find("#conversationTitle .title").html("<span class=\"" + (v2_1 ? "rankGM" : "") + " " + (v2_2 ? " blocked" : "") + "\">" + escapeHTML(this.content.find(".messengerUser.selected").data("username")) + "</span>");
  this.content.find("#messengerConversation").empty();
  this.empty(false);
  if (v2_2) {
    this.lockMessageBar();
  }
  var v2_3 = {
    command: "USERGET",
    action: "Messenger",
    perform: "read",
    uid: v2_0
  };
  socket.send(v2_3, true);

  // Focus on the input field
  this.content.find("input[name=\"text\"]").focus();

  // console.log('User selected:', _0x71f239);

  // Attach context menu to messengerUser elements
  UI.contextMenu.register({
    selector: ".messengerUser[data-uid=\"" + v2_0 + "\"]",
    // Attach to the specific user
    trigger: "right",
    // Right-click trigger
    build: function (v3_0) {
      return {
        callback: function (_action, _opt) {
          if (_action === "blockUser") {
            const username = v3_0.data("username"); // Get username
            if (username) {
              // Add the user to the blockedUsers in localStorage
              let blockedUsers = JSON.parse(localStorage.getItem("blockedUsers")) || [];
              if (!blockedUsers.includes(username)) {
                blockedUsers.push(username);
                localStorage.setItem("blockedUsers", JSON.stringify(blockedUsers));
              }
            }
          }
        },
        items: {
          blockUser: {
            name: "Block User",
            icon: "fa-ban"
          }
        }
      };
    }
  });
}
