# upstream change for a unit: base(prep) -> new.  arg: Class.method or name
w() { node meth.js "$1" "$2" | { if [[ "$2" == *.* ]]; then echo "class X {"; cat; echo "}"; else cat; fi; } > "$3"; npx prettier --print-width 100 --parser babel "$3" --write >/dev/null; }
w base-13.4.0.deob.wc.prep.js "$1" /tmp/a.js; w new-13.5.7.canon.js "$1" /tmp/b.js
git -c core.autocrlf=false diff --no-index -U2 --histogram /tmp/a.js /tmp/b.js | tail -n +5
