const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function declaration(name, after = 0) {
 const start = html.indexOf('    const ' + name + ' =', after);
 assert.ok(start >= 0, name);
 const indent = html.slice(html.lastIndexOf('\n', start) + 1, html.indexOf('const ' + name + ' =', start));
 const closing = '\n' + indent + '};';
 const end = html.indexOf(closing, start) + closing.length;
 return html.slice(start, end) + '\n globalThis.' + name + ' = ' + name + ';';
}
function route({voted = true, hash = '#event/e?voter', opened = true} = {}) {
 const state = {};
 const context = { URLSearchParams, window: {location: {hash}}, tryHydrateEventFromInviteHash() {}, canManageEventId: () => true, getConsensoVoterUser: () => ({id:'u'}), hasUserVoted: () => voted, getEvent: () => ({config:{votingOpened:opened}}), setEventId: id => state.id=id, setIsManager: v => state.manager=v, setCurrentView: v => state.view=v };
 vm.runInNewContext(declaration('applyRouteFromHash') + '\napplyRouteFromHash();',context);
 return {state,context};
}
test('editar voto do organizador permanece na votação com identidade de organizador', () => {
 const {state,context} = route(); assert.equal(state.view,'vote'); assert.equal(state.manager,true); assert.equal(context.window.location.hash,'#event/e?voter');
});
test('convite normal do organizador que já votou abre gestão', () => assert.equal(route({hash:'#event/e'}).state.view,'manage'));
test('organizador sem voto entra para votar', () => { const {state}=route({voted:false,hash:'#event/e'}); assert.equal(state.view,'vote'); assert.equal(state.manager,true); });
test('reabrir preparação conserva permissão para configurar grade', () => assert.equal(route({hash:'#event/e',opened:false}).state.manager,true));
test('confirmar grade segue diretamente ao próprio voto', () => {
 const state={}; const context={setCurrentEvent:v=>state.event=v,setIsManager:v=>state.manager=v,setCurrentView:v=>state.view=v,setVoteHashFromInviteLink:(id,voter)=>state.link={id,voter}};
 vm.runInNewContext(declaration('handlePreparationComplete') + '\nhandlePreparationComplete({config:{id:"e",votingOpened:true}});',context);
 assert.equal(state.view,'vote');assert.equal(state.link.voter,true);
});
function storageContext(){
 const data={events:JSON.stringify({e:{config:{startDate:'2026-10-20',endDate:'2026-10-21',createdAt:'2026-10-20',votingOpened:true},votes:[]}})};
 const context={STORAGE_KEY:'events',localStorage:{getItem:k=>data[k],setItem:(k,v)=>data[k]=v},consensoFirestoreReady:()=>false, Date};
 vm.createContext(context); for(const name of ['normalizeFullName','isValidFullName','getRequiredInfoLabels','getRequiredInfoAnswers','getEvent','submitVote','activateEventVoting'])vm.runInContext(declaration(name),context);
 return context;
}
test('muitas pessoas anônimas mantêm votos distintos e edição substitui apenas o próprio', async () => {
 const c=storageContext(); for(let i=0;i<500;i++)await c.submitVote('e',{userName:'Ana Silva',userId:'u'+i,timeSlots:['2026-10-20|day']});
 await c.submitVote('e',{userName:'Ana Silva',userId:'u12',timeSlots:[]});const votes=c.getEvent('e').votes;
 assert.equal(votes.length,500);assert.equal(votes.find(v=>v.userId==='u12').timeSlots.length,0);assert.equal(votes.find(v=>v.userId==='u13').timeSlots.length,1);
});
test('falha na nuvem não confirma abertura da votação localmente', async()=>{
 const c=storageContext(); c.consensoFirestoreReady=()=>true;c.consensoCloudMergeConfig=async()=>{throw Error('offline')};
 const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.firebaseOwnerUid='owner';events.e.config.votingOpened=false;c.localStorage.setItem('events',JSON.stringify(events));
 await assert.rejects(c.activateEventVoting('e',[]),/offline/);assert.equal(c.getEvent('e').config.votingOpened,false);
});

