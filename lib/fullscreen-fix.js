//=============================================================================
// fullscreen-fix.js — fullscreen fixes for OMORI on nw.js 0.77.0 (Apple silicon patch, macOS only)
//-----------------------------------------------------------------------------
// Runs after the game's plugins. The patch script adds it to index.html after main.js or, when
// OneLoader/77Loader is installed (they replace index.html), installs it as the "arm64_fullscreen"
// mod. It only replaces a few functions at runtime; no game file is modified.
//
// 1. Fullscreen did not stay on (issue #6). Any Yanfly.updateResolution() call while in fullscreen
//    resizes the window, which drops fullscreen, and the game calls it from ConfigManager.applyData,
//    from the "restore" event and from nw.Screen events. While in fullscreen, or during the
//    transition, those calls and Yanfly.moveToCenter() are skipped; once the window has left
//    fullscreen they run once, with up-to-date sizes (the macOS code path resizes with innerWidth,
//    which updates late).
// 2. Leaving fullscreen left the window at 0x0: with "resizable": false in package.json, nw.js 0.77
//    animates the exit into an empty frame. The window is made resizable only while it enters, is
//    in or leaves fullscreen.
// 3. On macOS 26, nw.js 0.77 leaves an empty band the height of the title bar (28 pt) between the
//    title bar and the game after leaving fullscreen, which pushes the game down and crops it. No
//    window setting exposed by nw.js removes it, so the window grows by that height and the canvas
//    is aligned to the top. Only applied on macOS 26 or later, where it was observed.
// 4. Fullscreen scale. The game rounds its scale to 3/2/1.5/1, which on a MacBook screen leaves wide
//    black borders on every side. In fullscreen the game is scaled to the largest size that fits:
//      "fit" (default): keeps the 4:3 aspect ratio, with borders only on the sides;
//      "stretch": fills the whole screen.
//    F3 (fn+F3 on a Mac keyboard) switches between them; the choice is saved in
//    save/arm64-fullscreen.json ({"mode": "fit"} or {"mode": "stretch"}).
//    Windowed mode is unchanged.
//=============================================================================
(function () {
    "use strict";
    var TAG = "[arm64-fullscreen]";
    if (typeof require !== "function" || require("os").platform() !== "darwin") return;
    if (window.$arm64Fullscreen) return;

    function pluginsReady() {
        return typeof Graphics !== "undefined" && typeof Yanfly !== "undefined" &&
            typeof Yanfly.updateResolution === "function" && typeof Yanfly.moveToCenter === "function";
    }

    function install() {
        if (window.$arm64Fullscreen) return;
        if (!pluginsReady()) {
            console.warn(TAG, "Yanfly.updateResolution not found; fullscreen fix not installed");
            return;
        }
        var fs = require("fs");
        var path = require("path");
        var win = require("nw.gui").Window.get();
        var G = Graphics;
        var MODES = ["fit", "stretch"];
        var state = { transition: false, watcher: null };
        // Title bar height (windowed) and the band to make up for after leaving fullscreen.
        var titleBar = 28, band = 0;
        var bandBug = parseInt(require("os").release(), 10) >= 25; // Darwin 25 = macOS 26
        try {
            if (!win.isFullscreen) {
                var t = win.height - window.innerHeight;
                if (t > 0 && t < 80) titleBar = t;
            }
        } catch (e) { /* keep 28 */ }

        // ------------------------------------------------------------ mode
        function modeFile() {
            return path.join(StorageManager.localFileDirectoryPath(), "arm64-fullscreen.json");
        }
        function readMode() {
            try {
                var m = JSON.parse(fs.readFileSync(modeFile(), "utf8")).mode;
                if (MODES.indexOf(m) >= 0) return m;
            } catch (e) { /* no file yet: default mode */ }
            return "fit";
        }
        function saveMode() {
            try {
                var dir = path.dirname(modeFile());
                if (!fs.existsSync(dir)) fs.mkdirSync(dir);
                fs.writeFileSync(modeFile(), JSON.stringify({ mode: mode }, null, 2) + "\n");
            } catch (e) {
                console.error(TAG, "could not save the fullscreen mode", e);
            }
        }
        var mode = readMode();

        // ------------------------------------------------------ fullscreen
        function isFullscreen() {
            try { return !!win.isFullscreen; } catch (e) { return false; }
        }
        function geometry() {
            return [isFullscreen(), win.width, win.height, window.innerWidth, window.innerHeight].join(",");
        }
        // Calls fn once the window has not changed for ~0.4 s (end of the macOS animation).
        function whenSettled(fn) {
            var last = null, same = 0, rounds = 0;
            var t = setInterval(function () {
                rounds++;
                var now = geometry();
                if (now === last) same++; else { same = 0; last = now; }
                if (same >= 4 || rounds > 60) { clearInterval(t); fn(); }
            }, 100);
        }
        function rescale() {
            try { G._updateAllElements(); } catch (e) { console.error(TAG, e); }
        }

        var origEnter = G._requestFullScreen;
        var origExit = G._cancelFullScreen;
        var origResolution = Yanfly.updateResolution;
        var origCenter = Yanfly.moveToCenter;

        function afterExit() {
            whenSettled(function () {
                if (!isFullscreen()) {
                    win.setResizable(false);
                    band = bandBug ? titleBar : 0;
                    state.transition = false;
                    // What the game does when the window is restored, now with the final sizes
                    // (and the band made up for: see fitWindow).
                    Yanfly.updateResolution();
                    origCenter.call(Yanfly);
                } else {
                    state.transition = false;
                }
                rescale();
            });
        }
        // Also catches exits that do not go through the game's menu (green button, ctrl+cmd+F).
        function watchExit() {
            if (state.watcher) return;
            state.watcher = setInterval(function () {
                if (state.transition || isFullscreen()) return;
                clearInterval(state.watcher);
                state.watcher = null;
                state.transition = true;
                afterExit();
            }, 500);
        }

        G._requestFullScreen = function () {
            if (isFullscreen()) return;
            state.transition = true;
            win.setResizable(true);
            var r = origEnter.apply(this, arguments);
            whenSettled(function () {
                state.transition = false;
                rescale();
                if (isFullscreen()) watchExit();
                else win.setResizable(false);
            });
            return r;
        };
        G._cancelFullScreen = function () {
            if (!isFullscreen()) return;
            state.transition = true;
            var r = origExit.apply(this, arguments);
            afterExit();
            return r;
        };
        // Like the game's macOS code (moves by half the difference to stay centred), but with an
        // absolute size plus the band: the content ends up ScreenWidth x (ScreenHeight + band).
        function fitWindow() {
            var width = Yanfly.Param.ScreenWidth, height = Yanfly.Param.ScreenHeight + band;
            var dw = width - window.innerWidth, dh = height - window.innerHeight;
            win.moveBy(-1 * Math.ceil(dw / 2), -1 * Math.ceil(dh / 2));
            win.resizeTo(width, height);
        }
        Yanfly.updateResolution = function () {
            if (isFullscreen() || state.transition) return;
            if (!band) return origResolution.apply(this, arguments);
            fitWindow();
        };
        Yanfly.moveToCenter = function () {
            if (isFullscreen() || state.transition) return;
            return origCenter.apply(this, arguments);
        };

        // ----------------------------------------------------------- scale
        var origRealScale = G._updateRealScale;
        var origCenterElement = G._centerElement;
        var origPageToCanvasX = G.pageToCanvasX;
        var origPageToCanvasY = G.pageToCanvasY;

        G._updateRealScale = function () {
            origRealScale.apply(this, arguments);
            this._arm64Scale = null;
            if (!isFullscreen() || !this._stretchEnabled) return;
            var sx = window.innerWidth / this._width;
            var sy = window.innerHeight / this._height;
            if (!(sx > 0 && sy > 0)) return;
            if (mode === "fit") sx = sy = Math.min(sx, sy);
            this._arm64Scale = { x: sx, y: sy };
            this._realScale = Math.min(sx, sy);
        };
        G._centerElement = function (el) {
            origCenterElement.apply(this, arguments);
            var s = this._arm64Scale;
            if (el && band && !isFullscreen()) el.style.bottom = "auto"; // top-aligned, below the band
            if (s && el) {
                el.style.width = (el.width * s.x) + "px";
                el.style.height = (el.height * s.y) + "px";
            }
        };
        G.pageToCanvasX = function (x) {
            var s = this._arm64Scale;
            if (!s || !this._canvas) return origPageToCanvasX.apply(this, arguments);
            return Math.round((x - this._canvas.offsetLeft) / s.x);
        };
        G.pageToCanvasY = function (y) {
            var s = this._arm64Scale;
            if (!s || !this._canvas) return origPageToCanvasY.apply(this, arguments);
            return Math.round((y - this._canvas.offsetTop) / s.y);
        };

        // ------------------------------------------------------------- key
        function setMode(m) {
            if (MODES.indexOf(m) < 0) return mode;
            mode = m;
            saveMode();
            rescale();
            console.log(TAG, "fullscreen mode:", mode);
            return mode;
        }
        document.addEventListener("keydown", function (ev) {
            if (ev.keyCode !== 114 || ev.ctrlKey || ev.altKey || ev.metaKey || ev.repeat) return; // F3
            setMode(mode === "fit" ? "stretch" : "fit");
        });

        // If the game is already in fullscreen, watch for its exit.
        if (isFullscreen()) { win.setResizable(true); watchExit(); }

        window.$arm64Fullscreen = {
            version: "1.0.0",
            mode: function () { return mode; },
            setMode: setMode,
            state: function () {
                return { mode: mode, fullscreen: isFullscreen(), transition: state.transition,
                    scale: G._arm64Scale || null, titleBar: titleBar, band: band };
            }
        };
        console.log(TAG, "loaded; fullscreen mode:", mode);
    }

    // As a mod the plugins are already loaded. From index.html they may not be yet: install before
    // the game boots, from window.onload (set by main.js).
    if (pluginsReady()) {
        install();
    } else {
        var previousOnload = window.onload;
        window.onload = function () {
            install();
            if (typeof previousOnload === "function") return previousOnload.apply(this, arguments);
        };
    }
})();
