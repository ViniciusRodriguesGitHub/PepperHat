const {test,before,after,beforeEach}=require('node:test');
const fs=require('node:fs');const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,setDoc,updateDoc,getDoc,getDocs,deleteDoc}=require('firebase/firestore');
let env;
const root='artifacts/pepperhatapps/users/owner/consenso_v1/event';
const lookup='artifacts/pepperhatapps/public/data/consenso_lookup/event';
const config={id:'event',firebaseOwnerUid:'owner',title:'Teste',votingOpened:true,finalized:false,startDate:'2099-01-22',endDate:'2099-01-23',granularity:'hour',quorum:4,blockedSlots:['2099-01-22|10:00'],requiredInfoLabels:[]};
const vote={userId:'guest',userName:'Pessoa Teste',timeSlots:['2099-01-22|09:00'],preferredSlots:[],comment:'',commentVisibility:'organizer',votedAt:'2026-10-26T12:00:00Z'};
const db=(uid='guest')=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
const seed=async(entries)=>env.withSecurityRulesDisabled(async context=>{for(const [key,value]of Object.entries(entries))await setDoc(doc(context.firestore(),key),value);});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-consenso',firestore:{rules:fs.readFileSync(path.join(__dirname,'../../firestore.rules'),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await seed({[root]:{config},[lookup]:{ownerUid:'owner',updatedAt:'2026-10-26'}});});

