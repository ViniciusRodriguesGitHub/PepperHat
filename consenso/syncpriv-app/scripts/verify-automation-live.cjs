'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const project = 'pepperhatapps';
const base = 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/';
const encode = value => value === null ? { nullValue: null } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : typeof value === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key,item]) => [key,encode(item)])) } } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { stringValue: String(value) };
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function main() {
 const arg = process.argv.indexOf('--firebase-tools-root'); if (arg < 0) throw Error('Informe --firebase-tools-root.');
 const api = require(path.join(process.argv[arg+1],'lib/api.js'));
 const credentials = JSON.parse(await fs.readFile(path.join(os.homedir(),'.config/configstore/firebase-tools.json'),'utf8'));
 const refresh = await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',refresh_token:credentials.tokens.refresh_token,client_id:api.clientId(),client_secret:api.clientSecret()})});
 if (!refresh.ok) throw Error('Não foi possível autenticar o teste.'); const admin = (await refresh.json()).access_token;
 const html = await fs.readFile(path.join(__dirname,'../index.html'),'utf8');const key = /apiKey: '([^']+)'/.exec(html)[1];
 const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts:';
 const id = 'consenso-auto-' + crypto.randomUUID();const users = [],events = [];let checks=0;
 async function request(doc,method,token,data) { return fetch(base+doc,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify({fields:encode(data).mapValue.fields})}:{})}); }
 async function expect(doc,method,token,data,status,label) { const response=await request(doc,method,token,data);assert.equal(response.status,status,label+' (HTTP '+response.status+')');checks++;console.log('OK: '+label);return response; }
 async function account(registered) { const response=await fetch(authBase+'signUp?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true,...(registered?{email:id+'-'+users.length+'@example.invalid',password:crypto.randomBytes(24).toString('base64url')}:{})})});if(!response.ok)throw Error('Falha na identidade temporária HTTP '+response.status);const user=await response.json();users.push(user);return user; }
 async function call(name,user,data,expected=200){const response=await fetch('https://southamerica-east1-'+project+'.cloudfunctions.net/'+name,{method:'POST',headers:{Authorization:'Bearer '+user.idToken,'Content-Type':'application/json'},body:JSON.stringify({data})});assert.equal(response.status,expected,name+' (HTTP '+response.status+')');return response.json();}
 try {
  const owner=await account(true),guest=await account(false),registered=await account(true);
  const ownerRoot='artifacts/pepperhatapps/users/'+owner.localId+'/consenso_v1/';
  const create=async(name,extra={})=>{const eventId=id+'-'+name;const ref=ownerRoot+eventId;events.push(ref);const config={id:eventId,title:'Teste temporário do Consenso',firebaseOwnerUid:owner.localId,quorum:4,granularity:'hour',votingOpened:true,finalized:false,votingClosed:false,requiredInfoLabels:[],emailMode:'none',timeZone:'America/Sao_Paulo',startDate:'2099-01-22T03:00:00Z',endDate:'2099-01-23T03:00:00Z',createdAt:new Date().toISOString(),...extra};await expect(ref,'PATCH',admin,{config},200,'Criar evento isolado '+name);return {ref,eventId,config};};
  const vote=(user,slots=['2099-01-22|09:00'],extra={})=>({userId:user.localId,userName:'Pessoa de Teste',timeSlots:slots,preferredSlots:[],comment:'',commentVisibility:'organizer',votedAt:new Date().toISOString(),...extra});
  const status=await call('consensoAutomationStatus',owner,{});assert.equal(status.result.deadlineReady,true);checks++;console.log('OK: Servidor anuncia prazo automático disponível');
  const manual=await create('manual');
  await expect(manual.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest),200,'Convidado sem cadastro vota');
  await expect(manual.ref+'/votes/'+registered.localId,'PATCH',registered.idToken,vote(registered,['2099-01-23|12:00']),200,'Convidado com login vota');
  await expect(manual.ref+'/votes/'+guest.localId,'GET',owner.idToken,null,403,'Organizador não lê grade individual de outro participante');
  await expect(manual.ref+'/organizer_results/summary','GET',owner.idToken,null,403,'Apuração oculta antes do encerramento');
  const data={ownerUid:owner.localId,eventId:manual.eventId};
  await call('consensoOpenTally',owner,data,400);checks++;console.log('OK: Metade exata exige confirmação de antecipação');
  await call('consensoOpenTally',guest,data,403);checks++;console.log('OK: Convidado não pode abrir apuração');
  await expect(manual.ref+'/votes/'+owner.localId,'PATCH',owner.idToken,vote(owner),200,'Organizador também registra o próprio voto');
  await call('consensoPrepareOrganizerPanel',owner,data);const details=await expect(manual.ref+'/participant_details/'+guest.localId,'GET',owner.idToken,null,200,'Painel recebe identificação privada');const detailsData=await details.json();assert.equal(detailsData.fields.timeSlots,undefined);checks++;console.log('OK: Identificação não contém horários');
  await call('consensoOpenTally',owner,data);checks++;console.log('OK: Maioria estrita abre apuração e encerra votos');
  await expect(manual.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest),403,'Votos não podem mudar após abertura da apuração');
  const summary=await expect(manual.ref+'/organizer_results/summary','GET',owner.idToken,null,200,'Organizador recebe opções agregadas após encerramento');assert.equal((await summary.json()).fields.slots.arrayValue.values.length,2);checks++;console.log('OK: Toda opção com ao menos um voto aparece');
  await expect(manual.ref+'/organizer_results/summary','GET',guest.idToken,null,403,'Convidado não acessa opções parciais');
  await expect(manual.ref,'PATCH',owner.idToken,{config:{...manual.config,votingClosed:false}},403,'Organizador não pode reabrir votos por gravação direta');
  await call('consensoFinalize',owner,{...data,selectedSlotKey:'2099-01-23|12:00'});checks++;console.log('OK: Organizador pode escolher uma opção da apuração');
  const finalized=await expect(manual.ref,'GET',guest.idToken,null,200,'Convidado acompanha resultado pelo link');assert.equal((await finalized.json()).fields.config.mapValue.fields.finalized.booleanValue,true);
  const early=await create('early');await expect(early.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest),200,'Registrar voto para antecipação');await call('consensoOpenTally',owner,{ownerUid:owner.localId,eventId:early.eventId,earlyConfirmed:true});checks++;console.log('OK: Antecipação confirmada encerra votos antes da maioria');
  const email=await create('email',{emailMode:'required'});await expect(email.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest),403,'E-mail obrigatório é validado no servidor');await expect(email.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest,undefined,{notificationEmail:'pessoa@example.invalid'}),200,'E-mail próprio é salvo privadamente');await expect(email.ref+'/votes/'+guest.localId,'GET',registered.idToken,null,403,'Outros participantes não leem o e-mail');
  const deadline=await create('deadline',{quorum:2,votingDeadline:new Date(Date.now()+25000).toISOString()});await expect(deadline.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest,['2099-01-22|09:00','2099-01-23|12:00']),200,'Registrar disponibilidade antes do prazo');await expect(deadline.ref+'/votes/'+registered.localId,'PATCH',registered.idToken,vote(registered,['2099-01-22|09:00','2099-01-23|12:00']),200,'Registrar empate antes do prazo');
  console.log('Aguardando a execução agendada, sem página aberta...');let closed=null;
  for(let attempt=0;attempt<12;attempt++){await sleep(15000);const response=await request(deadline.ref,'GET',admin);const doc=await response.json();if(doc.fields.config.mapValue.fields.finalized.booleanValue){closed=doc.fields.config.mapValue.fields;break}console.log('Prazo aguardando processamento agendado...');}
  assert.ok(closed,'Agendador deve concluir sem navegador');assert.equal(closed.finalizationMode.stringValue,'deadline');assert.equal(closed.finalResult.mapValue.fields.slots.arrayValue.values[0].mapValue.fields.key.stringValue,'2099-01-22|09:00');checks++;console.log('OK: Agendador finaliza sozinho e desempata pelo futuro mais próximo');await expect(deadline.ref+'/votes/'+guest.localId,'PATCH',guest.idToken,vote(guest),403,'Prazo finalizado recusa novos votos');
  console.log(checks+' verificações reais de automação aprovadas.');
 } finally {
  const failures=[];
  for(const ref of events){await request(ref,'DELETE',admin);for(const sub of ['votes','participants','participant_details','organizer_results','notification_jobs']){const response=await request(ref+'/'+sub,'GET',admin);if(!response.ok){failures.push('listar '+sub);continue}for(const doc of (await response.json()).documents||[]){const docPath=doc.name.split('/documents/')[1];const removed=await request(docPath,'DELETE',admin);if(!removed.ok&&removed.status!==404)failures.push('remover '+sub);}}}
  for(const user of users){const response=await fetch(authBase+'delete?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:user.idToken})});if(!response.ok)failures.push('identidade temporária');}
  if(failures.length)throw Error('Limpeza incompleta: '+failures.join(', '));console.log('Eventos e identidades temporárias removidos.');
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
