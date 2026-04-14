import os

# Ler o arquivo com encoding UTF-16 (Windows default) 
with open('index.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Verificar se o comentário antigo está lá
if 'Após importar' in content:
    # Substituir o comentário antigo pelo novo
    old_comment = '/* Após importar ?d=, organizador autenticado deve ir ao painel — senão parece que o link "não funciona" e os votos "somem". */'
    new_comment = '/* Se tem ?voter, o organizador quer votar. Caso contrário, redirecionar para painel. */'
    
    content = content.replace(old_comment, new_comment)
    
    # Escrever de volta com a mesma codificação
    with open('index.html', 'w', encoding='utf-8-sig') as f:
        f.write(content)
    
    print('Substituição feita com sucesso')
else:
    print('Comentário antigo não encontrado')
