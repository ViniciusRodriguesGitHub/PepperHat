const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
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
