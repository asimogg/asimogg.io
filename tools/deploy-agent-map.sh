#!/bin/zsh
# Copies the latest archify-delivered Asimo Agent Map from the Obsidian vault into the site
# and pushes to GitHub (Hostinger auto-deploys main). Triggered by launchd WatchPaths or manually.
set -e
SRC="$HOME/Documents/Obsidian/Asimo-Sessions"
SITE="$HOME/Documents/asimo/asimogg Website"
DST="$SITE/assets/agent-map"
[ -f "$SRC/asimo-agent-map.html" ] || { echo "no delivered map"; exit 0; }
[ "$1" = "--now" ] || sleep 5   # launchd path: wait for JSON + HTML pair to settle
mkdir -p "$DST"
cp "$SRC/asimo-agent-map.html" "$DST/asimo-agent-map.html"
[ -f "$SRC/asimo-agent-map.architecture.json" ] && cp "$SRC/asimo-agent-map.architecture.json" "$DST/asimo-agent-map.architecture.json"
cd "$SITE"
# keep the public change log: add this version's "changes" card once, with today's date
python3 - <<'PY'
import json, datetime, re
src = json.load(open("assets/agent-map/asimo-agent-map.architecture.json"))
title = src.get("meta", {}).get("title", "")
m = re.search(r"v(\d+(?:\.\d+)*)", title)
if m:
    ver = "v" + m.group(1)
    path = "assets/agent-map/log.json"
    try: log = json.load(open(path))
    except Exception: log = {"versions": []}
    if not any(v.get("version") == ver for v in log["versions"]):
        items = []
        for card in src.get("cards", []):
            if "change" in str(card.get("title", "")).lower():
                for it in card.get("items", []):
                    text = it if isinstance(it, str) else json.dumps(it, ensure_ascii=False)
                    if re.match(r"^v\d+\.\d+:", text):  # recap lines of older versions
                        continue
                    text = re.sub(r"^" + re.escape(ver) + r":\s*", "", text)
                    items.append(text)
        log["versions"].insert(0, {"version": ver, "date": datetime.date.today().isoformat(), "items": items})
        json.dump(log, open(path, "w"), indent=1, ensure_ascii=False)
PY
git add assets/agent-map
if git diff --cached --quiet; then echo "agent map unchanged"; exit 0; fi
TITLE=$(python3 -c "import json;print(json.load(open('assets/agent-map/asimo-agent-map.architecture.json'))['meta'].get('title','Asimo Agent Map'))" 2>/dev/null || echo "Asimo Agent Map")
git commit -q -m "Agent map: auto-deploy $TITLE ($(date '+%Y-%m-%d %H:%M'))" -m "Source: Obsidian/Asimo-Sessions, delivered by archify; pushed by tools/deploy-agent-map.sh"
git push -q origin main
echo "deployed $(date)"
