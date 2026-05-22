#!/usr/bin/env bash
set -euo pipefail

APP_DOMAIN="${SLIDEENGAGE_APP_DOMAIN:-https://your-real-vercel-domain.vercel.app}"
INSTALL_ROOT="${HOME}/Library/Application Support/SlideEngage"
MANIFEST_DIR="${INSTALL_ROOT}/OfficeAddin"
POWERPOINT_WEF_DIR="${HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef"

mkdir -p "${MANIFEST_DIR}" "${POWERPOINT_WEF_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_MANIFEST="${SCRIPT_DIR}/manifest.xml"

if [[ ! -f "${SOURCE_MANIFEST}" ]]; then
  echo "SlideEngage manifest.xml was not found next to the installer script." >&2
  exit 1
fi

cp "${SOURCE_MANIFEST}" "${MANIFEST_DIR}/manifest.xml"
cp "${SOURCE_MANIFEST}" "${POWERPOINT_WEF_DIR}/SlideEngage.xml"

cat > "${INSTALL_ROOT}/SlideEngage.url" <<URL
${APP_DOMAIN}
URL

echo "SlideEngage has been registered for PowerPoint."
echo "Restart PowerPoint, then open the SlideEngage ribbon button."
