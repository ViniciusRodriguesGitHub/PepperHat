# Validação do Consenso

28 testes automatizados aprovados com `node --test tests/core.test.js tests/flows.test.js`. Os testes de fluxos executam funções reais da página em um ambiente isolado, com armazenamento e nuvem simulados. Incluem 500 identidades diferentes; não são testes de carga do Firebase.

Não foi possível validar visualmente o navegador, login Google ou Firebase real neste ambiente. As alterações estão locais, sem publicação. Publicar também firestore.rules para aplicar as proteções de convidados no servidor; regras não foram testadas em emulador.

Limitações encontradas:
- Sem nuvem, votos ficam no navegador de cada participante e não são consolidados entre aparelhos. Use eventos sincronizados para convites reais.
- Sem cadastro, editar requer o mesmo navegador/perfil e aparelho, preservando os dados do site. Outro aparelho ou dados apagados geram outra identidade. Pessoas que compartilham o mesmo perfil de navegador compartilham essa identidade.
- Identidades anônimas distintas permitem participantes distintos, mas não garantem uma pessoa por voto. Não foi medida a capacidade ou quota do Firebase.

Campo adicional: testes cobrem obrigatoriedade (incluindo espaços), limite de 300 caracteres, edição, cancelamento e gravação somente no voto privado. O rótulo é livre (até 80 caracteres); a resposta é textual, sem validação específica de CPF ou endereço. As regras precisam ser publicadas junto com a página.

Até quatro informações adicionais: configuração em lista numerada com adicionar/remover e contador; votação e painel em grade responsiva de duas colunas (uma no celular). Compatibilidade preservada com eventos antigos de campo único. Testes incluem obrigatoriedade dos quatro campos, edição, limites e ausência das respostas nos recibos/comentários públicos. Ainda sem validação visual ou emulador Firebase.
