#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/dist/installer/macos"
APP_DIR="${BUILD_DIR}/SlideEngage Installer"
PKG_ROOT="${BUILD_DIR}/pkg-root"
SCRIPTS_DIR="${BUILD_DIR}/pkg-scripts"
OUT_DIR="${ROOT_DIR}/public/downloads"
PKG_PATH="${BUILD_DIR}/SlideEngage-PowerPoint-Addin.pkg"
DMG_PATH="${OUT_DIR}/SlideEngage-macOS.dmg"
PKG_DOWNLOAD_PATH="${OUT_DIR}/SlideEngage-macOS.pkg"
ZIP_PATH="${OUT_DIR}/SlideEngage-macOS-Installer.zip"

mkdir -p "${APP_DIR}" "${PKG_ROOT}/Library/Application Support/SlideEngage/OfficeAddin" "${SCRIPTS_DIR}" "${OUT_DIR}"

cp "${ROOT_DIR}/public/manifest.xml" "${PKG_ROOT}/Library/Application Support/SlideEngage/OfficeAddin/manifest.xml"
cp "${ROOT_DIR}/installer/macos/install-slideengage.sh" "${APP_DIR}/install-slideengage.sh"
cp "${ROOT_DIR}/installer/macos/uninstall-slideengage.sh" "${APP_DIR}/uninstall-slideengage.sh"
cp "${ROOT_DIR}/public/manifest.xml" "${APP_DIR}/manifest.xml"
cp "${ROOT_DIR}/installer/assets/icon-512.png" "${APP_DIR}/SlideEngage.png"

cat > "${SCRIPTS_DIR}/postinstall" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

CONSOLE_USER="$(stat -f '%Su' /dev/console)"
USER_HOME="$(dscl . -read "/Users/${CONSOLE_USER}" NFSHomeDirectory | awk '{print $2}')"
MANIFEST_SOURCE="/Library/Application Support/SlideEngage/OfficeAddin/manifest.xml"
POWERPOINT_WEF_DIR="${USER_HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef"
POWERPOINT_ALT_WEF_DIR="${USER_HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Library/Application Support/Microsoft/Office/16.0/Wef"

mkdir -p "${POWERPOINT_WEF_DIR}" "${POWERPOINT_ALT_WEF_DIR}"
cp "${MANIFEST_SOURCE}" "${POWERPOINT_WEF_DIR}/SlideEngage.xml"
cp "${MANIFEST_SOURCE}" "${POWERPOINT_ALT_WEF_DIR}/SlideEngage.xml"
chown -R "${CONSOLE_USER}" "${POWERPOINT_WEF_DIR}" "${POWERPOINT_ALT_WEF_DIR}"

exit 0
SCRIPT

chmod +x "${SCRIPTS_DIR}/postinstall" "${APP_DIR}/install-slideengage.sh" "${APP_DIR}/uninstall-slideengage.sh"

pkgbuild \
  --identifier "app.slideengage.powerpoint.addin" \
  --version "1.0.0" \
  --root "${PKG_ROOT}" \
  --scripts "${SCRIPTS_DIR}" \
  "${PKG_PATH}"

cp "${PKG_PATH}" "${PKG_DOWNLOAD_PATH}"

rm -f "${DMG_PATH}"
rm -f "${ZIP_PATH}"
if hdiutil create \
    -volname "SlideEngage PowerPoint Add-in" \
    -srcfolder "${BUILD_DIR}" \
    -ov \
    -format UDZO \
    "${DMG_PATH}"; then
  echo "Created ${DMG_PATH}"
else
  echo "hdiutil could not create a DMG in this environment. Creating ZIP fallback." >&2
  (cd "${BUILD_DIR}" && zip -r -X "${ZIP_PATH}" "SlideEngage Installer")
  echo "Created ${ZIP_PATH}"
fi

echo "Created ${PKG_DOWNLOAD_PATH}"
