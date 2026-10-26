const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const core = require('../core.js');
function handler(name) {
  const start = html.indexOf('      const ' + name + ' =');
  assert.ok(start >= 0);
  return html.slice(start, html.indexOf('\n      };', start) + 9) + '\nglobalThis.run = ' + name + ';';
}
for (const mode of ['participant', 'administrative']) {
  test('creation routes directly for ' + mode, () => {
    const state = {};
    const context = {setCurrentEvent() {}, setEventId() {}, setIsManager(v) {state.manager=v;}, setCurrentView(v) {state.view=v;}, setVoteHashFromInviteLink(id, voter) {state.voter=voter;}, window:{location:{}}};
    vm.runInNewContext(handler('handleCreateEvent'), context);
    context.run({id:'e', votingOpened:true, managerMode:mode});
    assert.equal(state.manager, true);
    assert.equal(state.view, mode === 'administrative' ? 'manage' : 'vote');
    if (mode === 'participant') assert.equal(state.voter, true);
    else assert.equal(context.window.location.hash, 'manage/e');
  });
}
function publication({accept=true, votes=2, busy=false, fail=false}={}) {
  const state={saved:0, messages:[], busy:[]};
  const context={finalizing:busy, getVoteCount:()=>3, eventData:{}, selectedFinalSlot:'slot', consensusOptions:[{key:'slot',votes}], formatConsensusOption:()=> 'date', window:{confirm(message){state.confirm=message;return accept;}}, setFinalizing:value=>state.busy.push(value), unlockResults:async()=>{if(fail)throw Error('offline');state.saved++;}, eventId:'e', loadEventData(){}, addToast:message=>state.messages.push(message)};
  vm.runInNewContext(handler('handleUnlockResults'),context);
  return {state, run:context.run};
}
test('publication needs one explicit confirmation and no comment review', async()=>{
  const {state,run}=publication();await run();assert.equal(state.saved,1);assert.match(state.confirm,/2 de 3/);assert.deepEqual(state.busy,[true,false]);
});
test('unanimous publication still confirms the immutable result',async()=>{
  const {state,run}=publication({votes:3});await run();assert.equal(state.saved,1);assert.match(state.confirm,/Todas as 3/);assert.match(state.confirm,/trocada/);
});
test('cancelled or busy publication saves nothing',async()=>{
  for(const options of [{accept:false},{busy:true}]){const {state,run}=publication(options);await run();assert.equal(state.saved,0);}
});
test('publication failure releases the button for retry',async()=>{
  const {state,run}=publication({fail:true});await run();assert.equal(state.saved,0);assert.deepEqual(state.busy,[true,false]);assert.equal(state.messages.length,1);
});

function manualCreation(slots) {
 const state={};
 const context={getAdminSession:()=>({firebaseUid:'owner'}),title:'Manual',requiredInfoLabels:[],granularity:'manual',startDate:'2099-12-31',endDate:'2099-01-01',manualSlots:slots,blockedSlots:new Set(['2099-11-01|09:00']),quorum:4,managerMode:'participant',meetingInstructions:'',emailMode:'none',votingDeadline:'',automationStatus:{},parseLocalDate:core.parseLocalDate,creationSlotKeys(){throw Error('Manual must not generate a regular grid');},addToast:message=>state.message=message,setIsSubmitting(){},getCurrentUser:()=>({id:'owner'}),createEvent:async config=>{state.config=config;return config;},onCreate(){state.created=true;},Intl,Date,console};
 const start=html.indexOf('      const handleSubmit =',html.indexOf('    const EventCreation ='));
 const code=html.slice(start,html.indexOf('\n      };',start)+9)+'\nglobalThis.run=handleSubmit;';
 vm.runInNewContext(code,context);
 return {state,run:context.run};
}
test('manual creation derives its dates, preserves only exact alternatives and never blocks options',async()=>{
 const {state,run}=manualCreation(['2099-11-05|18:00','2099-10-27|15:00','2099-11-01|09:00']);await run();
 assert.equal(state.created,true);assert.equal(state.config.votingOpened,true);assert.equal(state.config.blockedSlots.length,0);
 assert.equal(core.formatLocalDate(state.config.startDate),'2099-10-27');assert.equal(core.formatLocalDate(state.config.endDate),'2099-11-05');
 assert.deepEqual(Array.from(state.config.manualSlots),['2099-10-27|15:00','2099-11-01|09:00','2099-11-05|18:00']);
});
test('manual creation requires at least one explicit alternative',async()=>{
 const {state,run}=manualCreation([]);await run();assert.equal(state.created,undefined);assert.match(state.message,/pelo menos/);
});
