# Apuração e notificações do Consenso

O total esperado de participantes é usado como referência. Mais da metade significa estritamente mais de 50%: com 6 esperados, 4 votos; com 5, 3 votos. A lista de opções nunca é exibida enquanto os votos estiverem abertos. Antes da maioria, a antecipação exige confirmação explícita. Abrir a apuração encerra votos e edições definitivamente. O organizador vê todas as opções escolhidas por pelo menos um participante e pode selecionar uma futura, com alerta se parte do grupo estiver indisponível.

As grades individuais são lidas apenas pelo próprio participante e pelo servidor. O organizador recebe identificação e comentários separados, sem horários. A regra genérica de workspace não se aplica ao Consenso; a apuração agregada fica em organizer_results/summary e só pode ser lida pelo organizador após o encerramento. Administradores técnicos do projeto Firebase ainda têm acesso administrativo: a proteção é da aplicação e não constitui criptografia contra o proprietário da infraestrutura.

## Prazo

O prazo é opcional, salvo em UTC com o fuso do evento. É imposto nas regras do Firestore. Uma função agendada a cada minuto finaliza eventos vencidos sem precisar de navegador. O resultado considera apenas opções futuras: maior quantidade de disponíveis, com desempate pela data/hora mais próxima. Grades de dia inteiro podem escolher o próprio dia. Sem votos ou sem disponibilidade futura, finaliza sem data e apresenta o motivo. Se todos votarem antes, o organizador pode encerrar e escolher. Mesmo se o organizador tentar finalizar após o prazo, o servidor aplica a política automática.

## E-mail

O e-mail é um campo próprio, fora das quatro informações adicionais, nos modos nenhum, opcional ou obrigatório. O padrão é não solicitar. Só ficam habilitados os modos de coleta quando consensoAutomationStatus confirma que o remetente automático está configurado. O endereço informado é privado e usado apenas para a notificação do resultado. O remetente é do Consenso e Reply-To usa o e-mail verificado do cadastro do organizador. Autenticação Google do usuário não autoriza o aplicativo a enviar por aquela conta.

O serviço SMTP ainda precisa ser configurado. Sem configuração, a página não promete envio nem exige coleta de e-mail. Para ativar:

1. Configurar um remetente verificado e um provedor SMTP.
2. Definir no ambiente de functions: CONSENSO_SMTP_HOST, CONSENSO_SMTP_PORT, CONSENSO_SMTP_USER e CONSENSO_EMAIL_FROM. Não versionar arquivos .env.
3. Salvar a senha/token com Firebase Secret Manager como CONSENSO_SMTP_PASSWORD, sem colocá-la no código ou em mensagens.
4. Publicar as funções novamente e testar com destinatário controlado antes de habilitar para usuários.

Cada notificação tem um documento privado com estado e ID estável. Destinatários repetidos na mesma reunião são deduplicados. O envio tenta no máximo três vezes, com intervalo de cinco minutos; após isso fica failed. Não usa a política de repetição ilimitada por sete dias. SMTP não garante entrega exatamente uma vez se a conexão cair após o provedor aceitar a mensagem; o Message-ID estável ajuda na identificação de duplicatas, mas não substitui idempotência do provedor.

## Publicação e testes

- npm test: testes de lógica, fluxos e regras de apresentação.
- npm run test:firestore:live -- --firebase-tools-root CAMINHO: teste de acesso com dados temporários.
- npm run test:automation:live -- --firebase-tools-root CAMINHO: verifica privacidade, antecipação, encerramento e execução real do prazo; remove os eventos e contas temporários ao final.
- npx firebase-tools deploy --only functions:consenso,firestore --project pepperhatapps --config firebase.consenso.json --non-interactive: publica o servidor e as regras/índices.

O predeploy copia core.js para functions/consenso-core.cjs. O arquivo gerado é ignorado pelo Git. As dependências do servidor são isoladas em functions/package.json e package-lock.json. O código da página e sw.js continua no GitHub Pages. Imagens de build geradas no Artifact Registry têm retenção de sete dias para evitar acúmulo; isso não remove código-fonte, votos ou funções ativas.

## Limites de produto

“Todos votaram” é medido pelo total esperado, pois um convite aberto não contém uma lista nominal de convidados. Sem cadastro não se garante uma pessoa por voto; navegadores/perfis diferentes geram outras identidades. Uma lista de convidados com convites individuais é a evolução indicada quando for necessário comprovar participação de pessoas específicas. O fuso e o encerramento irreversível são mostrados antes da confirmação.