test('edição direta carrega o voto salvo antes de permitir alterações', () => {
 const state={};const event={config:{blockedSlots:['blocked']}};
 const c={getEvent:()=>event,setEventData:()=>{},getConsensoVoterUser:()=>({id:'u'}),setBlockedSlots:()=>{},hasUserVoted:()=>true,setHasVoted:()=>{},editingChoicesRef:{current:true},selectionInitializedRef:{current:false},getUserVote:()=>({timeSlots:['allowed','blocked'],comment:'nota',commentVisibility:'organizer'}),setLocalUserName:()=>{},setSelectedSlots:v=>state.slots=Array.from(v),getRequiredInfoAnswers:v=>v.requiredInfoAnswers || (v.requiredInfo ? [v.requiredInfo] : []),setRequiredInfo:v=>state.requiredInfo=v,setComment:v=>state.comment=v,setCommentVisibility:()=>{},eventId:'e'};
 vm.runInNewContext(declaration('applyLocalState')+'\napplyLocalState();',c);
 assert.deepEqual(state.slots,['allowed']);assert.equal(state.comment,'nota');assert.equal(c.selectionInitializedRef.current,true);
});
test('identidade local cadastrada é reutilizada ao editar voto',()=>{
 const c={getCurrentUser:()=>({id:'anon'}),getEvent:()=>({config:{}}),window:{},getRegisteredUser:()=>({id:'registered'})};
 vm.runInNewContext(declaration('getConsensoVoterUser')+'\nglobalThis.result=getConsensoVoterUser("e");',c);
 assert.equal(c.result.id,'registered');
});

test('não salva voto após encerramento nem em horários bloqueados',async()=>{
 const c=storageContext();const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.finalized=true;c.localStorage.setItem('events',JSON.stringify(events));
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[]}),/aberta/);
 events.e.config.finalized=false;events.e.config.blockedSlots=['blocked'];c.localStorage.setItem('events',JSON.stringify(events));
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:['blocked']}),/bloqueados/);
 assert.equal(c.getEvent('e').votes.length,0);
});
test('evento em nuvem não confirma voto apenas local quando sincronização indisponível',async()=>{
 const c=storageContext();const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.firebaseOwnerUid='owner';c.localStorage.setItem('events',JSON.stringify(events));
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[]}),/sincronização/);assert.equal(c.getEvent('e').votes.length,0);
});

test('campo adicional obrigatório rejeita ausência e espaços e aceita resposta',async()=>{
 const c=storageContext();const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.requiredInfoLabel='Nº apartamento';c.localStorage.setItem('events',JSON.stringify(events));
 for(const requiredInfo of [undefined,'','   '])await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfo}),/Nº apartamento/);
 assert.equal(c.getEvent('e').votes.length,0);
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfo:'Bloco B, 203'});
 assert.equal(c.getEvent('e').votes[0].requiredInfo,'Bloco B, 203');
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfo:'204'});
 assert.equal(c.getEvent('e').votes.length,1);assert.equal(c.getEvent('e').votes[0].requiredInfo,'204');
});
test('campo adicional limita resposta sem impor formato de CPF ou apartamento',async()=>{
 const c=storageContext();
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfo:'x'.repeat(301)}),/300/);
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfo:'Rua A, nº 100 — apto 02'});
 assert.equal(c.getEvent('e').votes[0].requiredInfo,'Rua A, nº 100 — apto 02');
});
test('resposta adicional vai ao voto privado e não a recibos ou comentários públicos',async()=>{
 const writes=[];const c={CONSENSO_FB_APP_ID:'app',consensoFirestoreReady:()=>true,consensoPublicCommentsColRef:()=> 'public_comments',window:{consensoDb:{},consensoFsDoc:(...parts)=>parts,consensoFsSetDoc:async(ref,data)=>writes.push({ref,data})},console};
 vm.runInNewContext(declaration('consensoCloudPushVote'),c);
 await c.consensoCloudPushVote('owner','e',{userId:'u',timeSlots:[],requiredInfo:'CPF privado',requiredInfoAnswers:['CPF privado','Rua A','02','999'],comment:'Olá',commentVisibility:'everyone',votedAt:'2026-10-20'});
 assert.equal(writes.length,3);assert.equal(writes[0].data.requiredInfo,'CPF privado');
 assert.equal(writes[0].data.requiredInfoAnswers.length,4);
 assert.equal(writes[1].data.requiredInfo,undefined);assert.equal(writes[2].data.requiredInfo,undefined);
 assert.equal(writes[1].data.requiredInfoAnswers,undefined);assert.equal(writes[2].data.requiredInfoAnswers,undefined);
});

test('cancelar edição restaura resposta adicional salva',()=>{
 const state={};const c={eventId:'e',getConsensoVoterUser:()=>({id:'u'}),getUserVote:()=>({timeSlots:[],requiredInfo:'203'}),setSelectedSlots:()=>{},setLocalUserName:()=>{},setNameError:()=>{},getRequiredInfoAnswers:v=>v.requiredInfoAnswers || (v.requiredInfo ? [v.requiredInfo] : []),setRequiredInfo:v=>state.value=v,setRequiredInfoError:v=>state.error=v,setComment:()=>{},setCommentVisibility:()=>{},setEditingChoices:v=>state.editing=v};
 vm.runInNewContext(declaration('handleCancelEditChoices')+'\nhandleCancelEditChoices();',c);assert.deepEqual(Array.from(state.value),['203']);assert.equal(state.error,false);assert.equal(state.editing,false);
});

