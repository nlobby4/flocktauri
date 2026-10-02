const fs=require("fs"),p=require("@babel/parser"),tr=require("@babel/traverse").default;
function globals(f){const a=p.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true});const g=new Set();
 tr(a,{Program(path){for(const k of Object.keys(path.scope.globals))g.add(k);}}); 
 // declared top-level
 const d=new Set();tr(a,{Program(path){for(const k of Object.keys(path.scope.bindings))d.add(k);path.stop();}});
 return {g,d};}
const F=globals("final.canon.js"),N=globals("new-13.5.7.canon.js"),M=globals("mod-13.4.0.wc.prep.js"),B=globals("base-13.4.0.deob.wc.prep.js");
const undef=[...F.g].filter(x=>!F.d.has(x));
const newUndef=new Set([...N.g].filter(x=>!N.d.has(x)));
const modUndef=new Set([...M.g].filter(x=>!M.d.has(x)));
console.log("final undeclared globals not undeclared in new:");
console.log(undef.filter(x=>!newUndef.has(x)).map(x=>x+(modUndef.has(x)?"":" [MERGE-INTRODUCED]")+(B.d.has(x)?" [was declared in 13.4.0]":"")).join("\n"));
