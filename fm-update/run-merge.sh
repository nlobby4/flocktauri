set -e
C="node --max-old-space-size=8000"
bash pipeline.sh 2>&1 | grep -v "^  "
for f in base-13.4.0.deob.wc mod-13.4.0.wc; do $C prep.js $f.canon.js $f.prep.js >/dev/null; $C canon.js $f.prep.js $f.prep.js; npx prettier --print-width 100 --parser babel $f.prep.js --write >/dev/null; done
sed -i 's/this\.clickX && this\.clicks\.length/this.clicks \&\& this.clicks.length/' mod-13.4.0.wc.prep.js
TAKE_NEW=BrushCustom TAKE_MOD="Uploader.method:draw" TAKE_NEWM="Socket.method:receive" $C smerge.js base-13.4.0.deob.wc.prep.js mod-13.4.0.wc.prep.js new-13.5.7.canon.js smerged.js smerge-report.txt
cp smerged.js merged.js