test('quatro informações são obrigatórias e editáveis por participante',async()=>{
 const c=storageContext();const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.requiredInfoLabels=['CPF','Endereço','Apartamento','Telefone'];c.localStorage.setItem('events',JSON.stringify(events));
 for(const requiredInfoAnswers of [[],['123'],['123','Rua A',' ','999']])await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers}),/Informe/);
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers:['123','Rua A','02','999']});
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers:['123','Rua B','03','888']});
 assert.equal(c.getEvent('e').votes.length,1);assert.deepEqual(Array.from(c.getEvent('e').votes[0].requiredInfoAnswers),['123','Rua B','03','888']);
});
test('limite de quatro respostas e 300 caracteres por campo',async()=>{
 const c=storageContext();await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers:['a','b','c','d','e']}),/4/);
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers:['x'.repeat(301)]}),/300/);
 await assert.rejects(c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[],requiredInfoAnswers:'texto'}),/inválidas/);
});
test('evento novo somente com nome dispensa respostas adicionais',async()=>{
 const c=storageContext();const events=JSON.parse(c.localStorage.getItem('events'));events.e.config.requiredInfoLabels=[];c.localStorage.setItem('events',JSON.stringify(events));
 await c.submitVote('e',{userName:'Ana Silva',userId:'u',timeSlots:[]});assert.equal(c.getEvent('e').votes.length,1);
});

function preparationContext(fail = false) {
 const state={toasts:[],votes:0};
 const c={organizerPreparation:true,eventId:'e',eventData:{config:{requiredInfoLabels:['CPF','Endereço','Apartamento','Telefone']}},requiredInfo:[],blockedSlots:new Set(['2026-10-20|day']),getRequiredInfoLabels:config=>config.requiredInfoLabels,setRequiredInfoError:()=>{},setNameError:()=>{},setIsSubmitting:value=>state.submitting=value,activateEventVoting:async(id,blocked)=>{if(fail)throw Error('offline');state.opened={id,blocked};},addToast:message=>state.toasts.push(message),getEvent:()=>({config:{id:'e',votingOpened:true}}),onPreparationComplete:event=>state.completed=event,submitVote:async()=>state.votes++,console:{error:()=>{}}};
 vm.runInNewContext(declaration('handleSubmit',html.indexOf('const VotingInterface')),c);
 return {c,state};
}
test('confirmar grade com quatro campos ainda vazios abre votação sem montar nem enviar voto',async()=>{
 const {c,state}=preparationContext();await c.handleSubmit();assert.equal(state.opened.id,'e');assert.deepEqual(Array.from(state.opened.blocked),['2026-10-20|day']);assert.equal(state.completed.config.votingOpened,true);assert.equal(state.votes,0);assert.equal(state.submitting,false);assert.match(state.toasts[0],/Grade confirmada/);
});
test('falha ao confirmar grade mantém etapa e informa erro de grade',async()=>{
 const {c,state}=preparationContext(true);await c.handleSubmit();assert.equal(state.completed,undefined);assert.equal(state.votes,0);assert.equal(state.submitting,false);assert.match(state.toasts[0],/confirmar a grade/);
});
test('votação preserva dias e horários mesmo quando todos estão bloqueados',()=>{
 const declarations=['displayDates','displayTimeSlots'].map(name=>html.match(new RegExp('const '+name+' = [^;]+;'))[0]).join('\n');
 const c={dates:['2026-10-20','2026-10-21'],timeSlots:['morning','afternoon'],organizerPreparation:false,blockedSlots:new Set(['2026-10-20|morning','2026-10-20|afternoon','2026-10-21|morning','2026-10-21|afternoon']),getSlotKey:(date,time)=>date+'|'+time};
 vm.runInNewContext(declarations+'\nglobalThis.visible={dates:displayDates,times:displayTimeSlots};',c);assert.equal(c.visible.dates.length,2);assert.equal(c.visible.times.length,2);
});

