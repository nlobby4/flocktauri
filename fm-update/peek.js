const fs=require("fs"),parser=require("@babel/parser"),t=require("@babel/types"),gen=require("@babel/generator").default;
const [,,f,...names]=process.argv;const ast=parser.parse(fs.readFileSync(f,"utf8"),{errorRecovery:true});
let body=ast.program.body; const e=body.find(s=>t.isExpressionStatement(s)&&t.isCallExpression(s.expression)&&s.expression.callee.body); if(e&&body.length<3) body=e.expression.callee.body.body;
for(const s of body){const id=s.id&&s.id.name; if(!names.includes(id))continue;
 if(t.isClassDeclaration(s)) console.log(id,"extends",s.superClass&&s.superClass.name,":",s.body.body.map(m=>m.key.name||m.key.value).join(","));
 else console.log(id,":",gen(s).code.slice(0,300).replace(/\s+/g," "));}
