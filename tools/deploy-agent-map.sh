#!/bin/zsh
# Copies the latest archify-delivered Asimo Agent Map from the Obsidian vault into the site
# and pushes to GitHub (Hostinger auto-deploys main). Triggered by launchd WatchPaths or manually.
set -e
SRC="$HOME/Documents/Obsidian/Asimo-Sessions"
SITE="$HOME/Documents/asimo/asimogg Website"
DST="$SITE/assets/agent-map"
[ -f "$SRC/asimo-agent-map.html" ] || { echo "no delivered map"; exit 0; }
sleep 5   # archify writes atomically, but wait for JSON + HTML pair to settle
mkdir -p "$DST"
cp "$SRC/asimo-agent-map.html" "$DST/asimo-agent-map.html"
[ -f "$SRC/asimo-agent-map.architecture.json" ] && cp "$SRC/asimo-agent-map.architecture.json" "$DST/asimo-agent-map.architecture.json"
cd "$SITE"
git add assets/agent-map
if git diff --cached --quiet; then echo "agent map unchanged"; exit 0; fi
TITLE=$(python3 -c "import json;print(json.load(open('assets/agent-map/asimo-agent-map.architecture.json'))['meta'].get('title','Asimo Agent Map'))" 2>/dev/null || echo "Asimo Agent Map")
git commit -q -m "Agent map: auto-deploy $TITLE ($(date '+%Y-%m-%d %H:%M'))" -m "Source: Obsidian/Asimo-Sessions, delivered by archify; pushed by tools/deploy-agent-map.sh"
git push -q origin main
echo "deployed $(date)"
