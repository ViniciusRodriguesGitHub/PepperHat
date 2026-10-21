# Ativar e-mails sem contratar um provedor

Para o uso inicial do Consenso, a opção mais simples é uma conta Gmail gratuita como remetente único. Não é necessário comprar domínio, assinar Google Workspace ou configurar cada organizador. Prefira uma conta dedicada ao Consenso. O destinatário verá esse endereço; ao responder, usará o e-mail verificado do organizador.

## O que você precisa fazer uma vez

1. Entre no Gmail que será o remetente. Ative a [verificação em duas etapas](https://myaccount.google.com/signinoptions/two-step-verification).
2. Abra [Senhas de app](https://myaccount.google.com/apppasswords), crie uma chamada **Consenso** e copie as 16 letras. Não envie essa senha pelo chat. Se essa opção não aparecer, consulte a [ajuda do Google](https://support.google.com/accounts/answer/185833?hl=pt-BR): contas de organizações, Proteção Avançada e algumas configurações de segurança podem impedir seu uso.
3. Abra o PowerShell e execute:

```powershell
cd 'C:\Projetos\Funil de vendas\consenso\syncpriv-app'
.\scripts\configurar-email.ps1
```

4. Informe o Gmail e confirme a configuração. Cole a senha de app no campo oculto. O assistente autentica no Gmail, envia **um teste para o próprio remetente**, guarda a senha no Secret Manager e publica as funções no projeto **pepperhatapps**. Aguarde a conclusão. A senha não é gravada no código, nos argumentos de processos nem no arquivo `.env`; o arquivo local contém apenas endereço/servidor/porta.
5. Confira a caixa de entrada e spam. Reabra o Consenso, crie uma reunião de teste com e-mail obrigatório, vote e defina o resultado. Confira o recebimento antes de usar com convidados reais. Aceitação pelo SMTP não garante entrega na caixa de entrada.

As ferramentas e dependências já estão instaladas neste computador. Se o login Firebase expirar, execute `npx firebase-tools login` e repita. Em outra máquina, instale Node.js/Firebase CLI e execute `npm ci` dentro de `functions` antes de usar o assistente. Se a publicação falhar, a configuração fica preparada: repita o assistente ou execute `npx firebase-tools deploy --only functions:consenso --project pepperhatapps --config firebase.consenso.json --non-interactive`. A ativação só está concluída após publicar e testar uma reunião.

## Limites e custos

O Gmail não cobra assinatura por esse SMTP de conta pessoal. O Google informa bloqueios acima de 500 mensagens/dia, mas pode restringir antes por segurança/reputação. Esse limite é **compartilhado por todas as reuniões e pelo uso normal da conta**, não por organizador. Não trate o número como capacidade garantida. [Limites oficiais](https://support.google.com/mail/answer/22839?hl=pt-BR).

As funções, o agendador e o Secret Manager continuam na infraestrutura Firebase/Google Cloud existente. Há franquias gratuitas, mas consumo acima delas pode gerar cobrança; isso não significa custo total garantido de zero. [Firebase](https://firebase.google.com/pricing) · [Secret Manager](https://cloud.google.com/secret-manager/pricing). O assistente não contrata plano de e-mail pago nem altera o plano de faturamento do projeto.

Se a senha principal do Google mudar, as senhas de app são revogadas: gere outra e repita o assistente. Repetições criam versões do segredo; versões antigas também contam na franquia do Secret Manager e devem ser removidas depois de confirmar que nenhuma função as usa. Nunca remova uma versão ainda em uso.

## Quando crescer

Gmail atende ao início com baixo volume. Para mais volume, controle de rejeições e entregabilidade, migre o SMTP para um provedor transacional. O [Brevo gratuito](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans) oferece 300 envios/dia. É uma alternativa, mas acrescenta cadastro/validação de conta; sem domínio próprio, o [remetente pode ser substituído por brevosend.com](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication). O Resend gratuito exige configurar domínio para envio normal, por isso não é o caminho mais curto neste caso.

O sistema tenta cada notificação no máximo três vezes. Se a quota do provedor acabar, algumas mensagens podem falhar: o resultado continua disponível pelo link da reunião. O fluxo atual não garante entrega de e-mail nem reenvio no dia seguinte após esgotar as tentativas.
