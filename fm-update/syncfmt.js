const fs=require("fs"),p=require("@babel/parser"),t=require("@babel/types"),gen=require("@babel/generator").default;
const a=p.parse(fs.readFileSync("final.canon.js","utf8"),{errorRecovery:true});
const cls={};for(const s of a.program.body){ if(t.isClassDeclaration(s)) cls[s.id.name]=s;
  if(t.isVariableDeclaration(s)&&s.declarations[0].init){ /* BrushCustomModded IIFE */ const c=gen(s).code; if(/class extends BrushStub/.test(c)) cls[s.declarations[0].id.name]={raw:c}; } }
const keysOf=(code)=>{const m=code.match(/getSync\(\)\s*\{[\s\S]*?\n  \}/);if(!m)return "(none)";const ks=[...m[0].matchAll(/^\s+(\w+):/gm)].map(x=>x[1]);return ks.join(",")||m[0].replace(/\s+/g," ").slice(0,120);};
const readsOf=(code)=>{const m=code.match(/setSync\((\w+)\)\s*\{[\s\S]*?\n  \}/);if(!m)return "(none)";const v=m[1];return [...new Set([...m[0].matchAll(new RegExp(v+"\.(\w+)","g"))].map(x=>x[1]))].join(",");};
for(const n of Object.keys(cls).filter(n=>/^Brush\w+Modded$/.test(n))){const stock=n.replace("Modded","");
  const mc=cls[n].raw||gen(cls[n]).code, sc=cls[stock]?gen(cls[stock]).code:"";
  console.log(`${n}: sends {${keysOf(mc)}}  | stock ${stock} reads {${readsOf(sc)}} sends {${keysOf(sc)}}`);}
