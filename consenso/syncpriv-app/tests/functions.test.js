const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');const fs = require('node:fs');const core=require('../core.js');
function harness(mail = false, sendFails = false) {
 const docs=new Map();const sent=[];
 const snapshot=path=>({id:path.split('/').pop(),exists:docs.has(path),ref:ref(path),data:()=>docs.get(path)});
 function ref(path) { return {path,id:path.split('/').pop(),get parent(){return {parent:ref(path.split('/').slice(0,-2).join('/'))}},collection:name=>collection(path+'/'+name),get:async()=>snapshot(path),set:async data=>docs.set(path,data),create:async data=>{if(docs.has(path)){const e=Error('exists');e.code=6;throw e}docs.set(path,data)},delete:async()=>docs.delete(path),update:async partial=>update(path,partial)}; }
 function update(path,partial){const next=structuredClone(docs.get(path));for(const [key,value]of Object.entries(partial)){const parts=key.split('.');let target=next;for(const part of parts.slice(0,-1))target=target[part]||=( {} );target[parts.at(-1)]=value;}docs.set(path,next);}
 const collection=path=>({path,doc:id=>ref(path+'/'+id),get:async()=>({docs:[...docs.keys()].filter(key=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).map(snapshot)})});
 const db={doc:ref,runTransaction:async fn=>{const ops=[];const result=await fn({get:async target=>target.get(),set:(target,data)=>ops.push(()=>docs.set(target.path,data)),update:(target,data)=>ops.push(()=>update(target.path,data)),delete:target=>ops.push(()=>docs.delete(target.path))});ops.forEach(fn=>fn());return result},batch:()=>{const ops=[];return {set:(target,data)=>ops.push(()=>docs.set(target.path,data)),commit:async()=>ops.forEach(fn=>fn())}},recursiveDelete:async target=>[...docs.keys()].filter(key=>key===target.path||key.startsWith(target.path+'/')).forEach(key=>docs.delete(key))};
 class HttpsError extends Error {constructor(code,message){super(message);this.code=code}}
 const context={exports:{},process:{env:mail?{CONSENSO_SMTP_HOST:'mock',CONSENSO_EMAIL_FROM:'consenso@example.com'}:{}},console,Intl,Date,Promise,Set,Error,require:name=>({
 'firebase-admin/app':{initializeApp(){}},'firebase-admin/firestore':{getFirestore:()=>db},'firebase-admin/auth':{getAuth:()=>({getUser:async()=>({email:'organizer@example.com',emailVerified:true})})},'firebase-functions/v2/https':{onCall:(opts,fn)=>fn,HttpsError},'firebase-functions/v2/firestore':{onDocumentWritten:(opts,fn)=>fn,onDocumentUpdated:(opts,fn)=>fn,onDocumentCreated:(opts,fn)=>fn},'firebase-functions/v2/scheduler':{onSchedule:(opts,fn)=>fn},'firebase-functions/params':{defineSecret:()=>({value:()=> 'mock-password'})},'firebase-functions/logger':{error(){}},'./consenso-core.cjs':core,nodemailer:{createTransport:()=>({sendMail:async message=>{if(sendFails)throw Error("SMTP temporariamente indisponível");sent.push(message);return {messageId:message.messageId}}})}
 }[name])};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../functions/index.cjs'),'utf8'),context);
 const path='artifacts/pepperhatapps/users/owner/consenso_v1/event';docs.set(path,{config:{id:'event',quorum:4,votingOpened:true,finalized:false,timeZone:'America/Sao_Paulo'}});
 const vote=(id,slots=['2099-01-22|09:00'])=>docs.set(path+'/votes/'+id,{userId:id,userName:'Pessoa Teste',timeSlots:slots,votedAt:'2026-10-21'});
 const request=data=>({auth:{uid:'owner'},data:{ownerUid:'owner',eventId:'event',...data}});
 return {api:context.exports,docs,sent,path,vote,request,ref,snapshot};
}
test('abrir a apuração exige organizador e confirmação se não passou da metade',async()=>{
 const h=harness();h.vote('a');h.vote('b');assert.throws(()=>h.api.consensoOpenTally({auth:{uid:'other'},data:{ownerUid:'owner',eventId:'event'}}),/organizador/);await assert.rejects(h.api.consensoOpenTally(h.request()),/antecipação/);
 await h.api.consensoOpenTally(h.request({earlyConfirmed:true}));assert.equal(h.docs.get(h.path).config.votingClosed,true);assert.equal(h.docs.get(h.path).config.tallyEarly,true);assert.equal(h.docs.get(h.path+'/organizer_results/summary').slots.length,1);
 const first=h.docs.get(h.path).config.tallyOpenedAt;await h.api.consensoOpenTally(h.request());assert.equal(h.docs.get(h.path).config.tallyOpenedAt,first);
});
test('maioria permite abrir apuração sem antecipação e mostra toda opção escolhida',async()=>{
 const h=harness();h.vote('a');h.vote('b');h.vote('c',['2099-01-23|12:00']);await h.api.consensoOpenTally(h.request());assert.equal(h.docs.get(h.path+'/organizer_results/summary').slots.length,2);assert.equal(h.docs.get(h.path).config.tallyEarly,false);
});
test('finalização exige apuração aberta e não pode ser sobrescrita',async()=>{
 const h=harness();h.vote('a');await assert.rejects(h.api.consensoFinalize(h.request({selectedSlotKey:'2099-01-22|09:00'})),/Abra a apuração/);await h.api.consensoOpenTally(h.request({earlyConfirmed:true}));await h.api.consensoFinalize(h.request({selectedSlotKey:'2099-01-22|09:00'}));assert.equal(h.docs.get(h.path).config.finalized,true);const result=h.docs.get(h.path).config.finalResult;await h.api.consensoFinalize(h.request({selectedSlotKey:'inventado'}));assert.equal(h.docs.get(h.path).config.finalResult,result);
});
test('cadastros do painel são separados e nunca carregam horários individuais',async()=>{
 const h=harness();h.vote('a');await h.api.consensoPrepareOrganizerPanel(h.request());const details=h.docs.get(h.path+'/participant_details/a');assert.equal(details.userName,'Pessoa Teste');assert.equal(details.timeSlots,undefined);assert.equal(h.docs.has(h.path+'/organizer_results/summary'),false);
});
test('prazo vencido escolhe automaticamente mesmo que o organizador tente outra opção',async()=>{
 const h=harness();h.vote('a');h.vote('b');h.vote('c',['2099-01-23|12:00']);h.docs.get(h.path).config.votingDeadline='2020-01-01T00:00:00Z';await h.api.consensoFinalize(h.request({selectedSlotKey:'2099-01-23|12:00'}));const result=h.docs.get(h.path).config.finalResult;assert.equal(result.slots[0].key,'2099-01-22|09:00');assert.equal(h.docs.get(h.path).config.finalizationMode,'deadline');
});
test('notificações não duplicam destinatários e envio confirmado não é repetido',async()=>{
 const h=harness(true);h.vote('a');h.vote('b');h.docs.get(h.path+'/votes/a').notificationEmail='pessoa@example.com';h.docs.get(h.path+'/votes/b').notificationEmail='PESSOA@example.com';const before={config:{finalized:false}};const after={config:{finalized:true,emailMode:'required',title:'Teste',finalResult:{slots:[{date:'2099-01-22',time:'09:00',votes:2}],totalVotes:2}}};h.docs.set(h.path,after);
 const event={data:{before:{data:()=>before},after:h.snapshot(h.path)},params:{ownerUid:'owner',eventId:'event'}};await h.api.consensoQueueResultEmails(event);await h.api.consensoQueueResultEmails(event);const jobs=[...h.docs.keys()].filter(path=>path.includes('/notification_jobs/'));assert.equal(jobs.length,1);const send={data:h.snapshot(jobs[0]),params:{ownerUid:'owner',eventId:'event',voteUid:'a'}};await h.api.consensoDeliverResultEmail(send);await h.api.consensoDeliverResultEmail(send);assert.equal(h.sent.length,1);assert.equal(h.sent[0].replyTo,'organizer@example.com');assert.equal(h.sent[0].subject,'Resultado do Consenso — Teste');assert.ok(h.sent[0].text.includes('\n'));assert.equal(h.docs.get(jobs[0]).status,'sent');
});

test('falha de e-mail para em três tentativas e não fica repetindo indefinidamente',async()=>{
 const h=harness(true,true);const job=h.path+'/notification_jobs/a';h.docs.set(h.path,{config:{finalized:true,title:'Teste',finalResult:{slots:[],totalVotes:1}}});h.docs.set(job,{email:'pessoa@example.com',userName:'Pessoa Teste',status:'pending',attempts:0});const event={data:h.snapshot(job),params:{ownerUid:'owner',eventId:'event',voteUid:'a'}};
 for(let i=0;i<5;i++){h.docs.get(job).nextAttemptAt='2000-01-01T00:00:00Z';await h.api.consensoDeliverResultEmail(event);}assert.equal(h.docs.get(job).attempts,3);assert.equal(h.docs.get(job).status,'failed');assert.equal(h.sent.length,0);
});
