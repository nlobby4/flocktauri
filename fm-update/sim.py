import difflib,sys
a=open(sys.argv[1],encoding='utf8').read().splitlines();b=open(sys.argv[2],encoding='utf8').read().splitlines()
sm=difflib.SequenceMatcher(None,a,b,autojunk=False);ops=[o for o in sm.get_opcodes() if o[0]!='equal']
print('hunks',len(ops),'del',sum(o[2]-o[1] for o in ops),'ins',sum(o[4]-o[3] for o in ops))
if len(sys.argv)>3:
  for o in ops[:int(sys.argv[3])]:
    print('----',o); print('\n'.join('- '+x for x in a[o[1]:o[2]][:6])); print('\n'.join('+ '+x for x in b[o[3]:o[4]][:6]))
