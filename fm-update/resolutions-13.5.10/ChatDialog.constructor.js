constructor(v2_0, v2_1) {
  super(v2_0, v2_1);
  this.currentChannel = null;
  this.channels = {};
  this.icon = "fa-comment";
  this.caption = textManager.getString("chat.title");
  this.helpLink = "https://flockmod.com/help/tools/social/";
  this.fontSize = 13;
  this.spamLimit = 25;
  this.pendingImage = null;
  this.loadContent(this.loadFile("forms/chat.main.html"));
  this.sidebarScroll = this.content.find(".chatBar").overlayScrollbars({
    className: "os-theme-light",
    overflowBehavior: {
      x: "hidden"
    }
  }).overlayScrollbars();
  this.sidebarScroll.addExt("fmExtension");
  this.scroll = this.content.find(".chatBox").overlayScrollbars({
    className: "os-theme-light",
    overflowBehavior: {
      x: "hidden"
    },
    callbacks: {
      onScroll: () => {
        this.updateScrollIndicator();
      }
    }
  }).overlayScrollbars();
  this.scroll.addExt("fmExtension");
  this.scrollIndicator = $("<div class=\"scrollIndicator\">" + new Icon("fas fa-pause").html() + " " + textManager.getString("chat.lblScrollPaused") + "</div>");
  this.content.find(".chatBox").append(this.scrollIndicator);
  this.scrollIndicator.on("click", () => {
    this.scroll.scroll({
      y: "100%"
    });
  });
  this.scrollIndicator.hide();
  this.content.find(".sidebarElements").empty();
  this.content.find("a[name=\"newPM\"]").hide();
  this.addChannel("public", "room");
  this.addChannel("staff", "room");
  this.selectChannel("public", "room");
  this.updateScrollIndicator();
  this.changeFontSize(this.fontSize);
  this.previews = new ImagePreview();
  this.emojiList = new EmojiSelector(this.content.find(".emojiContainer"));
  this.userTag = new UserTag(this.content.find(".userTagContainer"));
  var v2_2 = this;
  $(this.emojiList).on("dialogClosed", function (v3_0) {
    v2_2.content.find("input[name=\"text\"]").focus();
  });
  $(this.userTag).on("userTagged", function (v3_0) {
    v2_2.content.find("input[name=\"text\"]").focus();
    v2_2.acceptTag(v3_0.username, v3_0.filter);
    v2_2.userTag.hide();
  });
  UI.contextMenu.register({
    selector: ".chatBox",
    build: function (v3_0) {
      var v3_1 = {
        callback: function (v4_0, v4_1) {
          if (v4_0 == "clear") {
            var v4_2 = v2_2.getChannelString(v2_2.channels[v2_2.currentChannel].name, v2_2.channels[v2_2.currentChannel].type);
            v2_2.content.find(".channelMessages[name=\"" + v4_2 + "\"]").empty();
          } else if (v4_0 == "copy") {
            navigator.clipboard.writeText(window.getSelection().toString()).catch(v6_0 => console.error("Failed to copy: ", v6_0));
          } else if (v4_0 == "select") {
            try {
              var v4_3 = document.createRange();
              v4_3.selectNode(document.getElementById("chatMessages"));
              window.getSelection().removeAllRanges();
              window.getSelection().addRange(v4_3);
            } catch (v6_0) {}
          }
        },
        items: {
          copy: {
            name: "Copy text",
            icon: "fa-copy"
          },
          select: {
            name: "Select all",
            icon: "fa-i-cursor"
          },
          "-": {
            type: "cm_separator"
          },
          clear: {
            name: "Clear text",
            icon: "fa-broom"
          }
        }
      };
      $.each(v3_1.items, function (v4_0, v4_1) {
        v3_1.items[v4_0].name &&= function () {
          return textManager.getString("menu.textbox." + v4_0, null, false);
        };
      });
      return v3_1;
    }
  });
  UI.contextMenu.register({
    selector: ".chatBox a",
    build: function (v3_0) {
      var v3_1 = {
        callback: function (v4_0, v4_1) {
          if (v4_0 == "copylink") {
            var v4_2 = v4_1.$trigger;
            navigator.clipboard.writeText(v4_2.attr("href"));
          } else if (v4_0 == "openlink") {
            var v4_2 = v4_1.$trigger;
            window.open(v4_2.attr("href"), "_blank");
          }
        },
        items: {
          copylink: {
            name: "Copy link",
            icon: "fa-copy"
          },
          openlink: {
            name: "Open link",
            icon: "fa-arrow-up-right-from-square"
          }
        }
      };
      $.each(v3_1.items, function (v4_0, v4_1) {
        v3_1.items[v4_0].name &&= function () {
          return textManager.getString("menu.textbox." + v4_0, null, false);
        };
      });
      return v3_1;
    }
  });
  UI.contextMenu.register({
    selector: ".chatBox img",
    build: function (v3_0) {
      return {
        callback: function (v4_0, v4_1) {
          if (v4_0 == "copyimage") {
            const v5_0 = v4_1.$trigger[0];
            fetch(v5_0.src).then(v6_0 => v6_0.blob()).then(v6_0 => {
              navigator.clipboard.write([new ClipboardItem({
                [v6_0.type]: v6_0
              })]);
            }).catch(v6_0 => console.error("Failed to copy image: ", v6_0));
          }
        },
        items: {
          copyimage: {
            name: function () {
              return textManager.getString("menu.textbox.copyimage", null, false);
            },
            icon: "fa-copy"
          }
        }
      };
    }
  });
  $(this.emojiList).on("emojiSelected", function (v3_0) {
    v2_2.content.find("input[name=\"text\"]").val(v2_2.content.find("input[name=\"text\"]").val() + v3_0.emoji);
  });
  this.content.find("button[name=\"submit\"]").on(UI.pointerEvent("click"), function (v3_0) {
    v3_0.preventDefault();
    v2_2.sendMessage();
    v2_2.content.find("input[name=\"text\"]").focus();
  });
  this.content.find("button[name=\"attachImage\"]").on(UI.pointerEvent("click"), function (v3_0) {
    v3_0.preventDefault();
    v2_2.content.find("input[name=\"imageFile\"]").trigger("click");
  });
  this.content.find("input[name=\"imageFile\"]").on("change", function (v3_0) {
    if (this.files && this.files[0]) {
      v2_2.handleImageFile(this.files[0]);
    }
    $(this).val("");
  });
  this.updateAttachImageButton();
  this.content.find(".chatBox").on("copy", function (v3_0) {
    // Only hide msgTime if fixCopyAction is NOT true
    if (localStorage.getItem("fixCopyAction") !== "true") {
      v2_2.content.find(".msgTime").hide();
      setTimeout(function () {
        v2_2.content.find(".msgTime").show();
      }, 100);
    }
  });
  this.content.find("input[name=\"text\"]").on("blur", function (v3_0) {
    if (!v2_2.userTag.isHovering()) {
      setTimeout(function () {
        v2_2.userTag.hide();
      }, 250);
    }
  });
  this.content.find("input[name=\"text\"]").on("focus", function (v3_0) {
    v2_2.updateAttachImageButton();
    var v3_1 = v2_2.currentWord(this);
    var v3_2 = v3_1.word;
    if (v3_2[0] == "@") {
      v2_2.showUserTag(v3_2.slice(1));
    }
  });
  this.content.find("input[name=\"text\"]").on(UI.pointerEvent("click"), function (v3_0) {
    var v3_1 = v2_2.currentWord(this);
    var v3_2 = v3_1.word;
    if (v3_2[0] == "@") {
      v2_2.showUserTag(v3_2.slice(1));
    } else {
      v2_2.userTag.hide();
    }
  });
  this.content.find("input[name=\"text\"]").on("keydown", function (v3_0) {
    if (v2_2.userTag.isVisible()) {
      var v3_1 = ["ArrowUp", "ArrowDown", "Enter"];
      if (v3_1.indexOf(v3_0.key) > -1) {
        v3_0.preventDefault();
        if (v3_0.key == "ArrowUp") {
          v2_2.userTag.up();
        } else if (v3_0.key == "ArrowDown") {
          v2_2.userTag.down();
        }
        return;
      }
    }
    if (v3_0.which == 13) {
      v3_0.preventDefault();
      v2_2.sendMessage();
    }
  });
  this.content.find("input[name=\"text\"]").on("keyup", function (v3_0) {
    var v3_1 = v2_2.currentWord(this);
    var v3_2 = v3_1.word;
    if (v3_2[0] == "@") {
      v2_2.showUserTag(v3_2.slice(1));
      if (v3_0.key == "Enter") {
        v2_2.userTag.accept();
      }
    } else {
      v2_2.userTag.hide();
    }
  });
  this.content.on(UI.pointerEvent("click"), ".chatDataUri", function (v3_0) {
    v3_0.preventDefault();
    UI.imageViewerDialog.loadImage($(this).attr("src"));
    UI.imageViewerDialog.show();
  });
  this.content.find("input[name=\"text\"]").on("paste", function (v3_0) {
    var v3_1 = v3_0.originalEvent.clipboardData || window.clipboardData;
    if (!v3_1) {
      return;
    }
    var v3_2 = v3_1.items;
    if (!v3_2) {
      return;
    }
    for (var v3_3 = 0; v3_3 < v3_2.length; v3_3++) {
      var v3_4 = v3_2[v3_3];
      if (v3_4.kind === "file" && v3_4.type.startsWith("image/")) {
        var v3_5 = v3_4.getAsFile();
        if (v3_5) {
          v3_0.preventDefault();
          v2_2.handleImageFile(v3_5);
        }
        break;
      }
    }
  });
  this.content.on("dragover", function (v3_0) {
    v3_0.preventDefault();
  });
  this.content.on("drop", function (v3_0) {
    v3_0.preventDefault();
    var v3_1 = v3_0.originalEvent.dataTransfer.files;
    if (v3_1.length > 0) {
      var v3_2 = v3_1[0];
      if (v3_2.type.startsWith("image/")) {
        v2_2.handleImageFile(v3_2);
      }
    }
  });
  this.content.on(UI.pointerEvent("click"), ".closePM", function (v3_0) {
    v3_0.preventDefault();
    v3_0.stopPropagation();
    var v3_1 = v2_2.getChannelObject($(this).attr("name"));
    v2_2.closeChannel(v3_1.name, v3_1.type);
  });
  this.content.find(".fontIncrease").on(UI.pointerEvent("click"), function (v3_0) {
    v3_0.preventDefault();
    v2_2.fontIncrease();
  });
  this.content.find(".fontDecrease").on(UI.pointerEvent("click"), function (v3_0) {
    v3_0.preventDefault();
    v2_2.fontDecrease();
  });
  this.content.find("a[name=\"newPM\"]").on(UI.pointerEvent("click"), function (v3_0) {
    v3_0.preventDefault();
    var v3_1 = 0;
    $.each(room.users, function (v4_0, v4_1) {
      if (!v2_2.existsChannel(v4_1.username, "user")) {
        v3_1++;
      }
    });
    if (v3_1 > 0) {
      v2_2.enableModal(v2_2.loadFile("forms/chat.modal.newpm.html"));
      v2_2.content.find("select[name=\"userspm\"]").focus();
      var v3_2 = v2_2.content.find("select[name=\"userspm\"]");
      v2_2.content.find(".btn[name=\"addPM\"]").on(UI.pointerEvent("click"), function (v5_0) {
        v5_0.preventDefault();
        if (!v2_2.existsChannel(v3_2.val(), "user")) {
          v2_2.addChannel(v3_2.val(), "user");
          v2_2.selectChannel(v3_2.val(), "user");
          v2_2.disableModal();
        }
      });
      $.each(room.users, function (v5_0, v5_1) {
        if (!v2_2.existsChannel(v5_1.username, "user")) {
          v3_2.append(new Option(v5_1.username, v5_1.username));
        }
      });
    } else {
      UI.dialogHandler.showAlert(textManager.getString("alerts.txtNoMoreUsers"));
    }
  });
  this.content.on(UI.pointerEvent("up"), ".channelTitle", function (v3_0) {
    v3_0.preventDefault();
    var v3_1 = $(this).attr("name");
    var v3_2 = v2_2.getChannelObject(v3_1);
    if (v3_0.which && v3_0.which == 2) {
      v2_2.closeChannel(v3_2.name, v3_2.type);
    } else {
      v2_2.selectChannel(v3_2.name, v3_2.type);
    }
  });
  this.content.on(UI.pointerEvent("click"), "button[name=\"emoji\"]", function (v3_0) {
    v3_0.preventDefault();
    v2_2.showEmojiSelector();
  });
  $(this).on("dialogResizingEnded dialogMaximized dialogRestored", function (v3_0) {
    v2_2.scroll.scroll({
      y: "100%"
    });
    if (v2_2.emojiList.isVisible()) {
      v2_2.showEmojiSelector();
    }
    if (v2_2.userTag.isVisible()) {
      v2_2.showUserTag();
    }
  });
  this.content.on(UI.pointerEvent("click"), "a[data-thumb-service=\"fmgallery\"]", function (v3_0) {
    v3_0.preventDefault();
    UI.galleryImageDialog.show($(this).data("thumb-id"));
  });
  this.content.on(UI.pointerEvent("click"), "a[data-thumb-service=\"fmgalleryuser\"]", function (v3_0) {
    v3_0.preventDefault();
    UI.userGalleryDialog.loadGallery("UID", $(this).data("thumb-id"));
    UI.userGalleryDialog.show();
  });
  this.content.on(UI.pointerEvent("click"), "a[data-thumb-service=\"fmgalleryusername\"]", function (v3_0) {
    v3_0.preventDefault();
    UI.userGalleryDialog.loadGallery("USERNAME", $(this).data("thumb-id"));
    UI.userGalleryDialog.show();
  });
  this.content.on(UI.pointerEvent("click"), "a[data-thumb-service=\"fmgallerytag\"]", function (v3_0) {
    v3_0.preventDefault();
    UI.userGalleryDialog.loadGallery("TAG", $(this).data("thumb-id"));
    UI.userGalleryDialog.show();
  });
}
