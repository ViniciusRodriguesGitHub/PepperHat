// Teste de integração real: usa apenas um evento e usuários temporários, com limpeza ao final.
// Requer uma sessão do Firebase CLI e --firebase-tools-root apontando para o pacote instalado.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const project = 'pepperhatapps';
const base = 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/';
const encode = value => Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : value !== null && typeof value === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } } : typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) };
async function main() {
  const toolsRoot = process.argv[process.argv.indexOf('--firebase-tools-root') + 1];
  if (!process.argv.includes('--firebase-tools-root')) throw Error('Informe --firebase-tools-root com o caminho do pacote oficial firebase-tools.');
  const api = require(path.join(toolsRoot, 'lib/api.js'));
  const config = JSON.parse(await fs.readFile(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  if (!config.tokens?.refresh_token) throw Error('Entre no Firebase CLI antes de executar este teste.');
  const refresh = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.tokens.refresh_token, client_id: api.clientId(), client_secret: api.clientSecret() }) });
  if (!refresh.ok) throw Error('Falha ao renovar sessão do Firebase CLI: HTTP ' + refresh.status);
  const admin = (await refresh.json()).access_token;
  const html = await fs.readFile(path.join(__dirname, '../index.html'), 'utf8');
  const key = /apiKey: '([^']+)'/.exec(html)[1];
  const authUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const id = 'consenso-smoke-' + crypto.randomUUID();
  const eventPath = 'artifacts/pepperhatapps/users/' + id + '/consenso_v1/' + id;
  const guests = [];
  let passed = 0;
  async function request(docPath, method, token, data) {
    return fetch(base + docPath, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify({ fields: encode(data).mapValue.fields }) } : {}) });
  }
  async function expect(docPath, method, token, data, status, description) {
    const response = await request(docPath, method, token, data);
    assert.equal(response.status, status, description + ' (HTTP ' + response.status + ')');
    passed++; console.log('OK: ' + description);
    return response;
  }
  async function guest(registered = false) {
    const response = await fetch(authUrl + 'signUp?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true, ...(registered ? { email: id + '@example.invalid', password: crypto.randomBytes(24).toString('base64url') } : {}) }) });
    if (!response.ok) throw Error('Não foi possível criar identidade de teste: HTTP ' + response.status);
    const user = await response.json(); guests.push(user); return user;
  }
  try {
    const first = await guest(); const second = await guest(); const registered = await guest(true);
    const config = { id, votingOpened: true, finalized: false, requiredInfoLabels: ['nº'], blockedSlots: ['2026-10-24|day'] };
    await expect(eventPath, 'PATCH', admin, { config }, 200, 'Criar evento temporário isolado');
    const votePath = eventPath + '/votes/' + first.localId;
    const vote = { userId: first.localId, userName: 'Participante de teste', timeSlots: ['2026-10-23|day'], preferredSlots: [], comment: '', commentVisibility: 'organizer', votedAt: new Date().toISOString(), requiredInfoAnswers: ['12'] };
    await expect(votePath, 'PATCH', first.idToken, vote, 200, 'Convidado grava voto com campo obrigatório');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, requiredInfoAnswers: ['13'] }, 200, 'Convidado edita o próprio voto');
    await expect(votePath, 'GET', first.idToken, null, 200, 'Convidado lê o próprio voto');
    await expect(eventPath.slice(0, eventPath.lastIndexOf('/')), 'GET', first.idToken, null, 403, 'Convidado não lista outras reuniões do organizador');
    await expect('artifacts/pepperhatapps/public/data/consenso_lookup', 'GET', first.idToken, null, 403, 'Convidado não enumera convites públicos');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, timeSlots: ['invalid'] }, 403, 'Formato de horário inválido é recusado');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, timeSlots: [...vote.timeSlots, ...vote.timeSlots] }, 403, 'Horários duplicados são recusados');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, preferredSlots: [...vote.timeSlots, ...vote.timeSlots] }, 403, 'Preferências duplicadas são recusadas');
    await expect(eventPath + '/participants/' + second.localId, 'PATCH', second.idToken, {userId: second.localId, votedAt: vote.votedAt}, 403, 'Recibo sem voto não pode falsificar o contador');
    for (const userName of ['', 'Ana']) await expect(votePath, 'PATCH', first.idToken, { ...vote, userName }, 403, 'Sem cadastro: nome vazio ou incompleto é recusado');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, userName: 'João d’Ávila' }, 200, 'Nome completo com acento e apóstrofo é aceito');
    const registeredPath = eventPath + '/votes/' + registered.localId;
    const registeredVote = { ...vote, userId: registered.localId };
    await expect(registeredPath, 'PATCH', registered.idToken, registeredVote, 200, 'Convidado com login grava voto com campo obrigatório');
    await expect(registeredPath, 'PATCH', registered.idToken, { ...registeredVote, requiredInfoAnswers: ['14'] }, 200, 'Convidado com login edita o próprio voto');
    for (const userName of ['', 'Ana']) await expect(registeredPath, 'PATCH', registered.idToken, { ...registeredVote, userName }, 403, 'Com login: nome vazio ou incompleto é recusado');
    await expect(registeredPath, 'PATCH', registered.idToken, { ...registeredVote, userName: '张 三' }, 200, 'Nome completo em outro alfabeto é aceito');
    await expect(votePath, 'GET', second.idToken, null, 403, 'Outro convidado não lê o voto privado');
    await expect(votePath, 'PATCH', second.idToken, vote, 403, 'Outro convidado não altera o voto');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, requiredInfoAnswers: [] }, 403, 'Campo obrigatório ausente é recusado');
    await expect(votePath, 'PATCH', first.idToken, { ...vote, timeSlots: ['2026-10-24|day'] }, 403, 'Horário bloqueado é recusado');
    const fourFields = { ...config, requiredInfoLabels: ['nº', 'Bloco', 'Rua', 'Contato'] };
    await expect(eventPath, 'PATCH', admin, { config: fourFields }, 200, 'Configurar quatro informações no evento temporário');
    await expect(registeredPath, 'PATCH', registered.idToken, { ...registeredVote, requiredInfoAnswers: ['14', 'B', 'Rua de teste', 'Contato de teste'] }, 200, 'Convidado com login envia quatro informações');
    await expect(registeredPath, 'PATCH', registered.idToken, { ...registeredVote, requiredInfoAnswers: ['14', 'B', '   ', 'Contato de teste'] }, 403, 'Resposta somente com espaços é recusada');
    await expect(eventPath, 'PATCH', admin, { config: { ...config, finalized: true } }, 200, 'Encerrar evento temporário');
    await expect(votePath, 'PATCH', first.idToken, vote, 403, 'Evento encerrado recusa alteração do voto');
    console.log(passed + ' verificações de integração aprovadas.');
  } finally {
    const failures = [];
    for (const user of guests) {
      const voteCleanup = await request(eventPath + '/votes/' + user.localId, 'DELETE', admin);
      if (!voteCleanup.ok && voteCleanup.status !== 404) failures.push('voto temporário: HTTP ' + voteCleanup.status);
      const response = await fetch(authUrl + 'delete?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: user.idToken }) });
      if (!response.ok) failures.push('identidade temporária: HTTP ' + response.status);
    }
    const eventCleanup = await request(eventPath, 'DELETE', admin);
    if (!eventCleanup.ok && eventCleanup.status !== 404) failures.push('evento temporário: HTTP ' + eventCleanup.status);
    if (failures.length) throw Error('Limpeza incompleta (' + id + '): ' + failures.join('; '));
    console.log('Evento e identidades temporárias removidos.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
