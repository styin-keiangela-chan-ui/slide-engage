#!/usr/bin/env bash
set -euo pipefail

APP_DOMAIN="${SLIDEENGAGE_APP_DOMAIN:-https://slide-engage.vercel.app}"
INSTALL_ROOT="${HOME}/Library/Application Support/SlideEngage"
MANIFEST_DIR="${INSTALL_ROOT}/OfficeAddin"
POWERPOINT_WEF_DIR="${HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef"
POWERPOINT_ALT_WEF_DIR="${HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Library/Application Support/Microsoft/Office/16.0/Wef"

mkdir -p "${MANIFEST_DIR}" "${POWERPOINT_WEF_DIR}" "${POWERPOINT_ALT_WEF_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_MANIFEST="${SCRIPT_DIR}/manifest.xml"

if [[ ! -f "${SOURCE_MANIFEST}" ]]; then
  echo "SlideEngage manifest.xml was not found next to the installer script." >&2
  exit 1
fi

if ! grep -q "https://slide-engage.vercel.app/taskpane" "${SOURCE_MANIFEST}"; then
  echo "SlideEngage manifest does not point to the production taskpane URL." >&2
  exit 1
fi

cp "${SOURCE_MANIFEST}" "${MANIFEST_DIR}/manifest.xml"
cp "${SOURCE_MANIFEST}" "${POWERPOINT_WEF_DIR}/SlideEngage.xml"
cp "${SOURCE_MANIFEST}" "${POWERPOINT_ALT_WEF_DIR}/SlideEngage.xml"

cat > "${INSTALL_ROOT}/SlideEngage.url" <<URL
${APP_DOMAIN}
URL

echo "SlideEngage has been registered for PowerPoint."
echo "Installed manifest:"
echo "  ${POWERPOINT_WEF_DIR}/SlideEngage.xml"
echo "  ${POWERPOINT_ALT_WEF_DIR}/SlideEngage.xml"
echo "Restart PowerPoint, then open Insert > Add-ins > My Add-ins and choose SlideEngage."
