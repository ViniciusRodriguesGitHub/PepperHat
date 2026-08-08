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
      if (blockedSlots.has(slotKey)) return;
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
        if (blockedSlots.has(slotKey)) return;
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
  const getMissingVotesCount = (event) => Math.max(0, event.config.quorum - getVoteCount(event));
  const getVoteProgressPercentage = (event) => event.config.quorum > 0 ? Math.min(100, Math.round((getVoteCount(event) / event.config.quorum) * 100)) : 0;
  return { calculateConsensus, canRevealResults, formatLocalDate, getMissingVotesCount, getVoteCount, getVoteProgressPercentage, hasReachedEarlyRevelationThreshold, hasReachedQuorum, parseLocalDate, rankConsensusSlots, sanitizeInvitePayload };
});
