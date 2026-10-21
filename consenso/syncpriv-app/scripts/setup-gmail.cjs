// Invocado pelo assistente PowerShell. A senha entra por stdin e nunca vai para arquivo/argumentos.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const app = path.resolve(__dirname, '..');
function gmailConfig(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '').replace(/\s/g, '');
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(gmail|googlemail)\.com$/.test(email)) throw Error('Informe um endereco pessoal Gmail valido.');
  if (!/^[a-zA-Z]{16}$/.test(password)) throw Error('Use a senha de app de 16 letras gerada pelo Google, nao a senha normal.');
  return { email, password };
}
function mergeEnv(previous, email) {
  const keys = { CONSENSO_SMTP_HOST: 'smtp.gmail.com', CONSENSO_SMTP_PORT: '465', CONSENSO_SMTP_USER: email, CONSENSO_EMAIL_FROM: email };
  const kept = previous.split(/\r?\n/).filter(line => !/^\s*CONSENSO_(SMTP_(HOST|PORT|USER|PASSWORD)|EMAIL_FROM)\s*=/.test(line));
  return kept.join('\n').trimEnd() + '\n' + Object.entries(keys).map(([key,value]) => key + '=' + value).join('\n') + '\n';
}
function findFirebaseCli() {
  const roots = [path.join(app, 'node_modules/firebase-tools'), path.join(os.homedir(), 'AppData/Roaming/npm/node_modules/firebase-tools')];
  const cache = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'npm-cache/_npx');
  if (fs.existsSync(cache)) for (const entry of fs.readdirSync(cache)) roots.push(path.join(cache, entry, 'node_modules/firebase-tools'));
  for (const root of roots) { const cli = path.join(root, 'lib/bin/firebase.js'); if (fs.existsSync(cli)) return cli; }
  throw Error('Firebase CLI nao encontrado. Execute npx --yes firebase-tools --version e tente novamente.');
}
function firebase(cli, args, input) {
  // Captura a saida: logs de debug do CLI podem conter dados sensiveis do projeto.
  const result = spawnSync(process.execPath, [cli, ...args, '--project', 'pepperhatapps', '--non-interactive'], { cwd: app, input, encoding:'utf8', maxBuffer:32*1024*1024, windowsHide:true });
  if (result.status !== 0) throw Error('Firebase nao concluiu ' + args[0] + '. Confira login/permissoes com npx firebase-tools login. Nenhuma senha foi impressa.');
}
async function savePassword(cli, password) {
  // REST direto evita que o modo debug do CLI grave o payload do segredo em disco.
  const api = require(path.join(path.dirname(cli), '../api.js'));
  const credentials = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const refreshed = await fetch('https://oauth2.googleapis.com/token', {method:'POST',body:new URLSearchParams({grant_type:'refresh_token',refresh_token:credentials.tokens.refresh_token,client_id:api.clientId(),client_secret:api.clientSecret()})});
  if (!refreshed.ok) throw Error('Entre no Firebase: npx firebase-tools login');
  const token = (await refreshed.json()).access_token;
  const request = (url, method='GET', body) => fetch(url, {method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(30000)});
  const enabled = await request('https://serviceusage.googleapis.com/v1/projects/pepperhatapps/services/secretmanager.googleapis.com:enable','POST',{});
  if (!enabled.ok) throw Error('Nao foi possivel habilitar o Secret Manager. Confira suas permissoes no Firebase.');
  let operation = await enabled.json();
  for(let attempt=0; !operation.done && attempt<30; attempt++) {
    await new Promise(resolve=>setTimeout(resolve,1000));
    const response = await request('https://serviceusage.googleapis.com/v1/'+operation.name);
    if (!response.ok) throw Error('Nao foi possivel conferir a ativacao do Secret Manager.');
    operation = await response.json();
  }
  if (!operation.done || operation.error) throw Error('Secret Manager ainda indisponivel; tente novamente em alguns minutos.');
  const base='https://secretmanager.googleapis.com/v1/projects/pepperhatapps/secrets';
  const secret=base+'/CONSENSO_SMTP_PASSWORD';
  const existing=await request(secret);
  if(existing.status===404) {
    const created=await request(base+'?secretId=CONSENSO_SMTP_PASSWORD','POST',{replication:{automatic:{}}});
    if(!created.ok && created.status!==409) throw Error('Nao foi possivel criar o segredo SMTP.');
  } else if(!existing.ok) throw Error('Sem permissao para configurar o segredo SMTP.');
  const saved=await request(secret+':addVersion','POST',{payload:{data:Buffer.from(password).toString('base64')}});
  if(!saved.ok) throw Error('Nao foi possivel salvar a senha no Secret Manager.');
}
async function setup(input) {
  const config = gmailConfig(input);
  const cli = findFirebaseCli();
  let nodemailer;
  try { nodemailer = require('../functions/node_modules/nodemailer'); }
  catch { throw Error('Instale as dependencias: entre na pasta functions e execute npm ci.'); }
  const transporter = nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:config.email,pass:config.password},connectionTimeout:20000,socketTimeout:30000});
  try {
    console.log('Testando autenticacao Gmail...');
    await transporter.verify();
    await transporter.sendMail({from:{name:'Consenso',address:config.email},to:config.email,subject:'Consenso — teste do remetente',text:'A conexao SMTP do Consenso funcionou. Este teste foi enviado somente para sua propria conta. Aguarde a conclusao da publicacao antes de usar as notificacoes nas reunioes.'});
  } catch { throw Error('Gmail recusou a conexao ou o teste. Confira a internet, o endereco, a verificacao em duas etapas e a senha de app. Nada foi ativado no Firebase.'); }
  finally { transporter.close(); }
  console.log('Teste aceito pelo Gmail. Salvando senha no Secret Manager...');
  await savePassword(cli, config.password);
  const envPath = path.join(app, 'functions/.env.pepperhatapps');
  const previous = fs.existsSync(envPath) ? fs.readFileSync(envPath,'utf8') : '';
  fs.writeFileSync(envPath, mergeEnv(previous,config.email), {mode:0o600});
  console.log('Publicando funcoes e retentativas limitadas. Aguarde alguns minutos...');
  firebase(cli, ['deploy','--only','functions:consenso','--config','firebase.consenso.json']);
  console.log('Configuracao publicada. Confira a mensagem de teste (inclusive spam). Reabra o Consenso e crie uma reuniao de teste com e-mail obrigatorio; vote e defina o resultado para conferir a notificacao completa.');
}
if (require.main === module) {
  (async () => {
    let raw = ''; for await (const chunk of process.stdin) raw += chunk;
    const input = JSON.parse(raw.replace(/^\uFEFF/, '')); raw = '';
    try { await setup(input); } finally { input.password = ''; }
  })().catch(error => { console.error(error instanceof SyntaxError ? 'Entrada invalida. Execute scripts/configurar-email.ps1.' : error.message); process.exitCode=1; });
}
module.exports = { gmailConfig, mergeEnv };
