#!/usr/bin/env bash
# Renders every concept × format of banner.html to out/ at exact platform pixel sizes.
# Usage: ./render.sh            (all)   CONCEPTS="b" FORMATS="sq st" ./render.sh   (subset)
S="$(cd "$(dirname "$0")" && pwd)"
declare -A DIM=([sq]="1080,1080" [st]="1080,1920" [li]="1200,627" [fb]="1200,630")
declare -A NAME=([sq]="instagram-post-1080x1080" [st]="instagram-story-1080x1920" [li]="linkedin-1200x627" [fb]="facebook-1200x630")
mkdir -p "$S/out"
for c in ${CONCEPTS:-a b c}; do for s in ${FORMATS:-sq st li fb}; do
  google-chrome --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=1 --window-size=${DIM[$s]} --virtual-time-budget=8000 \
    --screenshot="$S/out/${c}-${NAME[$s]}.png" "file://$S/banner.html?c=$c&s=$s" >/dev/null 2>&1
done; done
