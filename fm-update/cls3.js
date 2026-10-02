// per-class member change summary: which members mod changed, which new changed
const fs=require("fs"),p=require("@babel/parser"),t=require("@babel/types"),gen=require("@babel/generator").default;
const load=f=>{const m=new Map();for(const s of p.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true}).program.body) if(t.isClassDeclaration(s)) m.set(s.id.name,new Map(s.body.body.map(x=>[(x.static?"static ":"")+(x.key.name||x.key.value),gen(x,{comments:false}).code])));return m;};
const B=load("base-13.4.0.deob.wc.prep.js"),M=load("mod-13.4.0.wc.prep.js"),N=load("new-13.5.7.canon.js");
const re=new RegExp(process.argv[2]||".");
for(const [c,bm] of B){ if(!re.test(c)||!M.has(c)||!N.has(c))continue; const mm=M.get(c),nm=N.get(c);
 const keys=new Set([...bm.keys(),...mm.keys(),...nm.keys()]); const md=[],nd=[];
 for(const k of keys){ if(bm.get(k)!==mm.get(k)) md.push(k+(bm.has(k)?"":"+")+(mm.has(k)?"":"-")); if(bm.get(k)!==nm.get(k)) nd.push(k+(bm.has(k)?"":"+")+(nm.has(k)?"":"-")); }
 if(md.length) console.log(`${c}\n  mod: ${md.join(", ")}\n  new: ${nd.join(", ")}`);}
