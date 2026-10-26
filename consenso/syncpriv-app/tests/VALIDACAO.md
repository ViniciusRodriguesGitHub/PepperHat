# Validação do Consenso

## Grade manual e moderação — 26/10/2026

- `npm test`: 84 testes passaram; `npm run test:rules`: 16 testes passaram, incluindo compatibilidade do Kanban.
- Navegador Edge em 390px: troca entre modalidades sem enviar o formulário, inclusão/remoção de alternativas manuais, voto apenas nessas alternativas, prazo com minutos 00 e exclusão de voto com recálculo.
- `node scripts/verify-manual-live.cjs`: 16 verificações no Firebase publicado, usando somente reunião e identidades temporárias, removidas ao final. Cobertura: alternativas exatas (incluindo 23:30), recusa de combinações não oferecidas, permissão exclusiva do organizador para excluir, remoção de recibo/dados privados/comentário, apuração recalculada, finalização e impedimento de exclusão após resultado.
- Publicação restrita às regras Firestore e funções `consensoDeleteVote`, `consensoOpenTally`, `consensoFinalize` e `consensoFinalizeDeadlines`. Nenhuma alteração de plano ou serviço remetente.

Excluir um voto não bloqueia a identidade: enquanto a votação estiver aberta, a pessoa pode votar novamente. Após abrir a apuração, a exclusão atualiza o resumo sem reabrir votos. Após o prazo ou o resultado final, a exclusão é recusada pelo servidor.

## Correção em produção — 20/10/2026

O evento maso1s39y73fyyf082io estava aberto, sem finalização, e exigia a informação “nº”. As regras ativas no Firebase eram de 08/08/2026 e não permitiam requiredInfoAnswers no voto. Isso causava HTTP 403 para convidados, mesmo autenticados. O proprietário conseguia escrever por uma permissão própria mais ampla, ocultando o problema nos testes feitos apenas com o organizador.

O teste de integração reproduziu HTTP 403 antes da publicação. As regras atuais de firestore.rules foram compiladas e publicadas no projeto pepperhatapps, preservando as regras das outras aplicações. Release ativo: projects/pepperhatapps/rulesets/97a52f3c-563d-4347-997f-5250719b7fc1.

Após a publicação, 15 verificações reais passaram: criação de evento temporário, voto e edição anônimos, leitura do próprio voto, voto e edição com conta autenticada, privacidade entre convidados, rejeição de respostas ausentes ou em branco, rejeição de horários bloqueados, envio de quatro respostas e rejeição após encerramento. O evento e as três identidades temporárias foram removidos ao final. Nenhum voto do evento do usuário foi alterado.

## Testes locais

40 testes automatizados: `npm test`.

Cobrem consenso, rotas do organizador, bloqueios visíveis (incluindo sábado e domingo entre sexta e segunda), quatro informações obrigatórias, edição/cancelamento, autenticação restaurada, configuração atual da nuvem e atualização do cache.

## Repetir o teste real

Use uma sessão autenticada do Firebase CLI com acesso ao projeto. O teste cria exclusivamente dados temporários e os remove em finally; não registra tokens ou credenciais.

`npm run test:firestore:live -- --firebase-tools-root CAMINHO_DO_PACOTE_FIREBASE_TOOLS`

O diretório informado é a raiz do pacote oficial firebase-tools (contendo lib/api.js). O teste usa a sessão em ~/.config/configstore/firebase-tools.json e mantém os tokens apenas na memória. A conta autenticada temporária usa senha aleatória e email example.invalid; nenhuma mensagem é enviada.

## Publicar regras

`npx --yes firebase-tools deploy --only firestore:rules --project pepperhatapps --config firebase.consenso.json --non-interactive`

Commit/push da página no GitHub Pages não publica regras no Firebase. Compare firestore.rules com o conjunto ativo antes de futuras publicações, porque o projeto é compartilhado com outros aplicativos.

## Limites da validação

A verificação de produção foi feita pela API real do Firebase. Não houve teste visual no navegador nem login interativo Google; a conta autenticada temporária usa o provedor de senha. As regras de votos não distinguem o provedor, apenas o uid autenticado.

Sem nuvem, votos de aparelhos distintos não são consolidados. Sem cadastro, editar exige o mesmo navegador/perfil e aparelho, preservando dados do site. Compartilhar o mesmo perfil de navegador compartilha a identidade; autenticação anônima não garante uma pessoa por voto. A simulação local de 500 identidades não mede capacidade ou quotas do Firebase.

## Nome completo obrigatório — 20/10/2026

O formulário não oculta mais o nome para usuários com nome salvo ou com login. O campo “Nome completo — obrigatório” permanece visível ao votar/editar. A validação exige nome e sobrenome (ao menos duas palavras com letras), aceita acentos/apóstrofos/hífens e outros alfabetos, normaliza espaços e limita a 120 caracteres. O nome do voto salvo é restaurado na edição e ao cancelar. O nome não conta nas quatro informações adicionais.

