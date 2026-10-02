// Add manual names + auto-names for new FMEvent subclasses to mapping.json
const fs=require("fs"),p=require("@babel/parser"),t=require("@babel/types"),gen=require("@babel/generator").default;
const map=JSON.parse(fs.readFileSync("mapping.json","utf8"));
Object.assign(map.mapping,{v1_421:"Socket",v1_448:"Account",v1_86:"Captcha",v1_115:"UserGalleryDialog"});
const ast=p.parse(fs.readFileSync("wc-13.5.7.canon.js","utf8"),{errorRecovery:true});
const body=ast.program.body[0].expression.callee.body.body;
const inv=Object.fromEntries(Object.entries(map.mapping).map(([k,v])=>[v,k]));
const taken=new Set(Object.values(map.mapping));
let n=0;
for(const s of body){ if(!t.isClassDeclaration(s)||map.mapping[s.id.name])continue;
  const sup=s.superClass&&s.superClass.name; if(sup!==inv.FMEvent)continue;
  const m=gen(s).code.match(/jQuery\.Event\("(\w+)"\)/); if(!m)continue;
  const nm=m[1]+"Event"; if(taken.has(nm))continue; map.mapping[s.id.name]=nm; taken.add(nm); n++; }
const src=fs.readFileSync("wc-13.5.7.canon.js","utf8");
let c=0;
for(const m of src.matchAll(/this\.register\("([A-Z0-9_]+)", (v\d+_\d+)\)/g)){ const nm="Cmd"+m[1]; if(map.mapping[m[2]]||taken.has(nm))continue; map.mapping[m[2]]=nm; taken.add(nm); c++; }
console.log("command handlers named:",c);
fs.writeFileSync("mapping.json",JSON.stringify(map,null,1)); console.log("auto-named events:",n);
