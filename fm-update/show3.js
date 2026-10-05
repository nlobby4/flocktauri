// Write base/mod/new of one unit plus the two diffs: node show3.js base mod new outdir key...
const fs=require("fs"),path=require("path"),{execFileSync}=require("child_process"),p=require("@babel/parser"),g=require("@babel/generator").default,t=require("@babel/types");
const [,,bf,mf,nf,out,...keys]=process.argv;fs.mkdirSync(out,{recursive:true});
const strip=(x)=>{if(!x||typeof x.type!=="string")return;if(t.isStringLiteral(x)||t.isNumericLiteral(x))delete x.extra;for(const k of t.VISITOR_KEYS[x.type]||[]){const v=x[k];if(Array.isArray(v))v.forEach(strip);else strip(v);}};
function find(f){const a=p.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true});strip(a.program);const m=new Map();
 for(const s of a.program.body){if(t.isClassDeclaration(s))for(const x of s.body.body)m.set(s.id.name+"."+(x.key.name||x.key.value),x);
 const id=s.id&&s.id.name||(s.declarations&&s.declarations[0].id&&s.declarations[0].id.name);if(id)m.set(id,s);}return m;}
const B=find(bf),M=find(mf),N=find(nf);
const d=(a,b)=>{try{execFileSync("diff",["-u",a,b]);return ""}catch(e){return e.stdout.toString()}};
for(const k of keys){const f=s=>path.join(out,k+"."+s+".js");
 for(const [s,m] of [["base",B],["mod",M],["new",N]]) fs.writeFileSync(f(s),m.has(k)?g(m.get(k)).code+"\n":"// missing\n");
 fs.writeFileSync(path.join(out,k+".UPSTREAM.diff"),d(f("base"),f("new")));
 fs.writeFileSync(path.join(out,k+".MOD.diff"),d(f("base"),f("mod")));}
