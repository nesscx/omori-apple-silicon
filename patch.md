# Patch script

*How do I apply the patch?*

### Preparation

Make sure you have Steam installed, and OMORI is downloaded within Steam. Launch the game at least once after downloading it. It'll probably crash but that's okay.

### Download

Download the latest version of the patch script (omori-apple-silicon-patch.command) from the [releases](https://github.com/SnowpMakes/omori-apple-silicon/releases/latest) page.

To use changes that are not in a release yet, download the repository instead (Code → Download ZIP) and run the script from the unzipped folder: it uses the files in `lib/` next to it.

### Run the patch

Within Finder, control+click the patch script and choose `Open` to execute it. A terminal should pop up with progress information.

Once the process has finished, indicated by `Done!` in the output and `[Process completed]` at the bottom of the terminal, quit terminal and launch OMORI through Steam.

### Fullscreen

Fullscreen (OPTIONS → GENERAL → FULLSCREEN) stays on and scales the game to the largest size that fits, keeping its 4:3 aspect ratio. Press F3 (fn+F3 on a Mac keyboard) to switch between that and stretching the game to fill the screen; the choice is remembered.

### Mods

If you use OneLoader or 77Loader, install it before running the patch; the fullscreen fix is then installed as the `arm64_fullscreen` mod, because the mod loader replaces `index.html`. If you install the mod loader afterwards, copy `lib/fullscreen-fix.js` to `mods/arm64_fullscreen/arm64_fullscreen.js` and `lib/arm64-fullscreen-mod.json` to `mods/arm64_fullscreen/mod.json` inside `OMORI.app/Contents/Resources/app.nw`.

### Troubleshooting

If MacOS complains about the security of the file, or it's "not executable", open a Terminal within the enclosing folder of the script and execute `chmod +x ./omori-apple-silicon-patch.command`. After that, try running the patch again.

