#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Ler o arquivo
with open('index.html', 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

modified = False

for i in range(len(lines)):
    line = lines[i]
    
    # Mudança 2: Atualizar if (canManageEventId(id))
    if 'if (canManageEventId(id)) {' in line and 'isVoterMode' not in line:
        context = ''.join(lines[max(0, i-10):i])
        if "startsWith('event/')" in context:
            print(f'Atualizando if na linha {i+1}')
            lines[i] = line.replace('if (canManageEventId(id)) {', 'if (canManageEventId(id) && !isVoterMode) {')
            modified = True
    
    # Mudança 3: Atualizar comentário
    if 'Após importar' in line and '?voter' not in line:
        print(f'Atualizando comentário na linha {i+1}')
        lines[i] = '          /* Se tem ?voter, o organizador quer votar. Caso contrário, redirecionar para painel. */\n'
        modified = True

if modified:
    with open('index.html', 'w', encoding='utf-8-sig') as f:
        f.writelines(lines)
    print('Alterações concluídas com sucesso!')
else:
    print('Nenhuma alteração foi necessária')
