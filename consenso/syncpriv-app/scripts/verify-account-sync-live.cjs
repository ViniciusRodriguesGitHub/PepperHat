// Somente reuniões e identidades temporárias; não usa contas nem reuniões do usuário.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
async function main() {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'),'utf8');
  const key = /apiKey: '([^']+)'/.exec(html)[1];
  const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const base = 'https://firestore.googleapis.com/v1/projects/pepperhatapps/databases/(default)/documents/';
  const users=[];let eventPath,owner,checks=0;
  const auth=async(method,data)=>{const response=await fetch(authBase+method+'?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(response.status,200,'Autenticação temporária');return response.json();};
  const encode=value=>typeof value==='boolean'?{booleanValue:value}:typeof value==='number'?{integerValue:String(value)}:typeof value==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]))}}:{stringValue:String(value)};
  const request=(doc,method,user,data)=>fetch(base+doc,{method,headers:{Authorization:'Bearer '+user.idToken,'Content-Type':'application/json'},...(data?{body:JSON.stringify({fields:encode(data).mapValue.fields})}:{})});
  const check=(condition,label)=>{assert.ok(condition,label);checks++;console.log('OK: '+label);};
  const createUser=async()=>{const email='consenso-sync-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('base64url');const user=await auth('signUp',{email,password,returnSecureToken:true});users.push(user);return {user,email,password};};
  try {
    const first=await createUser();owner=first.user;
    const second=await auth('signInWithPassword',{email:first.email,password:first.password,returnSecureToken:true});
    check(owner.localId===second.localId,'Dois logins independentes da mesma conta têm o mesmo UID');
    const collection='artifacts/pepperhatapps/users/'+owner.localId+'/consenso_v1';
    const id='sync-'+crypto.randomUUID();eventPath=collection+'/'+id;
    const config={id,title:'Teste temporário de sincronização',firebaseOwnerUid:owner.localId,startDate:'2099-01-22',endDate:'2099-01-23',createdAt:new Date().toISOString(),quorum:4,finalized:false,votingClosed:false};
    check((await request(eventPath,'PATCH',owner,{config})).status===200,'Primeira sessão cria reunião sem identificação local');
    const listing=await request(collection,'GET',second);check(listing.status===200,'Segunda sessão consegue consultar a coleção da conta');
    const listed=await listing.json();check(listed.documents.some(doc=>doc.name.endsWith('/'+id)),'Reunião criada na primeira sessão consta na segunda');
    check(!listed.documents[0].fields.config.mapValue.fields.creatorAdminKey,'Documento remoto não depende de creatorAdminKey');
    config.title='Atualizada pela primeira sessão';check((await request(eventPath,'PATCH',owner,{config})).status===200,'Primeira sessão atualiza reunião');
    const updated=await (await request(eventPath,'GET',second)).json();check(updated.fields.config.mapValue.fields.title.stringValue===config.title,'Segunda sessão recebe configuração atualizada');
    const other=(await createUser()).user;
    const otherList=await (await request('artifacts/pepperhatapps/users/'+other.localId+'/consenso_v1','GET',other)).json();
    check(!(otherList.documents||[]).length,'Coleção de outra conta permanece independente');
    check((await request(eventPath,'PATCH',other,{config})).status===403,'Outra conta não pode alterar a reunião');
    check((await request(eventPath,'DELETE',owner)).status===200,'Primeira sessão exclui reunião temporária');
    check((await request(eventPath,'GET',second)).status===404,'Segunda sessão confirma exclusão no servidor');
    console.log(checks+' verificações reais de sincronização aprovadas.');
  } finally {
    const failures=[];
    if(eventPath&&owner){const response=await request(eventPath,'DELETE',owner);if(![200,404].includes(response.status))failures.push('reunião');}
    for(const user of users){try{await auth('delete',{idToken:user.idToken});}catch{failures.push('identidade');}}
    if(failures.length)throw Error('Limpeza incompleta: '+failures.join(', '));
    console.log('Reunião e identidades temporárias removidas.');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
