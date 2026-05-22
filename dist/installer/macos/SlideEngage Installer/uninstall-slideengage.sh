#!/usr/bin/env bash
set -euo pipefail

rm -f "${HOME}/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/SlideEngage.xml"
rm -rf "${HOME}/Library/Application Support/SlideEngage"

echo "SlideEngage add-in registration removed. Restart PowerPoint."
