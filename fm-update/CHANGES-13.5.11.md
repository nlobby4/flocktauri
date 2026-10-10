# FlockMod 13.5.10 → 13.5.11 (hash 20afd97a → f11d0757)

Found 2026-10-10. The live page reports `13.5.11+5`. Same script list as 13.5.10, so no library was added or dropped.

There was an in-between build (`dd1c9b3f`) the dating bot loaded around 09:06Z. We never saved that original, so this compares 20afd97a against f11d0757 directly.

Raw diff: `originals/diff-20afd97a-f11d0757/` (made by `fmdiff.py`).

## Connection handshake (ported exactly as vanilla)

* The client no longer looks up its own IP. The `LETSTALK` handler (the one that sends `CONNECTION READY`) stopped calling `/api/conn.php?ip=` on `clientip`, `Device.getIPAddressInfo()` is gone, and so is `Device.ip`.
* WHOIAM now sends `ip: {}` instead of `{country, proxy, hosting}`. Every other field and their order is unchanged.
* `UI.version` is `"13.5.11+5"` and `UI.assetVersion` is `"f11d0757"`.
* The "outdated app" screen shows a refresh icon (`fa-arrows-rotate`), and the loading screen now spins only the default cog icon. This also fixes a bug where the screen text was passed in as the icon.

## Chat: reactions, replies, edit, delete (the big one)

* Every chat line can carry a server message id (`data-id`) and a send time (`data-at`). Your own lines get a local ref (`l1`, `l2`...) until the new `CHATACK` command swaps in the real id.
* Hovering a line shows an action bar with React, Reply, Edit and Delete. Right-click and long press open the same menu, plus Copy message.
* **React:** a quick picker offers 👍 😂 ❤️ 😮 😢, plus a "+" that opens the full emoji list. It sends `USERSET ChatReact {id, emoji}`. The new `CHATREACTIONS` command redraws the chips under a line. Hovering a chip, or long-pressing it on touch, shows who reacted.
* **Reply:** a bar above the input shows "Replying to X". Sent messages carry `replyTo`. A quoted header renders above the reply, and clicking it scrolls to the original and highlights it.
* **Edit:** only your own messages, within 5 minutes (`ChatDialog.EDIT_WINDOW_MS`). It sends `USERSET ChatEdit {id, message}`. `CHATEDITED` replaces the text and adds an "(edited)" tag.
* **Delete:** your own messages delete at once. Moderators with `deletechatmessages` get a confirmation first. It sends `USERSET ChatDelete {id}`. `CHATDELETED` and `CHATDELETEDBY` replace the text with "deleted by author / moderator / moderator X".
* Escape cancels a reply or edit, and switching channels clears it.
* The mention and emoji tagging moved out of `createMessage` into `tagMentions`, `tagEmoji` and `renderMessageText`. Same output.
* New server commands: `CHATACK`, `CHATREACTIONS`, `CHATEDITED`, `CHATDELETED`, `CHATDELETEDBY`.

## Chat links now go through a FlockMod redirect

* `parseURL` now writes `href="https://flockmod.com/url?u=<url>&s=<sig>"`, keeps the real URL in `data-url`, and adds `rel="noopener noreferrer"`.
* Signatures arrive in a `links` map on `CHATMSG`, `CHATACK` and `CHATEDITED`. The client keeps the newest 2000.
* "Copy link" in chat and messenger copies `data-url`, the real link, rather than the redirect.
* Thumbnail embeds in chat and messenger also got `rel="noopener noreferrer"`.

## Reports (users and admins)

* Sending a report no longer says "Report sent" right away. The server answers `USERRESPONSE REPORT` with `OK`, `DUPLICATE`, `LIMIT` or a failure, and each gets its own message.
* The admin console has a new **Reports** page (`AdminConsoleReportsSubDialog`). Reports are grouped by person, with signals like online, server ban, room bans, muted and silenced. Admins can read each report, ban from it (prefilled IPs, reason and length), mark it resolved, dismiss it, or view closed reports. Wire messages: `ADMINGET ReportList`, `ADMINSET AdminReports resolve`, and `ADMINREQRESPONSE Arp`.
* A new `NOTIFICATION` command (type `REPORT`) posts "X reported Y (reason) in room" to staff chat and refreshes the Reports page.

## "IP" renamed to "Connection ID" for room staff

* The room manager's ban, silence and mute dialogs now warn "invalid connection id" instead of "invalid IP" (`alerts.txtInvalidConnectionId`).
* The admin clients list tooltip says "Connection ID" where it said "Public IP".

## Profiles

* The user profile uses a new form, `forms/userprofile.v2.html`. Buttons are now links (`a[name=...]`), the stats are tiles with icons, and joined date, rank and uid sit in read-only inputs.
* Follow, Friend and Message are hidden for guests. The follow icon flips between user-plus and user-minus.
* A profile request also sends the username when it's known.
* Edit profile uses `forms/editprofile.v2.html`. Status applies in place, on Enter or the apply button, without closing the dialog. Apply and Clear grey out when there's nothing to change, and a "go to account" link was added. The account section is hidden for guests.

## Smaller changes

* **Messenger:** the conversation options menu gained Profile and Gallery, and its selector is now scoped to `#conversationTitle`.
* **Friends:** the dialog is wider (600, was 520), loading a page now reapplies its size type, and request buttons are built by a shared `rowButton` that adds tooltips.
* **Gallery comments:** the "Who reacted" link and its popup are gone, replaced by the hover tooltip described under Chat. A refused comment (`Comment add FAIL`) is removed again and shows the server's reason.
* **Gallery upload:** a failed upload shows the server's plain-text reason when there is one.
* **User gallery strip:** it now has an overlay scrollbar.
* **Sounds:** the staff chat sound obeys the `modchat` sound setting (`SoundSystem.SETTINGS`).

## Port notes

* All 69 code hunks in `changes.diff` were ported by hand (71 `@@` headers, 2 are only the obfuscator's string-table boilerplate; `summary.txt` groups them into 52 changed spots) into the readable file. No webcrack or name recovery was used; junk names were mapped to real helpers by reading each one's definition. All of them resolved to existing functions (`escapeHTML`, `htmlToText`, `formatTimestamp`, `isValidIP`, `Table`, `Switch`, `Point`, `SubDialog`).
* No conflicts with Zexium's mods. The ChatDialog constructor, which has the `fixCopyAction` mod, and `addLine`, which has `fixAutoScroll`, kept their mods.
