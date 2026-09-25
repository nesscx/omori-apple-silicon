#!/bin/sh

echo ""
echo "/-------------------------------------------\\"
echo "|     - OMORI APPLE SILICON PATCH TOOL -    |"
echo "|             by Snowp and ynx0             |"
echo "|                                           |"
echo "| github.com/SnowpMakes/omori-apple-silicon |"
echo "|             https://snowp.io              |"
echo "\\-------------------------------------------/"
echo ""

# Files from lib/ are taken from the folder next to this script when it is there (a clone or ZIP of
# the repository) and downloaded from the repository otherwise. OMORI_DIR overrides the game folder.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB_URL=https://raw.githubusercontent.com/SnowpMakes/omori-apple-silicon/master/lib
OMORI="${OMORI_DIR:-$HOME/Library/Application Support/Steam/steamapps/common/OMORI}"

get_lib() {
  if [ -f "${SCRIPT_DIR}/lib/$1" ]; then
    cp "${SCRIPT_DIR}/lib/$1" "./$1";
  else
    curl -#fL -o "$1" "${LIB_URL}/$1";
  fi;
}

if [ ! -d "${OMORI}" ] || [ ! -d "${OMORI}/OMORI.app" ]; then
  echo "[!!] Please install OMORI using Steam before using this tool.";
  exit 1;
fi;

echo "Backing up original OMORI copy.."
if [ -f "${OMORI}/OMORI.original.app" ]; then
  rm -rf "${OMORI}/OMORI.original.app"
fi;
cp -r "${OMORI}/OMORI.app" "${OMORI}/OMORI.original.app";

TMPFOLDER=`mktemp -d /tmp/omori-patch.XXXXXX` || exit 1
cd $TMPFOLDER;

mv "${OMORI}/OMORI.app" "./OMORI.original.app";

echo "Downloading nwjs.."
curl -#L -o nwjs.zip https://dl.nwjs.io/v0.77.0/nwjs-v0.77.0-osx-arm64.zip
echo "Getting node polyfill patch and fullscreen fix.."
get_lib node-polyfill-patch.js
get_lib fullscreen-fix.js
get_lib arm64-fullscreen-mod.json
echo "Downloading greenworks patches.."
get_lib greenworks.js
curl -#L -o greenworks-osxarm64.node https://github.com/SnowpMakes/greenworks-arm64/releases/download/v1.0.0/greenworks-osxarm64.node
echo "Downloading steamworks api.."
curl -# -o steam.zip https://dl.snowp.io/omori-apple-silicon/steam.zip

echo "Extracting nwjs.."
unzip -q nwjs.zip
echo "Extracting steamworks.."
unzip -qq steam.zip

echo "Patching game.."
mv ./nwjs-v0.77.0-osx-arm64/nwjs.app ./OMORI.app
mv -f ./OMORI.original.app/Contents/Resources/app.nw ./OMORI.app/Contents/Resources/
mv -f ./OMORI.original.app/Contents/Resources/app.icns ./OMORI.app/Contents/Resources/
mv -f ./node-polyfill-patch.js ./OMORI.app/Contents/Resources/app.nw/js/libs/
mv -f ./greenworks.js ./OMORI.app/Contents/Resources/app.nw/js/libs/
mv -f ./greenworks-osxarm64.node ./OMORI.app/Contents/Resources/app.nw/js/libs/
mv -f ./steam/libsteam_api.dylib ./OMORI.app/Contents/Resources/app.nw/js/libs/
mv -f ./steam/libsdkencryptedappticket.dylib ./OMORI.app/Contents/Resources/app.nw/js/libs/

echo "Installing fullscreen fix.."
NW=./OMORI.app/Contents/Resources/app.nw
if [ -d "${NW}/modloader" ]; then
  # OneLoader/77Loader replace index.html, so the fix goes in as a mod.
  mkdir -p "${NW}/mods/arm64_fullscreen"
  mv -f ./fullscreen-fix.js "${NW}/mods/arm64_fullscreen/arm64_fullscreen.js"
  mv -f ./arm64-fullscreen-mod.json "${NW}/mods/arm64_fullscreen/mod.json"
else
  mv -f ./fullscreen-fix.js "${NW}/js/libs/"
  if ! grep -q 'js/libs/fullscreen-fix.js' "${NW}/index.html"; then
    awk '{ print } /src="js\/main.js"/ { cr = (substr($0, length($0)) == "\r") ? "\r" : ""; print "    <script type=\"text/javascript\" src=\"js/libs/fullscreen-fix.js\"></script>" cr }' "${NW}/index.html" > ./index.html
    mv -f ./index.html "${NW}/index.html"
  fi;
fi;

echo "Finished. Moving patched game back to original location.."
mv "./OMORI.app" "${OMORI}/OMORI.app"

echo ""
echo "Done! Launch OMORI through Steam."
echo "Note that if you update OMORI or check the integrity of the game files, you'll need to reapply the patch."
echo ""
echo ""

