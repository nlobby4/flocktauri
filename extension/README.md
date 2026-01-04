# Modifying Flockmod using a browser extension

This contains the unpackaged files required to install a chromium extension that can modify Flockmod automatically.

To use this, you must go to chrome://extensions and enable Developer mode - then press "Load unpacked", ensuring the folder that you load contains the manifest.json, script.js and flockmod.js files.

The extension does not overwrite the existing flockmod.js but allows you to inject your own custom code into the site. It should be possible to refactor previous mods to exist as a standalone .js and then inject them via an extension like this. This way, it will be very simple to work around flockmod updates.

It does not currently work with the app, however it may be possible to bundle it with a tauri app in the future to create a modded app.

This extension currently has one modification - it changes the board size to (1920,2160) upon entering a room. 
