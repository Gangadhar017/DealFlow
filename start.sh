#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
echo "DealFlow360 → http://localhost:4300"
( sleep 1 && (xdg-open http://localhost:4300 || open http://localhost:4300) ) >/dev/null 2>&1 &
node server.js
