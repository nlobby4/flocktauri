# Apply conflict resolutions to merged.js -> resolved.js.  Values: "mod", "new", "both" (mod then new),
# "newmod" (new then mod), or a literal replacement string.
import sys, re
from res import RES
L = open('merged.js', encoding='utf8').read().split('\n')
out = []; i = 0; n = 0; unresolved = []
while i < len(L):
    if not L[i].startswith('<<<<<<<'):
        out.append(L[i]); i += 1; continue
    n += 1; i += 1; mod = []; base = []; new = []
    while not L[i].startswith('|||||||'): mod.append(L[i]); i += 1
    i += 1
    while not L[i].startswith('======='): base.append(L[i]); i += 1
    i += 1
    while not L[i].startswith('>>>>>>>'): new.append(L[i]); i += 1
    i += 1
    r = RES.get(n)
    if r is None:
        unresolved.append(n); out += ['<<<<<<< mod'] + mod + ['||||||| base'] + base + ['======='] + new + ['>>>>>>> new']
    elif callable(r): out += r(mod, base, new)
    elif r == 'mod': out += mod
    elif r == 'new': out += new
    elif r == 'both': out += mod + new
    elif r == 'newmod': out += new + mod
    else: out += r.strip('\n').split('\n')
open('resolved.js', 'w', encoding='utf8').write('\n'.join(out))
print('conflicts', n, 'unresolved', unresolved)
