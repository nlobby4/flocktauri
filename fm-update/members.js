const fs=require("fs"),p=require("@babel/parser"),tr=require("@babel/traverse").default,t=require("@babel/types");
function defs(f){const a=p.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true});const d=new Set(),u=new Map();
 tr(a,{ClassMethod(x){d.add(x.node.key.name||x.node.key.value)},ClassProperty(x){if(x.node.key)d.add(x.node.key.name)},
 ObjectProperty(x){if(x.node.key&&x.node.key.name)d.add(x.node.key.name)},ObjectMethod(x){if(x.node.key&&x.node.key.name)d.add(x.node.key.name)},
 AssignmentExpression(x){const l=x.node.left;if(t.isMemberExpression(l)&&!l.computed)d.add(l.property.name)},
 MemberExpression(x){if(!x.node.computed){const n=x.node.property.name;u.set(n,(u.get(n)||0)+1)}}});return {d,u};}
const B=defs("base-13.4.0.deob.wc.prep.js"),F=defs("final.canon.js");
const removed=[...B.d].filter(x=>!F.d.has(x)&&F.u.has(x));
console.log(removed.map(x=>x+" x"+F.u.get(x)).join("\n"));
