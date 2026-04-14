import re

# Ler o arquivo
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir o comentário antigo pelo novo
old_comment = '/* Após importar ?d=, organizador autenticado deve ir ao painel — senão parece que o link "não funciona" e os votos "somem". */'
new_comment = '/* Se tem ?voter, o organizador quer votar. Caso contrário, redirecionar para painel. */'

content = content.replace(old_comment, new_comment)

# Escrever de volta
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Arquivo atualizado.")
