const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
test('data permanece local', () => assert.equal(core.formatLocalDate(core.parseLocalDate('2026-08-07')), '2026-08-07'));
test('unanimidade retorna o primeiro horário', () => {
  const result = core.calculateConsensus({ config: { quorum: 2 }, votes: [{ timeSlots: ['2026-08-08|09:00', '2026-08-07|10:00'] }, { timeSlots: ['2026-08-07|10:00', '2026-08-08|09:00'] }] });
  assert.equal(result.type, 'unanimous'); assert.equal(core.formatLocalDate(result.slots[0].date), '2026-08-07'); assert.equal(result.slots.length, 1);
});
test('seleção duplicada conta uma vez', () => {
  const result = core.calculateConsensus({ config: { quorum: 2 }, votes: [{ timeSlots: ['2026-08-07|10:00', '2026-08-07|10:00'] }, { timeSlots: ['2026-08-08|11:00'] }] });
  assert.equal(result.type, 'majority'); assert.equal(result.slots[0].votes, 1);
});
test('nenhuma seleção não cria maioria', () => {
  const result = core.calculateConsensus({ config: { quorum: 2 }, votes: [{ timeSlots: [] }, { timeSlots: [] }] });
  assert.deepEqual(result.slots, []); assert.equal(result.type, 'none');
});
test('quórum e antecipação', () => {
  const event = { config: { quorum: 5, earlyRevelation: true }, votes: [{}, {}, {}] };
  assert.equal(core.hasReachedQuorum(event), false); assert.equal(core.hasReachedEarlyRevelationThreshold(event), true); assert.equal(core.getMissingVotesCount(event), 2); assert.equal(core.getVoteProgressPercentage(event), 60);
});
test('progresso público não depende de ler votos privados', () => {
  const event = { config: { quorum: 5, voteCount: 4, earlyRevelation: true }, votes: [{}] };
  assert.equal(core.getVoteCount(event), 4);
  assert.equal(core.getMissingVotesCount(event), 1);
  assert.equal(core.getVoteProgressPercentage(event), 80);
  assert.equal(core.hasReachedEarlyRevelationThreshold(event), true);
});
test('link de convite não carrega votos nem dados administrativos', () => {
  const payload = core.sanitizeInvitePayload({
    config: { id: 'evento', title: 'Reunião', creatorAdminEmail: 'admin@example.com', creatorAdminKey: 'segredo' },
    votes: [{ userName: 'Pessoa', timeSlots: ['2026-08-07|10:00'] }],
  });
  assert.deepEqual(payload.votes, []);
  assert.equal(payload.config.creatorAdminEmail, undefined);
  assert.equal(payload.config.creatorAdminKey, undefined);
  assert.equal(payload.config.title, 'Reunião');
});
test('resultado depende da finalização do organizador, não apenas do quórum', () => {
  const event = { config: { quorum: 2, voteCount: 2, finalized: false }, votes: [{}, {}] };
  assert.equal(core.hasReachedQuorum(event), true);
  assert.equal(core.canRevealResults(event), false);
  event.config.finalized = true;
  assert.equal(core.canRevealResults(event), true);
});
test('períodos bloqueados pelo organizador nunca entram na apuração', () => {
  const result = core.calculateConsensus({
    config: { quorum: 2, blockedSlots: ['2026-08-07|09:00'] },
    votes: [
      { timeSlots: ['2026-08-07|09:00', '2026-08-07|10:00'] },
      { timeSlots: ['2026-08-07|09:00', '2026-08-07|10:00'] },
    ],
  });
  assert.equal(result.slots[0].time, '10:00');
});
