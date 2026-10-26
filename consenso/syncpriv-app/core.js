(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ConsensoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pad2 = (value) => String(value).padStart(2, '0');
  const formatLocalDate = (date) => {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) throw new TypeError('Data inválida');
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  };
  const parseLocalDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const sanitizeInvitePayload = ({ config }) => {
    const { creatorAdminKey, creatorAdminEmail, ...safeConfig } = config || {};
    ['startDate', 'endDate', 'createdAt'].forEach((key) => {
      if (safeConfig[key] instanceof Date) safeConfig[key] = safeConfig[key].toISOString();
    });
    return { config: safeConfig, votes: [] };
  };
  const calculateConsensus = ({ config, votes }) => {
    if (!votes.length) return { type: 'none', slots: [], totalVotes: 0, quorum: config.quorum };
    const slotMap = new Map();
    const blockedSlots = new Set(Array.isArray(config.blockedSlots) ? config.blockedSlots : []);
    votes.forEach((vote) => {
      new Set(Array.isArray(vote.timeSlots) ? vote.timeSlots : []).forEach((slotKey) => {
      if (blockedSlots.has(slotKey) || (config.granularity === 'manual' && !(config.manualSlots || []).includes(slotKey))) return;
      const [dateStr, time] = String(slotKey).split('|');
      if (!dateStr || !time) return;
      if (!slotMap.has(slotKey)) slotMap.set(slotKey, { date: parseLocalDate(dateStr), time, votes: 0 });
      slotMap.get(slotKey).votes += 1;
      });
    });
    const ranked = (a, b) => a.date - b.date || a.time.localeCompare(b.time);
    const slots = Array.from(slotMap.values());
    const unanimous = slots.filter((slot) => slot.votes === votes.length).sort(ranked);
    if (unanimous.length) return { type: 'unanimous', slots: unanimous.slice(0, 1), totalVotes: votes.length, quorum: config.quorum };
    if (!slots.length) return { type: 'none', slots: [], totalVotes: votes.length, quorum: config.quorum };
    const maxVotes = Math.max(...slots.map((slot) => slot.votes));
    return { type: 'majority', slots: slots.filter((slot) => slot.votes === maxVotes).sort(ranked).slice(0, 2), totalVotes: votes.length, quorum: config.quorum };
  };
  const rankConsensusSlots = ({ config, votes }) => {
    const blockedSlots = new Set(Array.isArray(config && config.blockedSlots) ? config.blockedSlots : []);
    const slotMap = new Map();
    (votes || []).forEach((vote) => {
      new Set(Array.isArray(vote.timeSlots) ? vote.timeSlots : []).forEach((slotKey) => {
        if (blockedSlots.has(slotKey) || (config.granularity === 'manual' && !(config.manualSlots || []).includes(slotKey))) return;
        const [dateStr, time] = String(slotKey).split('|');
        if (!dateStr || !time) return;
        if (!slotMap.has(slotKey)) slotMap.set(slotKey, { key: slotKey, date: parseLocalDate(dateStr), time, votes: 0 });
        slotMap.get(slotKey).votes += 1;
      });
    });
    return Array.from(slotMap.values()).sort((a, b) => b.votes - a.votes || a.date - b.date || a.time.localeCompare(b.time));
  };
  const getVoteCount = ({ config, votes }) => {
    const publicCount = Number(config && config.voteCount);
    return Number.isFinite(publicCount) && publicCount >= 0 ? Math.max(publicCount, votes.length) : votes.length;
  };
  const hasReachedQuorum = (event) => getVoteCount(event) >= event.config.quorum;
  const canRevealResults = (event) => Boolean(event && event.config && event.config.finalized);
  const hasReachedEarlyRevelationThreshold = (event) => Boolean(event.config.earlyRevelation) && getVoteCount(event) >= Math.ceil(event.config.quorum * 0.5);
  const hasStrictMajority = (event) => getVoteCount(event) > Number(event.config.quorum) / 2;
  const isVotingClosed = (config, now = new Date()) => Boolean(config.finalized || config.votingClosed || (config.votingDeadline && new Date(config.votingDeadline).getTime() <= new Date(now).getTime()));
  const canOpenTally = (event) => !event.config.finalized && getVoteCount(event) > 0;
  const canChooseFinalResult = (event) => Boolean(event.config.tallyOpenedAt || event.config.finalized);
  const isValidNotificationEmail = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const zonedSlotTime = (dateStr, time, timeZone = 'America/Sao_Paulo') => {
    const hour = { morning: 6, afternoon: 12, evening: 18, day: 0 }[time];
    const clock = hour !== undefined ? [hour, 0] : String(time).split(':').map(Number);
    const parts = String(dateStr).split('-').map(Number);
    if (parts.length !== 3 || clock.length !== 2 || parts.some((n) => !Number.isFinite(n)) || clock.some((n) => !Number.isFinite(n))) return NaN;
    const target = Date.UTC(parts[0], parts[1] - 1, parts[2], clock[0], clock[1]);
    let instant = target;
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 3; i++) {
      const formatted = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
      const represented = Date.UTC(formatted.year, formatted.month - 1, formatted.day, formatted.hour, formatted.minute, formatted.second);
      instant += target - represented;
    }
    return instant;
  };
  const chooseAutomaticResult = (event, now = new Date()) => {
    const instant = new Date(now).getTime();
    const zone = event.config.timeZone || 'America/Sao_Paulo';
    const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
    const ranked = rankConsensusSlots(event).map((slot) => {
      const dateStr = slot.key.split('|')[0];
      return { ...slot, dateStr, timestamp: zonedSlotTime(dateStr, slot.time, zone) };
    }).filter((slot) => slot.time === 'day' ? slot.dateStr >= localToday : slot.timestamp >= instant)
      .sort((a, b) => b.votes - a.votes || a.timestamp - b.timestamp);
    const chosen = ranked[0];
    return {
      type: chosen ? (chosen.votes === event.votes.length ? 'unanimous' : 'majority') : 'none',
      slots: chosen ? [{ key: chosen.key, date: chosen.dateStr, time: chosen.time, votes: chosen.votes }] : [],
      totalVotes: event.votes.length, quorum: event.config.quorum,
      reason: chosen ? 'deadline' : event.votes.length ? 'no-future-availability' : 'no-votes',
    };
  };
  const getMissingVotesCount = (event) => Math.max(0, event.config.quorum - getVoteCount(event));
  const getVoteProgressPercentage = (event) => event.config.quorum > 0 ? Math.min(100, Math.round((getVoteCount(event) / event.config.quorum) * 100)) : 0;
  return { hasStrictMajority, isVotingClosed, canOpenTally, canChooseFinalResult, isValidNotificationEmail, zonedSlotTime, chooseAutomaticResult, calculateConsensus, canRevealResults, formatLocalDate, getMissingVotesCount, getVoteCount, getVoteProgressPercentage, hasReachedEarlyRevelationThreshold, hasReachedQuorum, parseLocalDate, rankConsensusSlots, sanitizeInvitePayload };
});
