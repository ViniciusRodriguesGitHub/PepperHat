const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
const event = (quorum, votes) => ({ config: { quorum }, votes: Array.from({ length: votes }, () => ({})) });
test('mais da metade é estrito e usa o total esperado', () => {
 assert.equal(core.hasStrictMajority(event(6,3)),false);assert.equal(core.hasStrictMajority(event(6,4)),true);assert.equal(core.hasStrictMajority(event(5,2)),false);assert.equal(core.hasStrictMajority(event(5,3)),true);
});
test('horários ficam ocultos até abrir apuração, inclusive com maioria',()=>{
 assert.equal(core.canChooseFinalResult(event(5,4)),false);assert.equal(core.canChooseFinalResult({config:{tallyOpenedAt:'2026-10-21'},votes:[]}),true);
});
test('fechamento manual e prazo encerram os votos',()=>{
 const now='2026-10-21T12:00:00Z';assert.equal(core.isVotingClosed({votingDeadline:now},now),true);assert.equal(core.isVotingClosed({votingDeadline:'2026-10-21T12:01:00Z'},now),false);assert.equal(core.isVotingClosed({votingClosed:true}),true);
});
test('automático escolhe maior disponibilidade e desempata pelo futuro mais próximo',()=>{
 const e={config:{quorum:3,timeZone:'America/Sao_Paulo'},votes:[{timeSlots:['2026-10-22|09:00','2026-10-21|15:00','2026-10-21|08:00']},{timeSlots:['2026-10-22|09:00','2026-10-21|15:00']},{timeSlots:['2026-10-23|12:00']}]};
 const result=core.chooseAutomaticResult(e,'2026-10-21T15:00:00Z');assert.equal(result.slots[0].key,'2026-10-21|15:00');assert.equal(result.type,'majority');assert.equal(result.slots[0].votes,2);
});
test('automático descarta passado mesmo que ele tenha mais votos e respeita bloqueios',()=>{
 const e={config:{quorum:2,timeZone:'America/Sao_Paulo',blockedSlots:['2026-10-22|09:00']},votes:[{timeSlots:['2026-10-20|09:00','2026-10-22|09:00','2026-10-23|10:00']},{timeSlots:['2026-10-20|09:00','2026-10-22|09:00']}]};assert.equal(core.chooseAutomaticResult(e,'2026-10-21T15:00:00Z').slots[0].key,'2026-10-23|10:00');
});
test('sem votos ou sem opção futura gera resultado explicativo sem data inventada',()=>{
 const e={config:{quorum:2},votes:[]};assert.equal(core.chooseAutomaticResult(e).reason,'no-votes');e.votes=[{timeSlots:['2000-01-01|09:00']}];assert.equal(core.chooseAutomaticResult(e).reason,'no-future-availability');assert.equal(core.chooseAutomaticResult(e).slots.length,0);
});
test('prazo usa fuso do evento e aceita o dia atual para grade de dia inteiro',()=>{
 assert.equal(new Date(core.zonedSlotTime('2026-10-21','09:00','America/Sao_Paulo')).toISOString(),'2026-10-21T12:00:00.000Z');
 const e={config:{quorum:2,timeZone:'America/Sao_Paulo'},votes:[{timeSlots:['2026-10-21|day']}]};assert.equal(core.chooseAutomaticResult(e,'2026-10-22T01:00:00Z').slots.length,1);
});
test('e-mail é validado separadamente dos quatro campos adicionais',()=>{
 assert.equal(core.isValidNotificationEmail('pessoa@example.com'),true);for(const value of ['','sem arroba','a@b','a @b.com'])assert.equal(core.isValidNotificationEmail(value),false);
});
