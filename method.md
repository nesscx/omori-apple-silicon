# Technical Writeup on the OMORI arm64 patch

## Quick outline
* Repackage omori into nw.js v0.77.0 ([7323cc662](https://dl.nwjs.io/live-build/nw77/20230531-164722/7323cc662/v0.77.0/))
* Update steamworks to 1.53a (`libsteam_api.dylib` and `libsdkencryptedappticket.dylib`)
* Patch [greenworks](https://github.com/SnowpMakes/greenworks-arm64) to compile to arm64 with steamworks 1.53a
* Polyfill node v20.1.0 included with nw.js v0.77.0 to restore deprecated support for writing raw number types to files causing [a bug](https://github.com/SnowpMakes/omori-apple-silicon/issues/1).
* Extend that polyfill to `fs.writeFileSync`, which OMORI uses to write `TITLEDATA` after an ending ([#5](https://github.com/SnowpMakes/omori-apple-silicon/issues/5)).
* Fix fullscreen on nw.js v0.77.0 ([#6](https://github.com/SnowpMakes/omori-apple-silicon/issues/6)) with `lib/fullscreen-fix.js`. It keeps fullscreen on, avoids the 0x0 window after leaving it, and scales the game to the largest 4:3 size that fits. The patch loads it from `index.html`, or installs it as the `arm64_fullscreen` mod when OneLoader/77Loader is present.

