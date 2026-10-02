// print source of Class.method (or top-level name) from a file: node meth.js file Class.method
const fs=require("fs"),parser=require("@babel/parser"),t=require("@babel/types"),gen=require("@babel/generator").default;
const [,,f,spec]=process.argv;const [cn,mn]=spec.split(".");
const ast=parser.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true});
for(const s of ast.program.body){
  const id=s.id&&s.id.name||(s.declarations&&s.declarations[0].id.name);
  if(id!==cn)continue;
  if(!mn){console.log(gen(s).code);continue;}
  const cls=t.isClassDeclaration(s)?s:null; if(!cls)continue;
  for(const m of cls.body.body) if((m.key.name||m.key.value)===mn) console.log(gen(m).code);
}
