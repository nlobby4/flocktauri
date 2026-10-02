import sys
L=open('merged.js',encoding='utf8').read().split('\n')
want=set(int(x) for x in sys.argv[1].split(','))
maxl=int(sys.argv[2]) if len(sys.argv)>2 else 80
n=0;i=0
while i<len(L):
  if L[i].startswith('<<<<<<<'):
    n+=1; s=i
    while not L[i].startswith('>>>>>>>'): i+=1
    if n in want:
      print(f'######## #{n} (lines {s+1}-{i+1})')
      print('\n'.join(L[max(0,s-4):s]))
      blk=L[s:i+1]
      if len(blk)>maxl: blk=blk[:maxl]+['... (%d more)'%(len(L[s:i+1])-maxl)]
      print('\n'.join(blk))
  i+=1
