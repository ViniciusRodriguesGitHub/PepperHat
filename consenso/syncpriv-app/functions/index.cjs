'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten, onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const core = require('./consenso-core.cjs');
initializeApp();
const db = getFirestore();
const region = 'southamerica-east1';
const options = { region, maxInstances: 3, cors: ['https://viniciusrodriguesgithub.github.io', new RegExp('^http://localhost(:[0-9]+)?$')] };
const eventPattern = 'artifacts/{appId}/users/{ownerUid}/consenso_v1/{eventId}';
const smtpReady = () => Boolean(process.env.CONSENSO_SMTP_HOST && process.env.CONSENSO_EMAIL_FROM);
const smtpPassword = process.env.CONSENSO_SMTP_HOST ? defineSecret('CONSENSO_SMTP_PASSWORD') : { value: () => '' };
const mailOptions = { region, maxInstances: 2, retry: false, ...(process.env.CONSENSO_SMTP_HOST ? { secrets: [smtpPassword] } : {}) };
function eventRef(data) {
  if (!data || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.eventId || '') || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.ownerUid || '')) throw new HttpsError('invalid-argument', 'Reunião inválida.');
  return db.doc('artifacts/pepperhatapps/users/' + data.ownerUid + '/consenso_v1/' + data.eventId);
}
function requireOwner(request) {
  if (!request.auth || request.auth.uid !== request.data?.ownerUid) throw new HttpsError('permission-denied', 'Apenas o organizador pode fazer isso.');
  return eventRef(request.data);
}
function privateDetails(vote) {
  return { userId: vote.userId, userName: vote.userName || '', notificationEmail: vote.notificationEmail || '', requiredInfoAnswers: vote.requiredInfoAnswers || (vote.requiredInfo ? [vote.requiredInfo] : []), comment: vote.comment || '', commentVisibility: vote.commentVisibility || 'organizer', votedAt: vote.votedAt || '' };
}
function snapshotEvent(snap, votes) {
  if (!snap.exists) throw new HttpsError('not-found', 'Reunião não encontrada.');
  return { config: snap.data().config, votes: votes.docs.map(doc => doc.data()) };
}
function serializeOptions(event) {
  return core.rankConsensusSlots(event).map(slot => ({ key: slot.key, date: slot.key.split('|')[0], time: slot.time, votes: slot.votes }));
}
function tallySummary(event) {
  return { slots: serializeOptions(event), totalVotes: event.votes.length, updatedAt: new Date().toISOString() };
}
async function openTally(ref, earlyConfirmed) {
  return db.runTransaction(async tx => {
    const [snap, votes] = await Promise.all([tx.get(ref), tx.get(ref.collection('votes'))]);
    const event = snapshotEvent(snap, votes);
    if (event.config.finalized) throw new HttpsError('failed-precondition', 'A votação já foi finalizada.');
    if (event.config.tallyOpenedAt) return { alreadyOpened: true };
    if (core.isVotingClosed(event.config)) throw new HttpsError('failed-precondition', 'O prazo acabou. A apuração automática está em andamento.');
    if (!event.votes.length) throw new HttpsError('failed-precondition', 'Aguarde pelo menos um voto.');
    const early = event.votes.length <= Number(event.config.quorum) / 2;
    if (early && earlyConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirme a antecipação irreversível.');
    const openedAt = new Date().toISOString();
    tx.update(ref, { 'config.votingClosed': true, 'config.tallyOpenedAt': openedAt, 'config.tallyEarly': early, 'config.automationVersion': 2 });
    tx.set(ref.collection('organizer_results').doc('summary'), tallySummary(event));
    return { openedAt, early };
  });
}
async function finalize(ref, selectedKey, automatic = false, now = new Date()) {
  return db.runTransaction(async tx => {
    const [snap, votes] = await Promise.all([tx.get(ref), tx.get(ref.collection('votes'))]);
    const event = snapshotEvent(snap, votes);
    if (event.config.finalized) return { alreadyFinalized: true };
    const due = event.config.votingDeadline && new Date(event.config.votingDeadline) <= now;
    const useAutomatic = automatic || due;
    if (automatic && !due) return { notDue: true };
    if (!useAutomatic && !event.config.tallyOpenedAt) throw new HttpsError('failed-precondition', 'Abra a apuração antes de escolher o resultado.');
    let result;
    if (useAutomatic) result = core.chooseAutomaticResult(event, now);
    else {
      const chosen = serializeOptions(event).find(slot => slot.key === selectedKey);
      if (!chosen) throw new HttpsError('invalid-argument', 'Selecione uma opção válida.');
      const at = core.zonedSlotTime(chosen.date, chosen.time, event.config.timeZone || 'America/Sao_Paulo');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: event.config.timeZone || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      if (chosen.time === 'day' ? chosen.date < today : at < now.getTime()) throw new HttpsError('failed-precondition', 'Esse horário já passou. Escolha uma opção futura.');
      result = { type: chosen.votes === event.votes.length ? 'unanimous' : 'majority', slots: [chosen], totalVotes: event.votes.length, quorum: event.config.quorum, reason: 'organizer' };
    }
    tx.update(ref, { 'config.finalized': true, 'config.resultsUnlocked': true, 'config.votingClosed': true, 'config.tallyOpenedAt': event.config.tallyOpenedAt || now.toISOString(), 'config.finalizedAt': now.toISOString(), 'config.finalResult': result, 'config.selectedFinalSlot': result.slots[0]?.key || '', 'config.automationVersion': 2, 'config.finalizationMode': useAutomatic ? 'deadline' : 'organizer', 'config.notificationStatus': ['optional', 'required'].includes(event.config.emailMode) ? 'pending' : 'none' });
    tx.set(ref.collection('organizer_results').doc('summary'), tallySummary(event));
    return { result };
  });
}
exports.consensoAutomationStatus = onCall(options, request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  return { deadlineReady: true, emailReady: smtpReady(), version: 2 };
});
exports.consensoOpenTally = onCall(options, request => openTally(requireOwner(request), request.data.earlyConfirmed));
exports.consensoFinalize = onCall(options, request => finalize(requireOwner(request), request.data.selectedSlotKey));
exports.consensoPrepareOrganizerPanel = onCall(options, async request => {
  const ref = requireOwner(request); const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Reunião não encontrada.');
  if (snap.data().config.participantDetailsPreparedAt) return { prepared: true };
  const votes = await ref.collection('votes').get();
  for (let start = 0; start < votes.docs.length; start += 400) {
    const batch = db.batch();
    for (const vote of votes.docs.slice(start, start + 400)) batch.set(ref.collection('participant_details').doc(vote.id), privateDetails(vote.data()));
    await batch.commit();
  }
  await ref.update({ 'config.automationVersion': 2, 'config.participantDetailsPreparedAt': new Date().toISOString() });
  return { prepared: true };
});
exports.consensoSyncVoteDetails = onDocumentWritten({ region, maxInstances: 3, document: eventPattern + '/votes/{voteUid}' }, async event => {
  const ref = event.data.after.ref.parent.parent;
  const detailsRef = ref.collection('participant_details').doc(event.params.voteUid);
  const receiptRef = ref.collection('participants').doc(event.params.voteUid);
  await db.runTransaction(async tx => {
    const parent = await tx.get(ref);
    if (!event.data.after.exists || !parent.exists) { tx.delete(detailsRef); tx.delete(receiptRef); return; }
    tx.set(detailsRef, privateDetails(event.data.after.data()));
    tx.set(receiptRef, { userId: event.params.voteUid, votedAt: event.data.after.data().votedAt || new Date().toISOString() });
  });
});
exports.consensoFinalizeDeadlines = onSchedule({ region, schedule: 'every 1 minutes', timeZone: 'UTC', maxInstances: 1, timeoutSeconds: 120 }, async () => {
  const now = new Date();
  const events = await db.collectionGroup('consenso_v1').where('config.finalized', '==', false).where('config.votingDeadline', '<=', now.toISOString()).limit(100).get();
  const settled = await Promise.allSettled(events.docs.map(doc => finalize(doc.ref, null, true, now)));
  const failures = settled.filter(item => item.status === 'rejected');
  if (failures.length) { logger.error('Falha em apuração automática', { count: failures.length }); throw Error('Uma ou mais reuniões precisam de nova tentativa.'); }
});
async function queueResultEmails(ref) {
  if (!smtpReady()) { await ref.update({ 'config.notificationStatus': 'configuration-required' }); return; }
  const attempt = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) return 0; const config = snap.data().config;
    if (!config.finalized || !['optional','required'].includes(config.emailMode) || config.notificationStatus === 'queued' || config.notificationStatus === 'failed') return 0;
    const attempts = Number(config.notificationQueueAttempts || 0);
    if (attempts >= 3) { tx.update(ref, { 'config.notificationStatus':'failed' }); return 0; }
    tx.update(ref, { 'config.notificationQueueAttempts': attempts + 1, 'config.notificationStatus': 'pending' }); return attempts + 1;
  });
  if (!attempt) return;
  try {
    const votes = await ref.collection('votes').get(); const seen = new Set();
    for (const vote of votes.docs) {
      const email = String(vote.data().notificationEmail || '').trim().toLowerCase();
      if (!core.isValidNotificationEmail(email) || seen.has(email)) continue; seen.add(email);
      try { await ref.collection('notification_jobs').doc(vote.id).create({ email, userName: vote.data().userName || '', status: 'pending', attempts: 0, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString() }); }
      catch (error) { if (error.code !== 6 && error.code !== 'already-exists') throw error; }
    }
    await ref.update({ 'config.notificationStatus': 'queued' });
  } catch (error) { logger.error('Fila do resultado indisponível', { attempt }); if (attempt >= 3) await ref.update({ 'config.notificationStatus':'failed' }); }
}
exports.consensoQueueResultEmails = onDocumentUpdated({ region, maxInstances: 2, retry: false, document: eventPattern }, async event => {
  const before = event.data.before.data().config || {}; const config = event.data.after.data().config || {};
  if (before.finalized || !config.finalized || !['optional','required'].includes(config.emailMode)) return;
  return queueResultEmails(event.data.after.ref);
});
async function deliverResultEmail(jobRef, params) {
  const eventRef = jobRef.parent.parent;
  if (!smtpReady()) { await jobRef.update({ status: 'configuration-required' }); return; }
  const claimed = await db.runTransaction(async tx => {
    const snap = await tx.get(jobRef); const job = snap.data();
    if (!job || (job.status === 'pending' && job.nextAttemptAt > new Date().toISOString()) || job.status === 'sent' || job.status === 'failed' || (job.status === 'sending' && job.leaseUntil > new Date().toISOString())) return null;
    const attempt = Number(job.attempts || 0) + 1;
    if (attempt > 3) { tx.update(jobRef, { status: 'failed' }); return null; }
    tx.update(jobRef, { status: 'sending', attempts: attempt, leaseUntil: new Date(Date.now() + 300000).toISOString() }); return { ...job, attempts: attempt };
  });
  if (!claimed) return;
  try {
    const config = (await eventRef.get()).data().config; const result = config.finalResult;
    const owner = await getAuth().getUser(params.ownerUid); const slot = result.slots?.[0];
    const description = slot ? slot.date + (slot.time === 'day' ? ' (dia inteiro)' : ' — ' + ({ morning:'manhã', afternoon:'tarde', evening:'noite' }[slot.time] || slot.time)) : 'Não houve disponibilidade futura para definir uma data.';
    const body = ['Olá, ' + claimed.userName + '.', '', 'Resultado da reunião: ' + config.title, description, 'Fuso horário: ' + (config.timeZone || 'America/Sao_Paulo'), slot ? 'Disponibilidade: ' + slot.votes + ' de ' + result.totalVotes + ' participantes que votaram.' : '', config.meetingInstructions ? '\nOrientações: ' + config.meetingInstructions : '', '\nConfira o resultado: https://viniciusrodriguesgithub.github.io/PepperHat/consenso/syncpriv-app/#event/' + params.eventId].filter(Boolean).join('\n');
    const transporter = require('nodemailer').createTransport({ host:process.env.CONSENSO_SMTP_HOST, port:Number(process.env.CONSENSO_SMTP_PORT || 465), secure:String(process.env.CONSENSO_SMTP_PORT || 465) === '465', auth:{ user:process.env.CONSENSO_SMTP_USER, pass:smtpPassword.value() } });
    const sent = await transporter.sendMail({ from:process.env.CONSENSO_EMAIL_FROM, to:claimed.email, ...(owner.email && owner.emailVerified ? {replyTo:owner.email} : {}), subject:('Resultado do Consenso — ' + config.title).replace(/[\r\n]/g,' '), text:body, messageId:'<consenso-' + params.eventId + '-' + params.voteUid + '@' + String(process.env.CONSENSO_EMAIL_FROM).split('@').pop().replace(/[<>]/g,'') + '>' });
    await jobRef.update({ status:'sent', sentAt:new Date().toISOString(), messageId:sent.messageId });
  } catch (error) { await jobRef.update({ status:claimed.attempts >= 3 ? 'failed' : 'pending', nextAttemptAt:new Date(Date.now() + 300000).toISOString(), lastAttemptAt:new Date().toISOString() }); logger.error('Falha no envio do resultado', { code:error.code || 'send-failed', attempt:claimed.attempts }); }
}
exports.consensoDeliverResultEmail = onDocumentCreated({ ...mailOptions, document:eventPattern + '/notification_jobs/{voteUid}' }, event => deliverResultEmail(event.data.ref,event.params));
if (smtpReady()) exports.consensoRetryResultEmails = onSchedule({ ...mailOptions, schedule:'every 5 minutes', timeZone:'UTC', timeoutSeconds:120 }, async () => {
  for (const state of ['pending','configuration-required']) {
    const events = await db.collectionGroup('consenso_v1').where('config.finalized','==',true).where('config.notificationStatus','==',state).limit(50).get();
    for (const event of events.docs) await queueResultEmails(event.ref);
  }
  const pending = await db.collectionGroup('notification_jobs').where('status','==','pending').where('nextAttemptAt','<=',new Date().toISOString()).limit(50).get();
  const expired = await db.collectionGroup('notification_jobs').where('status','==','sending').where('leaseUntil','<=',new Date().toISOString()).limit(50).get();
  for (const job of [...pending.docs,...expired.docs]) { const parts=job.ref.path.split('/'); await deliverResultEmail(job.ref,{ownerUid:parts[3],eventId:parts[5],voteUid:parts[7]}); }
});

exports.consensoDeleteEvent = onCall(options, async request => {
 const ref = requireOwner(request);
 await db.recursiveDelete(ref);
 const lookup = db.doc('artifacts/pepperhatapps/public/data/consenso_lookup/' + request.data.eventId);
 const snap = await lookup.get(); if (snap.exists && snap.data().ownerUid === request.auth.uid) await lookup.delete();
 return { deleted: true };
});
