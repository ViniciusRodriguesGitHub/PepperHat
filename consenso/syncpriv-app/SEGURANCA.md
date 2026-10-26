# Segurança — atualização de 26/10/2026

## Proteções aplicadas

- Permissões públicas restritas aos caminhos conhecidos do Kanban e dos convites, sem wildcard genérico de coleções/apps. O Kanban público continua colaborativo, com validação de formato; o privado permanece isolado por proprietário.
- Somente o dono lista suas reuniões. Convidados consultam a reunião específica pelo link; não podem enumerar os lookups. Lookup não troca de dono nem recebe campos extras.
- O cliente só confirma a grade inicial: não altera livremente proprietário, prazo, quorum e estados de apuração após abertura. Apuração e finalização permanecem no servidor.
- Regras recusam horários malformados/duplicados. Recibos exigem voto existente e data correspondente; comentários públicos devem corresponder ao voto e à autorização de compartilhamento.
- A apuração do servidor desconsidera horários fora da grade/período, datas inválidas e bloqueios.
- Gatilhos fixados em artifacts/pepperhatapps. Agendadores ignoram documentos fora da estrutura esperada. E-mail valida origem do job, reunião finalizada, modo de coleta e destinatário correspondente ao voto privado.
- Gatilhos consultam o voto atual na transação, evitando que um evento atrasado sobrescreva dados mais recentes.
- Novos IDs usam 128 bits criptograficamente aleatórios; links existentes são preservados.
- body-parser atualizado para 2.4.0. React/ReactDOM fixados em 18.3.1 e Lucide em 1.61.0, preservando os ícones utilizados.

## Verificação e CI

72 testes locais, 15 testes de regras no emulador e 69 verificações reais passaram. Os testes reais usaram apenas reuniões/identidades temporárias, removidas ao final. Nenhuma reunião real foi modificada. Não houve teste de carga, OAuth Google interativo ou envio SMTP real.

`npm test` executa lógica/fluxos/funções; `npm run test:rules` usa o projeto local demo-consenso. Java 21 portátil foi preparado na pasta temporária deste computador. Em outra máquina, Java 21 e Firebase CLI são pré-requisitos. O CI os provisiona automaticamente.

Ferramentas de testes: Node 22, Firebase 12.19.0 e @firebase/rules-unit-testing 5.0.2. Override de @grpc/grpc-js 1.14.6 corrige advisories transitivos sem exigir outro Node. Instalações reproduzidas por npm ci e auditorias sem vulnerabilidades reportadas, tanto nas funções quanto nas ferramentas de teste.

O workflow de segurança usa runner Ubuntu padrão somente enquanto o repositório for público, sem credenciais de produção, upload de artefatos ou cache. Ações fixadas por SHA. Executa testes e auditorias, mas não publica funções/regras nem bloqueia automaticamente o workflow separado do GitHub Pages.

## Limitações e próximas etapas

- O Kanban público continua aberto à colaboração. Restringir editores altera o uso e exige aviso prévio.
- Convite aberto não comprova identidade nem uma pessoa por voto. UIDs ainda aparecem em recibos/comentários públicos; substituir por identificadores por reunião e contagem agregada exige migração compatível.
- Validação integral antes de persistir um voto, centralizada em endpoint, continua planejada. As regras atuais não verificam individualmente toda data contra o intervalo; o servidor filtra essas opções na apuração.
- Consultas collectionGroup continuam globais e validam caminhos antes de processar. Filas privadas dedicadas devem evitar que documentos inválidos consumam a janela limitada de processamento.
- App Check não foi exigido: é necessário preparar também os aplicativos que compartilham o Firestore e observar compatibilidade antes de enforcement.
- Build próprio, CSP, SRI e hospedagem em origem dedicada permanecem planejados. Babel/Tailwind ainda executam em runtime. Mudar de origem exige preservar convites e identidades anônimas existentes.
- Dados locais antigos são preservados. Redução/retenção/limpeza do cache não pode eliminar sem aviso a possibilidade de editar votos anônimos.
- SMTP continua não configurado. CONFIGURAR-EMAIL.md orienta o titular a gerar uma senha de app e usar o assistente. Nenhuma mensagem real foi enviada nesta atualização.

Nenhuma assinatura, plano ou configuração de faturamento foi alterada. A infraestrutura existente continua sujeita às franquias e consumo vigentes; isso não garante custo total zero. Preferências permanentes do responsável estão em AGENTS.md.