test('sessão Google restaurada é aguardada antes de tentar login anônimo',async()=>{
 let resolveAuth;let anonymousCalls=0;const c={window:{consensoFirebaseAuthReady:new Promise(resolve=>resolveAuth=resolve),consensoSignInAnonymously:async()=>{anonymousCalls++;}},setTimeout,clearTimeout};
 vm.runInNewContext(declaration('ensureConsensoGuestFirebase'),c);const result=c.ensureConsensoGuestFirebase();c.window.consensoFirebaseUser={uid:'google-user'};resolveAuth();assert.equal((await result).uid,'google-user');assert.equal(anonymousCalls,0);
});
test('convidado sem sessão recebe uid anônimo e falha de autenticação não é escondida',async()=>{
 const c={window:{consensoFirebaseAuthReady:Promise.resolve(),consensoSignInAnonymously:async()=>({user:{uid:'guest'}})},setTimeout,clearTimeout};vm.runInNewContext(declaration('ensureConsensoGuestFirebase'),c);assert.equal((await c.ensureConsensoGuestFirebase()).uid,'guest');
 c.window.consensoFirebaseUser=null;c.window.consensoSignInAnonymously=async()=>{throw Error('auth indisponível')};await assert.rejects(c.ensureConsensoGuestFirebase(),/auth indisponível/);
});
test('evento em cache só aparece após autenticação e configuração atual da nuvem',async()=>{
 const order=[];let remoteCallback;const c={eventId:'e',cancelled:false,unsub:null,setLoadFailed:()=>{},setTimezone:()=>{},getTimezoneDisplay:()=>'',tryHydrateEventFromInviteHash:()=>{},getEvent:()=>({config:{firebaseOwnerUid:'owner'}}),ensureConsensoGuestFirebase:async()=>order.push('auth'),consensoSubscribeRemoteEvent:(owner,id,callback)=>{order.push('subscribe');remoteCallback=callback;return ()=>{}},applyLocalState:()=>order.push('render'),addToast:()=>{}};
 vm.runInNewContext(declaration('boot',html.indexOf('const VotingInterface')),c);await c.boot();assert.deepEqual(order,['auth','subscribe']);remoteCallback();assert.deepEqual(order,['auth','subscribe','render']);
});
test('sincronização preserva bloqueios, quatro campos e respostas salvas',()=>{
 let merged;const callbacks=new Map();const c={window:{consensoFirebaseUser:{uid:'guest'},consensoFsDoc:()=> 'own',consensoFsOnSnapshot:(ref,callback)=>{callbacks.set(ref,callback);return ()=>{}}},consensoFirestoreReady:()=>true,consensoEventDocRef:()=> 'event',consensoVotesColRef:()=> 'votes',consensoParticipantsColRef:()=> 'participants',consensoPublicCommentsColRef:()=> 'comments',consensoConfigFromFs:v=>v,isoVote:v=>v,getEvent:()=>({}),mergeHydratedEvent:(id,payload)=>merged=payload};
 vm.runInNewContext(declaration('consensoSubscribeRemoteEvent'),c);c.consensoSubscribeRemoteEvent('owner','e');
 callbacks.get('event')({exists:()=>true,data:()=>({config:{id:'e',blockedSlots:['2026-10-24|day'],requiredInfoLabels:['CPF','Rua','Apto','Telefone']}})});
 callbacks.get('own')({exists:()=>true,data:()=>({userId:'guest',requiredInfoAnswers:['123','Rua A','12','999'],timeSlots:[],votedAt:'2026-10-20'})});
 assert.equal(merged.config.blockedSlots[0],'2026-10-24|day');assert.equal(merged.config.requiredInfoLabels.length,4);assert.equal(merged.votes[0].requiredInfoAnswers[2],'12');
});
test('grade diária inclui sábado e domingo bloqueados entre sexta e segunda',()=>{
 const c={};vm.runInNewContext(declaration('getDatesInRange'),c);const dates=c.getDatesInRange(new Date(2026,9,23),new Date(2026,9,26));assert.equal(dates.length,4);assert.deepEqual(Array.from(dates,date=>date.getDate()),[23,24,25,26]);
});

test('nome completo é obrigatório em todo voto, com ou sem cadastro',async()=>{
 const c=storageContext();
 for(const userName of [undefined,'','   ','Ana','123 456','Ana '+'x'.repeat(120)])await assert.rejects(c.submitVote('e',{userId:'guest',userName,timeSlots:[]}),/nome completo/);
 assert.equal(c.getEvent('e').votes.length,0);
 for(const userName of ['Ana Silva','João d’Ávila','Li Na','张 三'])await c.submitVote('e',{userId:'guest',userName,timeSlots:[]});
 assert.equal(c.getEvent('e').votes.length,1);
 await c.submitVote('e',{userId:'registered',userName:'  Ana   Maria Silva  ',timeSlots:[]});
 assert.equal(c.getEvent('e').votes.find(v=>v.userId==='registered').userName,'Ana Maria Silva');
});
test('formulário destaca nome incompleto e impede envio para convidados com e sem login',async()=>{
 for(const loggedIn of [false,true]){
 const {c,state}=preparationContext();c.organizerPreparation=false;c.localUserName='Ana';c.topBar={registeredUser:loggedIn?{id:'u'}:null};c.setNameError=value=>state.nameError=value;c.nameInputRef={current:{focus:()=>state.focused=true}};c.setTimeout=fn=>fn();
 vm.runInNewContext(declaration('normalizeFullName')+'\n'+declaration('isValidFullName'),c);
 await c.handleSubmit();assert.equal(state.nameError,true);assert.equal(state.focused,true);assert.equal(state.votes,0);assert.equal(state.opened,undefined);assert.match(state.toasts[0],/nome completo/);
 }
});