test('convidado pode consultar convite mas nao listar reunioes do organizador',async()=>{
 await assertSucceeds(getDoc(doc(db(),root)));await assertFails(getDocs(collection(db(),'artifacts/pepperhatapps/users/owner/consenso_v1')));
 await assertSucceeds(getDocs(collection(db('owner'),'artifacts/pepperhatapps/users/owner/consenso_v1')));
});
test('lookup pode ser consultado pelo link mas nao enumerado nem transferido',async()=>{
 await assertSucceeds(getDoc(doc(db(null),lookup)));await assertFails(getDocs(collection(db(),'artifacts/pepperhatapps/public/data/consenso_lookup')));
 await assertFails(updateDoc(doc(db('owner'),lookup),{ownerUid:'guest'}));await assertFails(updateDoc(doc(db('owner'),lookup),{extra:true}));
 await assertSucceeds(updateDoc(doc(db('owner'),lookup),{updatedAt:'2026-10-27'}));
});
test('nenhuma identidade escreve em colecoes publicas arbitrarias ou outro app',async()=>{
 for(const uid of ['guest','owner'])for(const target of ['artifacts/pepperhatapps/public/data/random/doc','artifacts/another/public/data/pepperhat_v3/doc','artifacts/pepperhatapps/public/data/unknown/doc'])await assertFails(setDoc(doc(db(uid),target),{data:'invalid'}));
});
test('Kanban publico preserva leitura e colaboracao no formato existente',async()=>{
 const target='artifacts/pepperhatapps/public/data/pepperhat_v3/board';
 await assertSucceeds(setDoc(doc(db(),target),{board:{columns:{}},clients:[],logs:[],lastUpdated:'2026-10-26'}));
 await assertSucceeds(getDoc(doc(db(null),target)));await assertSucceeds(updateDoc(doc(db('other'),target),{clients:[]}));
 await assertFails(updateDoc(doc(db(),target),{arbitrary:'invalid'}));await assertFails(updateDoc(doc(db(),target),{clients:'invalid'}));
});
test('Kanban privado segue isolado por proprietario',async()=>{
 const target='artifacts/pepperhatapps/users/owner/pepperhat_v3/board';await assertSucceeds(setDoc(doc(db('owner'),target),{board:{}}));await assertFails(getDoc(doc(db(),target)));
});
test('convidado grava e edita apenas o proprio voto',async()=>{
 await assertSucceeds(setDoc(doc(db(),root+'/votes/guest'),vote));await assertSucceeds(updateDoc(doc(db(),root+'/votes/guest'),{timeSlots:[]}));
 await assertFails(getDoc(doc(db('other'),root+'/votes/guest')));await assertFails(getDoc(doc(db('owner'),root+'/votes/guest')));
 await assertFails(setDoc(doc(db('other'),root+'/votes/guest'),vote));
});
test('anonimo sem autenticacao nao pode votar',async()=>assertFails(setDoc(doc(db(null),root+'/votes/guest'),vote)));
test('votos malformados duplicados bloqueados e campos extras sao recusados',async()=>{
 for(const partial of [{timeSlots:['invalid']},{timeSlots:[123]},{timeSlots:['2099-01-22|09:00','2099-01-22|09:00']},{timeSlots:['2099-01-22|10:00']},{preferredSlots:['2099-01-22|09:00','2099-01-22|09:00']},{extra:true},{userName:'Pessoa'}])await assertFails(setDoc(doc(db(),root+'/votes/guest'),{...vote,...partial}));
});
test('fechamento e prazo no servidor impedem novos votos',async()=>{
 await seed({[root]:{config:{...config,votingClosed:true}}});await assertFails(setDoc(doc(db(),root+'/votes/guest'),vote));
 await seed({[root]:{config:{...config,votingDeadline:'2020-01-01T00:00:00Z'}}});await assertFails(setDoc(doc(db(),root+'/votes/guest'),vote));
});
test('organizador nao muda grade quorum dono ou prazo depois de aberta a votacao',async()=>{
 for(const partial of [{'config.quorum':1},{'config.firebaseOwnerUid':'other'},{'config.votingDeadline':'2099-01-01'},{'config.blockedSlots':[]},{'config.votingClosed':false},{'config.notificationQueueAttempts':0}])await assertFails(updateDoc(doc(db('owner'),root),partial));
});
test('confirmacao inicial da grade permanece permitida para o organizador',async()=>{
 await seed({[root]:{config:{...config,votingOpened:false}}});await assertSucceeds(updateDoc(doc(db('owner'),root),{'config.votingOpened':true,'config.blockedSlots':['2099-01-22|10:00'],'config.openedAt':'2026-10-26'}));
});
test('recibo exige voto existente e timestamp correspondente',async()=>{
 const ref=doc(db(),root+'/participants/guest');await assertFails(setDoc(ref,{userId:'guest',votedAt:vote.votedAt}));
 await assertSucceeds(setDoc(doc(db(),root+'/votes/guest'),vote));await assertSucceeds(setDoc(ref,{userId:'guest',votedAt:vote.votedAt}));await assertFails(updateDoc(ref,{votedAt:'forged'}));await assertFails(deleteDoc(ref));
});
test('comentario publico tem de corresponder ao voto com compartilhamento autorizado',async()=>{
 const ref=doc(db(),root+'/public_comments/guest');const comment={userId:'guest',userName:vote.userName,comment:'Mensagem',votedAt:vote.votedAt};
 await assertFails(setDoc(ref,comment));await assertSucceeds(setDoc(doc(db(),root+'/votes/guest'),{...vote,comment:'Mensagem',commentVisibility:'everyone'}));
 await assertSucceeds(setDoc(ref,comment));await assertFails(updateDoc(ref,{comment:'Outra mensagem'}));
});
test('jobs e resumos agregados nao podem ser escritos pelo cliente',async()=>{
 for(const uid of ['guest','owner'])for(const target of ['/notification_jobs/guest','/organizer_results/summary','/participant_details/guest'])await assertFails(setDoc(doc(db(uid),root+target),{data:'forged'}));
});
test('resumo agregado so e lido pelo dono depois de encerrar a votacao',async()=>{
 await seed({[root+'/organizer_results/summary']:{slots:[]}});await assertFails(getDoc(doc(db('owner'),root+'/organizer_results/summary')));
 await seed({[root]:{config:{...config,tallyOpenedAt:'2026-10-26',votingClosed:true}}});await assertSucceeds(getDoc(doc(db('owner'),root+'/organizer_results/summary')));await assertFails(getDoc(doc(db(),root+'/organizer_results/summary')));
});