Regras publicadas: projects/pepperhatapps/rulesets/bbd5f9f1-5b67-4cb0-af72-0b952843bb5e. O teste real foi ampliado para 21 verificações e passou, incluindo recusa de nome vazio ou único para convidados com e sem conta, e aceitação de nomes completos em diferentes alfabetos. Dados temporários removidos. Os 40 testes locais passaram.

## Apuração protegida e prazos — 21/10/2026

55 testes locais aprovados. A página foi compilada em JSX clássico e testada em navegador isolado em dimensões de computador e celular, com dados fictícios: convite em destaque, ocultação das opções, cancelamento da confirmação, encerramento irreversível, opções agregadas, orientações, nome/e-mail obrigatórios e criação com quatro campos. O compilador Babel foi fixado na versão 7.28.5 para evitar mudança automática incompatível do runtime JSX.

Foi adicionado backend Firebase (codebase consenso) para abertura da apuração, finalização manual, agendador de prazo, metadados sem horários individuais e fila privada de notificações. Os detalhes de operação e configuração ficam em AUTOMACAO.md. O envio real de e-mail continua dependente de configurar um remetente/provedor SMTP; as opções de coleta ficam desabilitadas enquanto isso não estiver disponível. As retentativas de envio são limitadas a três, sem política de repetição por sete dias.

Validação publicada em 21/10/2026: funções e regras implantadas com sucesso; GitHub Pages confirmou a nova interface. Foram aprovadas 31 verificações reais de automação e 21 verificações reais de acesso/votos. O agendador encerrou sozinho um evento temporário, sem navegador aberto, e desempatou pela opção futura mais próxima. Confirmados: convidados com/sem conta, nome completo, quatro campos, e-mail obrigatório no servidor, privacidade das grades e dos contatos, maioria estrita, antecipação confirmada, fechamento irreversível e acompanhamento do resultado. Eventos e identidades temporárias foram removidos. Envio SMTP real permanece não configurado e não foi validado.
## Sincronização por conta — 26/10/2026

A listagem e a autorização da gestão passaram a usar firebaseOwnerUid/UID autenticado. Removida a dependência de creatorAdminKey para documentos na nuvem. A lista usa um listener da coleção do proprietário, com autenticação prévia, reconciliação de exclusões confirmadas pelo servidor, proteção contra respostas de contas anteriores e uma gravação local por snapshot. Detalhes/votos são carregados somente no painel. Login Google com falha não declara sucesso; logout encerra o Firebase. Novas reuniões não podem ficar apenas locais silenciosamente. O acesso antigo por e-mail permanece somente para preservar dados locais legados, identificados como tais. Não há migração automática nem reenvio de votos locais antigos.

68 testes locais aprovados, incluindo 11 casos novos: navegador sem cache, propriedade por UID, chave local forjada, troca de conta, callbacks atrasados, inclusões/alterações/exclusões, cache offline, espera pela autenticação, cancelamento, falha de login e hidratação do painel por link direto. JSX final compilado com Babel em runtime clássico.

11 verificações reais no Firebase aprovadas por scripts/verify-account-sync-live.cjs: dois logins independentes da mesma conta, criação sem chave local, listagem compartilhada, atualização entre sessões, coleção independente de outra conta, recusa de escrita por outra conta e exclusão refletida na segunda sessão. Reunião e duas identidades temporárias removidas. O provedor usado no teste real foi senha; não houve login interativo em conta Google pessoal.

Interface testada em Edge headless com contextos separados de computador (1360x1000) e celular (390x844), dados fictícios e camada Firebase simulada: mesma reunião com cache de eventos vazio, atualização remota de criação/exclusão e troca de conta cancelando a assinatura antiga, sem erros JavaScript. Esse teste verifica comportamento funcional; não valida OAuth Google interativo nem entrega de rede Firebase no navegador.
## Proteções de segurança — 26/10/2026

72 testes locais e 15 testes de regras no emulador aprovados. O emulador usa somente demo-consenso. Instalações reproduzidas com npm ci e auditorias sem vulnerabilidades reportadas no pacote de funções e nas ferramentas de teste. Atualizados body-parser 2.4.0 e gRPC dos testes. JSX compilado; confirmados os ícones utilizados na versão fixa do Lucide.

Funções e regras publicadas com sucesso no projeto existente, após comparar as regras ativas com o commit anterior. Passaram 27 verificações reais de votos/permissões, 11 de sincronização entre sessões e 31 de automação/apuração/prazo. Incluem recusa de enumeração de reuniões/convites, horários malformados/duplicados e recibos sem voto. Eventos e identidades temporários removidos. Nenhuma reunião real alterada. SMTP não configurado; envio real não exercitado.

Compatibilidade do Kanban público e privado validada no emulador. Limitações e próximas etapas em SEGURANCA.md. Nenhuma contratação, plano ou faturamento alterado. CI configurado para runner padrão gratuito somente em repositório público, sem credenciais de produção.
