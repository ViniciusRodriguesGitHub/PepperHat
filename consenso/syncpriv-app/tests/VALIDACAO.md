# Validação do Consenso

38 testes automatizados aprovados com `node --test tests/core.test.js tests/flows.test.js tests/sw.test.js`. Os testes de fluxos executam funções reais da página em um ambiente isolado, com armazenamento e nuvem simulados. Incluem 500 identidades diferentes; não são testes de carga do Firebase.

Não foi possível validar visualmente o navegador, login Google ou Firebase real neste ambiente. As alterações estão locais, sem publicação. Publicar também firestore.rules para aplicar as proteções de convidados no servidor; regras não foram testadas em emulador.

Limitações encontradas:
- Sem nuvem, votos ficam no navegador de cada participante e não são consolidados entre aparelhos. Use eventos sincronizados para convites reais.
- Sem cadastro, editar requer o mesmo navegador/perfil e aparelho, preservando os dados do site. Outro aparelho ou dados apagados geram outra identidade. Pessoas que compartilham o mesmo perfil de navegador compartilham essa identidade.
- Identidades anônimas distintas permitem participantes distintos, mas não garantem uma pessoa por voto. Não foi medida a capacidade ou quota do Firebase.

Campo adicional: testes cobrem obrigatoriedade (incluindo espaços), limite de 300 caracteres, edição, cancelamento e gravação somente no voto privado. O rótulo é livre (até 80 caracteres); a resposta é textual, sem validação específica de CPF ou endereço. As regras precisam ser publicadas junto com a página.

Até quatro informações adicionais: configuração em lista numerada com adicionar/remover e contador; votação e painel em grade responsiva de duas colunas (uma no celular). Compatibilidade preservada com eventos antigos de campo único. Testes incluem obrigatoriedade dos quatro campos, edição, limites e ausência das respostas nos recibos/comentários públicos. Ainda sem validação visual ou emulador Firebase.

Correção da confirmação da grade: preparação retorna antes de montar dados do voto, impedindo acesso a respostas ainda vazias. Regressões cobrem quatro campos vazios e falha de abertura. Grade completa permanece visível mesmo com todos os horários bloqueados, com legenda, título acessível e botões desabilitados nos bloqueios. Cache atualizado para v12.

Convidados com reunião em cache: autenticação é aguardada antes da assinatura remota e a tela só recebe a configuração da nuvem; respostas adicionais são preservadas nas duas rotinas de leitura. Service worker v13 usa rede primeiro para página/core e limpa apenas caches do Consenso. Testes cobrem restauração Google, sessão anônima, falha de autenticação, reunião em cache, campos privados e navegação online/offline.

O evento informado foi https://viniciusrodriguesgithub.github.io/PepperHat/consenso/syncpriv-app/#event/ex4kmp8vnfqhgp9htjhjli. Acesso HTTP indisponível e nenhum navegador conectado: não foi possível inspecionar produção nem confirmar as regras atualmente ativas. Firebase CLI não instalado neste ambiente. A causa exata de permission-denied em produção não foi confirmada. Não foi feito deploy.

Para aplicar as regras deste projeto pelo Firebase CLI autenticado, na pasta consenso/syncpriv-app: `firebase deploy --only firestore:rules --project pepperhatapps --config firebase.consenso.json`. Esse arquivo publica o conjunto compartilhado de regras em firestore.rules: revisar o diff com as regras ativas antes de publicar, para preservar regras de outros aplicativos. A página e sw.js também precisam chegar ao GitHub Pages.
