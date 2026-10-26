// Cria somente uma reunião e identidades temporárias; remove tudo ao terminar.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
async function main() {
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const key=/apiKey: '([^']+)'/.exec(html)[1];
 const users=[];let owner,eventId,checks=0;
 const auth=async(method,data)=>{const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:'+method+'?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200,'Temporary authentication');return r.json();};
 const encode=v=>Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:v&&typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}}:{stringValue:String(v)};
 const request=(doc,method,user,data)=>fetch('https://firestore.googleapis.com/v1/projects/pepperhatapps/databases/(default)/documents/'+doc,{method,headers:{Authorization:'Bearer '+user.idToken,'Content-Type':'application/json'},...(data?{body:JSON.stringify({fields:encode(data).mapValue.fields})}:{})});
 const call=async(name,user,data)=>{const r=await fetch('https://southamerica-east1-pepperhatapps.cloudfunctions.net/'+name,{method:'POST',headers:{Authorization:'Bearer '+user.idToken,'Content-Type':'application/json'},body:JSON.stringify({data})});const text=await r.text();if(!r.headers.get('content-type')?.includes('application/json'))throw Error(name+' returned HTTP '+r.status+' without JSON');return {status:r.status,body:JSON.parse(text)};};
 const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('OK: '+label);};
 try {
  for(let i=0;i<2;i++)users.push(await auth('signUp',{returnSecureToken:true}));
  owner=users[0];const guest=users[1]; // Identidades anônimas exclusivas deste teste.
  eventId='manual-test-'+crypto.randomUUID();
  const root='artifacts/pepperhatapps/users/'+owner.localId+'/consenso_v1/'+eventId;
  const slots=['2099-10-27|15:00','2099-11-01|09:00','2099-11-05|23:30'];
  const config={id:eventId,title:'Temporary manual test',firebaseOwnerUid:owner.localId,startDate:'2099-10-27',endDate:'2099-11-05',granularity:'manual',manualSlots:slots,blockedSlots:[],quorum:4,votingOpened:true,finalized:false,votingClosed:false,timeZone:'America/Sao_Paulo'};
  check((await request(root,'PATCH',owner,{config})).status===200,'Manual event created already open');
  const vote=(user,timeSlots)=>({userId:user.localId,userName:'Pessoa Teste',timeSlots,preferredSlots:[],comment:'Test comment',commentVisibility:'everyone',votedAt:new Date().toISOString()});
  const guestVote=vote(guest,[slots[2]]);
  check((await request(root+'/votes/'+guest.localId,'PATCH',guest,guestVote)).status===200,'Anonymous guest votes for exact manual option at 23:30');
  check((await request(root+'/votes/'+guest.localId,'PATCH',guest,{...guestVote,timeSlots:['2099-10-27|23:30']})).status===403,'Unlisted date/time combination rejected');
  check((await request(root+'/participants/'+guest.localId,'PATCH',guest,{userId:guest.localId,votedAt:guestVote.votedAt})).status===200,'Participation receipt saved');
  check((await request(root+'/public_comments/'+guest.localId,'PATCH',guest,{userId:guest.localId,userName:guestVote.userName,comment:guestVote.comment,votedAt:guestVote.votedAt})).status===200,'Public comment saved');
  check((await request(root+'/votes/'+owner.localId,'PATCH',owner,vote(owner,[slots[0]]))).status===200,'Authenticated organizer records own vote');
  const data={ownerUid:owner.localId,eventId,voteUid:guest.localId};
  check((await call('consensoDeleteVote',guest,data)).status===403,'Guest cannot delete votes');
  check((await call('consensoOpenTally',owner,{...data,earlyConfirmed:true})).status===200,'Server opens tally with manual options');
  check((await call('consensoDeleteVote',owner,data)).status===200,'Owner deletes unwanted vote');
  check((await request(root+'/votes/'+guest.localId,'GET',guest)).status===404,'Deleted vote absent');
  for(const collection of ['participants','participant_details','public_comments'])check((await request(root+'/'+collection+'/'+guest.localId,'GET',owner)).status===404,collection+' removed');
  const summary=await (await request(root+'/organizer_results/summary','GET',owner)).json();
  check(summary.fields.totalVotes.integerValue==='1' && summary.fields.slots.arrayValue.values.length===1,'Tally recalculated using remaining vote');
  check((await call('consensoFinalize',owner,{...data,selectedSlotKey:slots[0]})).status===200,'Manual result finalized');
  check((await call('consensoDeleteVote',owner,{...data,voteUid:owner.localId})).status===400,'Finalized result protects votes from deletion');
  console.log(checks+' live checks passed.');
 } finally {
  const failures=[];
  if(owner&&eventId) {try {const r=await call('consensoDeleteEvent',owner,{ownerUid:owner.localId,eventId});if(r.status!==200)failures.push('event');}catch{failures.push('event');}}
  for(const user of users){try{await auth('delete',{idToken:user.idToken});}catch{failures.push('identity');}}
  if(failures.length)throw Error('Temporary cleanup failed: '+failures.join(', '));
  console.log('Temporary event and identities removed.');
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
