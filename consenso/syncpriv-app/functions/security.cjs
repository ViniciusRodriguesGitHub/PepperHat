'use strict';
const eventPath = /^artifacts\/pepperhatapps\/users\/([a-zA-Z0-9_-]{1,128})\/consenso_v1\/([a-zA-Z0-9_-]{1,128})$/;
function eventIdentity(path) {
  const match = eventPath.exec(String(path || ''));
  return match ? { ownerUid: match[1], eventId: match[2] } : null;
}
function jobIdentity(path) {
  const parts = String(path || '').split('/');
  if (parts.length !== 8 || parts[6] !== 'notification_jobs' || !/^[a-zA-Z0-9_-]{1,128}$/.test(parts[7])) return null;
  const identity = eventIdentity(parts.slice(0,6).join('/'));
  return identity ? { ...identity, voteUid: parts[7] } : null;
}
function calendarDate(value, timeZone) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function validSlot(config, slot) {
  if (typeof slot !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2})\|(day|morning|afternoon|evening|(?:[01]\d|2[0-3]):[0-5]\d)$/.exec(slot);
  if (!match) return false;
  const date = new Date(match[1]+'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==match[1]) return false;
  if (config.granularity === 'manual') return Array.isArray(config.manualSlots) && config.manualSlots.includes(slot) && /^\d{2}:\d{2}$/.test(match[2]);
  if ((config.blockedSlots || []).includes(slot)) return false;
  if (config.granularity && !({day:['day'],shift:['morning','afternoon','evening'],hour:['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']}[config.granularity] || []).includes(match[2])) return false;
  try {
    const zone = config.timeZone || 'America/Sao_Paulo';
    if (config.startDate && match[1] < calendarDate(config.startDate,zone)) return false;
    if (config.endDate && match[1] > calendarDate(config.endDate,zone)) return false;
  } catch { return false; }
  return true;
}
module.exports = { eventIdentity, jobIdentity, validSlot };
