const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function declaration(name) {
  const start = html.indexOf('    const ' + name + ' =');
  assert.ok(start >= 0, name);
  const end = html.indexOf('\n    };', start) + '\n    };'.length;
  return html.slice(start, end) + '\nglobalThis.' + name + '=' + name + ';';
}
function harness(uid = 'owner') {
  const data = {};
  const session = {provider:'google',sub:uid,firebaseUid:uid};
  const c = {Date,Set,Map,STORAGE_KEY:'events',CONSENSO_FB_APP_ID:'app',session,window:{},getAdminSession:()=>c.session,adminKey:s=>s ? 'google:'+s.sub : null,getCurrentUser:()=>({id:'local-user'}),isoVote:v=>v,localStorage:{getItem:key=>data[key] || null,setItem:(key,value)=>data[key]=value}};
  vm.createContext(c);
  for(const name of ['getEvent','canManageEventId','getEventsForAdmin','consensoConfigFromFs','consensoFsScalarToIso','consensoConfigToPlain','mergeHydratedEvent','consensoApplyOrganizerSnapshot','consensoSubscribeOrganizerEvents','consensoHydrateOrganizerEvent']) vm.runInContext(declaration(name),c);
  c.store=events=>c.localStorage.setItem('events',JSON.stringify(events));
  c.read=()=>JSON.parse(c.localStorage.getItem('events')||'{}');
  return c;
}
const config=(id,owner='owner')=>({id,title:id,firebaseOwnerUid:owner,createdAt:'2026-10-26',startDate:'2099-01-01',endDate:'2099-01-02'});
const snapshot=(configs,fromCache=false)=>({metadata:{fromCache},docs:configs.map(config=>({id:config.id,data:()=>({config})}))});
test('navegador sem cache encontra e gerencia reuniao da mesma conta sem chave local',()=>{
  const c=harness();
  const cloud=c.consensoConfigToPlain({...config('e'),creatorAdminKey:'google:owner'});
  assert.equal(cloud.creatorAdminKey,undefined);
  c.consensoApplyOrganizerSnapshot('owner',snapshot([cloud]));
  assert.equal(c.getEventsForAdmin().length,1);
  assert.equal(c.canManageEventId('e'),true);
  assert.equal(c.read().e.config.creatorAdminKey,undefined);
});
test('trocar de conta isola a lista e recusa callback atrasado da conta anterior',()=>{
  const c=harness();c.consensoApplyOrganizerSnapshot('owner',snapshot([config('e')]));
  c.session={provider:'google',sub:'other',firebaseUid:'other'};
  assert.equal(c.getEventsForAdmin().length,0);assert.equal(c.canManageEventId('e'),false);
  c.consensoApplyOrganizerSnapshot('owner',snapshot([config('late')]));
  assert.equal(c.read().late,undefined);
  c.consensoApplyOrganizerSnapshot('other',snapshot([config('second','other')]));
  assert.equal(c.getEventsForAdmin()[0].id,'second');
  assert.ok(c.read().e);
});
test('snapshot do servidor reconcilia criacao alteracao exclusao e preserva outras contas e legados',()=>{
  const c=harness();c.store({old:{config:config('old'),votes:[]},other:{config:config('other','other'),votes:[]},legacy:{config:{...config('legacy'),firebaseOwnerUid:undefined,creatorAdminKey:'google:owner'},votes:[]}});
  c.consensoApplyOrganizerSnapshot('owner',snapshot([config('new')]));
  assert.equal(c.read().old,undefined);assert.ok(c.read().other);assert.ok(c.read().legacy);
  c.consensoApplyOrganizerSnapshot('owner',snapshot([{...config('new'),title:'Atualizada'}]));
  assert.equal(c.read().new.config.title,'Atualizada');
  c.consensoApplyOrganizerSnapshot('owner',snapshot([]));assert.equal(c.read().new,undefined);
});
test('snapshot offline vazio nao apaga reunioes previamente sincronizadas',()=>{
  const c=harness();c.store({e:{config:config('e'),votes:[]}});
  c.consensoApplyOrganizerSnapshot('owner',snapshot([],true));assert.ok(c.read().e);
});
test('lista aguarda autenticacao, assina so a colecao e permite cancelar o listener',async()=>{
  const c=harness();const order=[];let callback,stop=false,release;
  c.waitForConsensoFirebaseUser=()=>new Promise(resolve=>{release=resolve;order.push('auth');});
  c.window={consensoDb:{},consensoFsDoc:()=> 'owner-document',consensoFsCollection:()=> 'events-collection',consensoFsOnSnapshot:(ref,opts,onNext)=>{order.push(ref);callback=onNext;assert.equal(opts.includeMetadataChanges,true);return ()=>{stop=true;};}};
  const states=[];const pending=c.consensoSubscribeOrganizerEvents('owner',state=>states.push(state),error=>{throw error;});
  assert.deepEqual(order,['auth']);release();const unsubscribe=await pending;
  assert.deepEqual(order,['auth','events-collection']);callback(snapshot([config('e')]));
  assert.deepEqual(states,['synced']);assert.equal(c.getEventsForAdmin().length,1);
  unsubscribe();assert.equal(stop,true);
});
test('troca de conta durante autenticacao nao inicia assinatura da conta antiga',async()=>{
  const c=harness();let release;c.waitForConsensoFirebaseUser=()=>new Promise(resolve=>release=resolve);
  const pending=c.consensoSubscribeOrganizerEvents('owner',()=>{},()=>{});
  c.session={firebaseUid:'other'};release();assert.equal(typeof await pending,'function');
});
test('falha de autenticacao na lista nao vira lista vazia de sucesso',async()=>{
  const c=harness();c.waitForConsensoFirebaseUser=async()=>{throw Error('auth failed');};
  await assert.rejects(c.consensoSubscribeOrganizerEvents('owner',()=>{},()=>{}),/auth failed/);
});
test('chave local nunca concede acesso a reuniao na nuvem de outra conta',()=>{
  const c=harness();c.store({e:{config:{...config('e','other'),creatorAdminKey:'google:owner'},votes:[]}});
  assert.equal(c.canManageEventId('e'),false);assert.equal(c.getEventsForAdmin().length,0);
});
test('link direto do painel carrega reuniao sem cache no caminho do dono autenticado',async()=>{
  const c=harness();c.waitForConsensoFirebaseUser=async()=>{};
  c.consensoEventDocRef=(uid,id)=>uid+'/'+id;
  c.window.consensoFsGetDoc=async ref=>{assert.equal(ref,'owner/e');return {exists:()=>true,data:()=>({config:config('e')})};};
  assert.equal(await c.consensoHydrateOrganizerEvent('owner','e'),true);
  assert.equal(c.canManageEventId('e'),true);
});
test('reuniao inexistente e troca de conta durante leitura nao concedem painel',async()=>{
  const c=harness();c.waitForConsensoFirebaseUser=async()=>{};c.consensoEventDocRef=()=> 'event';
  c.window.consensoFsGetDoc=async()=>({exists:()=>false});
  assert.equal(await c.consensoHydrateOrganizerEvent('owner','e'),false);
  c.window.consensoFsGetDoc=async()=>{c.session={firebaseUid:'other'};return {exists:()=>true,data:()=>({config:config('e')})};};
  assert.equal(await c.consensoHydrateOrganizerEvent('owner','e'),false);assert.equal(c.read().e,undefined);
});
test('login Google recusado pelo Firebase nao declara sucesso nem cria sessao local',async()=>{
  const start=html.indexOf('                const baseSession =');
  const end=html.indexOf('\n              }\n            });',start);
  const state={};const c={payload:{email:'owner@example.invalid',sub:'google-owner'},response:{credential:'mock'},window:{linkConsensoFirebaseWithGoogleJwt:async()=>{throw Error('offline');}},setAdminSession:value=>state.session=value,cancelledRef:{current:false},onSuccessRef:{current:()=>state.success=true},setGisError:value=>state.error=value,console:{error(){}}};
  await vm.runInNewContext('(async()=>{'+html.slice(start,end)+'})()',c);
  assert.equal(state.success,undefined);assert.equal(state.session,undefined);assert.match(state.error,/possível entrar/);
});
