import re
L=open('merged.js',encoding='utf8').read().split('\n')
i=0;n=0;cls=''
while i<len(L):
  m=re.match(r'^(class|function|var|let|const) (\w+)',L[i])
  if m: cls=m.group(2)
  if L[i].startswith('<<<<<<<'):
    s=i
    while not L[i].startswith('|||||||'): i+=1
    b=i
    while not L[i].startswith('======='): i+=1
    e=i
    while not L[i].startswith('>>>>>>>'): i+=1
    n+=1; print(f"#{n} line {s+1} in {cls}: mod={b-s-1} base={e-b-1} new={i-e-1}")
  i+=1
