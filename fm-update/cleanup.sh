# Readable flockmod.js from the canonical merge output.
#   bash cleanup.sh            apply cleanup-names.json as it is
#   bash cleanup.sh --names    regenerate cleanup-names.json first (after a new merge)
# Run from fm-update/. Writes ../extension/flockmod.js and cleanup/*.txt reports.
set -e
C="node --max-old-space-size=8000"
mkdir -p cleanup
if [ "$1" = "--names" ]; then $C name-gen.js final.canon.js cleanup-names.json; fi
$C rename.js final.canon.js cleanup-names.json cleanup/renamed.js | tee cleanup/rename-report.txt
$C tidy.js cleanup/renamed.js cleanup/tidied.js cleanup/tidy-report.txt
npx prettier --print-width 100 --parser babel cleanup/tidied.js > cleanup/final.js
node --check cleanup/final.js
$C eqcheck.js final.canon.js cleanup/final.js cleanup > cleanup/eq-diff.txt
tail -1 cleanup/eq-diff.txt
cp cleanup/final.js ../extension/flockmod.js
cd ..
node fm-update/strict.js extension/flockmod.js
node fm-update/injcheck.js extension/flockmod.js
