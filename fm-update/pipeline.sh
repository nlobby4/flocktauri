set -e
C="node --max-old-space-size=8000"
fmt() { npx prettier --print-width 100 --parser babel "$1" --write >/dev/null; }
for f in base-13.4.0.deob.wc mod-13.4.0.wc wc-13.4.0 wc-13.5.7; do $C canon.js $f.js $f.canon.js; fmt $f.canon.js; done
$C match.js wc-13.4.0.canon.js wc-13.5.7.canon.js mapping.json
$C names.js
$C restore.js wc-13.5.7.canon.js mapping.json new-13.5.7.named.js
$C canon.js new-13.5.7.named.js new-13.5.7.canon.js; fmt new-13.5.7.canon.js
