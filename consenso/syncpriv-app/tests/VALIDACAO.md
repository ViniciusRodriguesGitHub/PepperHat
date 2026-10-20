# Validação do Consenso

## Correção em produção — 20/10/2026

O evento maso1s39y73fyyf082io estava aberto, sem finalização, e exigia a informação “nº”. As regras ativas no Firebase eram de 08/08/2026 e não permitiam requiredInfoAnswers no voto. Isso causava HTTP 403 para convidados, mesmo autenticados. O proprietário conseguia escrever por uma permissão própria mais ampla, ocultando o problema nos testes feitos apenas com o organizador.

O teste de integração reproduziu HTTP 403 antes da publicação. As regras atuais de firestore.rules foram compiladas e publicadas no projeto pepperhatapps, preservando as regras das outras aplicações. Release ativo: projects/pepperhatapps/rulesets/97a52f3c-563d-4347-997f-5250719b7fc1.

Após a publicação, 15 verificações reais passaram: criação de evento temporário, voto e edição anônimos, leitura do próprio voto, voto e edição com conta autenticada, privacidade entre convidados, rejeição de respostas ausentes ou em branco, rejeição de horários bloqueados, envio de quatro respostas e rejeição após encerramento. O evento e as três identidades temporárias foram removidos ao final. Nenhum voto do evento do usuário foi alterado.

## Testes locais

38 testes automatizados: `npm test`.

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
