(function (root) {
  'use strict';
  const DAY = 86400000;
  const copy = value => JSON.parse(JSON.stringify(value));
  const fixture = {
    teams: [{ id: 'platform', name: 'Platform Engineering' }, { id: 'enablement', name: 'Agency Enablement' }],
    tracks: [
      { id: 'foundations', team: 'platform', name: 'Cloud foundations', description: 'A dependable starting point for every agency.', owner: 'Maya Chen' },
      { id: 'migration', team: 'enablement', name: 'Migration programme', description: 'Move with confidence, one rehearsed wave at a time.', owner: 'Alex Morgan' },
      { id: 'library', team: 'enablement', name: 'Decision library', description: 'Turn field experience into reusable guidance.', owner: 'Sam Rivera' }
    ],
    items: [
      { id: 'landing', track: 'foundations', title: 'Landing zone ready', owner: 'Maya Chen', status: 'In progress', commitment: 'Committed', start: '2027-01-04', end: '2027-01-22', dependencies: [], note: 'Establish the shared network and account baseline for the first migration rehearsal.' },
      { id: 'images', track: 'foundations', title: 'Standard images refresh', owner: 'Noah Patel', status: 'Planned', commitment: 'Target', start: '2027-02-08', end: '2027-03-05', dependencies: [], note: 'Refresh and verify the standard build images against the agreed baseline.' },
      { id: 'rehearsal', track: 'migration', title: 'Migration rehearsal', owner: 'Alex Morgan', status: 'Planned', commitment: 'Committed', start: '2027-02-01', end: '2027-02-19', dependencies: ['landing'], note: 'Rehearse with three fictional test accounts before committing to the first agency wave.' },
      { id: 'wave-one', track: 'migration', title: 'First agency wave', owner: 'Jordan Lee', status: 'Planned', commitment: 'Target', start: '2027-03-08', end: '2027-03-26', dependencies: ['rehearsal'], note: 'The rehearsal must finish before this wave starts. This is a cross-track dependency.' },
      { id: 'wave-two', track: 'migration', title: 'Second agency wave', owner: 'Jordan Lee', status: 'Planned', commitment: 'Target', start: '2027-04-12', end: '2027-04-30', dependencies: ['wave-one'], note: 'A later wave, deliberately outside the Q1 filter.' },
      { id: 'field-notes', track: 'library', title: 'Publish first field notes', owner: 'Sam Rivera', status: 'In progress', commitment: 'Target', start: '2027-01-18', end: '2027-02-05', dependencies: [], note: 'Create a small, reviewed set of lessons from current engagements.' },
      { id: 'decision-guides', track: 'library', title: 'Agency decision guides', owner: 'Sam Rivera', status: 'Exploring', commitment: 'Target', start: null, end: null, dependencies: ['field-notes'], note: 'An unscheduled target. Agree the audience and first decision before adding dates.' }
    ]
  };
  const baseline = () => copy(fixture.items);
  const fresh = () => ({ version: 1, scenario: 'Rehearsal + one week', revision: 0, items: baseline(), replies: [], nextId: 1 });
  function addDays(date, days) { return new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10); }
  function validate(items) {
    const findings = [];
    for (const item of items) {
      if (Boolean(item.start) !== Boolean(item.end) || (item.start && item.start > item.end)) findings.push({ code: 'DATE_WINDOW', item: item.id, text: item.title + ': the start must be on or before the end, with both dates supplied.' });
      for (const id of item.dependencies) {
        const before = items.find(x => x.id === id);
        if (!before) findings.push({ code: 'UNKNOWN_DEPENDENCY', item: item.id, text: item.title + ': a predecessor is missing.' });
        else if (before.end && item.start && before.end >= item.start) findings.push({ code: 'DEPENDENCY_ORDER', item: item.id, text: item.title + ' must start after ' + before.title + ' finishes (' + before.end + ').' });
      }
    }
    return findings;
  }
  function queue(state, ids, message, mode) {
    if (!message.trim() || !ids.length) throw new Error('Select an item and write a reply first.');
    const selected = ids.map(id => state.items.find(x => x.id === id));
    if (selected.some(x => !x)) throw new Error('Selection changed. Select the items again.');
    const reply = { id: state.nextId++, message: message.trim(), mode: mode === 'conflict' ? 'conflict' : 'shift', status: 'queued', revision: state.revision, context: copy(selected), createdAt: new Date().toISOString(), proposal: null };
    state.replies.unshift(reply); return reply;
  }
  function simulate(state, id) {
    const reply = state.replies.find(x => x.id === id);
    if (!reply || reply.status !== 'queued') throw new Error('This reply is no longer waiting.');
    const item = reply.context.find(x => x.start && x.end);
    if (!item) { reply.status = 'needs_clarification'; return reply; }
    const days = reply.mode === 'conflict' ? 35 : 7;
    const after = { start: addDays(item.start, days), end: addDays(item.end, days) };
    const proposed = copy(state.items).map(x => x.id === item.id ? { ...x, ...after } : x);
    reply.proposal = { item: item.id, title: item.title, before: { start: item.start, end: item.end }, after, revision: reply.revision, days, findings: validate(proposed) };
    reply.status = 'proposed'; return reply;
  }
  function accept(state, id) {
    const reply = state.replies.find(x => x.id === id);
    if (!reply || reply.status !== 'proposed' || !reply.proposal) throw new Error('There is no pending proposal.');
    const p = reply.proposal;
    if (p.revision !== state.revision) throw new Error('This proposal is stale. Reject it, reread the roadmap and queue a fresh reply.');
    const item = state.items.find(x => x.id === p.item);
    if (!item || item.start !== p.before.start || item.end !== p.before.end) throw new Error('The selected record changed. Queue a fresh reply.');
    const next = state.items.map(x => x.id === p.item ? { ...x, ...p.after } : x);
    if (validate(next).length) throw new Error('Validation blocks this change. Reject it and try the one-week example.');
    state.items = next; state.revision++; reply.status = 'applied'; return reply;
  }
  function reject(state, id) {
    const reply = state.replies.find(x => x.id === id);
    if (!reply || !['proposed', 'needs_clarification', 'queued'].includes(reply.status)) throw new Error('This reply is already complete.');
    reply.status = 'rejected';
  }
  function changes(state) { return state.items.filter(item => { const original = fixture.items.find(x => x.id === item.id); return item.start !== original.start || item.end !== original.end; }).map(item => ({ before: fixture.items.find(x => x.id === item.id), after: item })); }
  function restore(text) {
    const state = JSON.parse(text);
    if (!state || state.version !== 1 || state.scenario !== fresh().scenario || !Number.isSafeInteger(state.revision) || state.revision < 0 || !Number.isSafeInteger(state.nextId) || state.nextId < 1 || !Array.isArray(state.items) || state.items.length !== fixture.items.length || !Array.isArray(state.replies) || state.replies.length > 100) throw new Error('Unsupported saved demo');
    const date = x => x === null || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)));
    const ids = new Set();
    for (const item of state.items) {
      const original = fixture.items.find(x => x.id === item.id);
      if (!original || ids.has(item.id) || !date(item.start) || !date(item.end)) throw new Error('Invalid saved roadmap');
      ids.add(item.id);
      for (const key of ['track', 'title', 'owner', 'status', 'commitment', 'dependencies', 'note']) if (JSON.stringify(item[key]) !== JSON.stringify(original[key])) throw new Error('Invalid saved record');
    }
    const replyIds = new Set();
    for (const reply of state.replies) {
      if (!Number.isSafeInteger(reply.id) || reply.id < 1 || reply.id >= state.nextId || replyIds.has(reply.id) || typeof reply.message !== 'string' || !['queued', 'proposed', 'applied', 'rejected', 'needs_clarification'].includes(reply.status) || !Number.isSafeInteger(reply.revision) || reply.revision < 0 || reply.revision > state.revision || !['shift', 'conflict'].includes(reply.mode) || !Array.isArray(reply.context) || !reply.context.length || reply.context.some(x => !x || !ids.has(x.id) || !date(x.start) || !date(x.end))) throw new Error('Invalid saved reply');
      replyIds.add(reply.id);
      if (reply.proposal) {
        const p = reply.proposal;
        if (!ids.has(p.item) || typeof p.title !== 'string' || !p.before || !p.after || !date(p.before.start) || !date(p.before.end) || !date(p.after.start) || !date(p.after.end) || !p.after.start || !p.after.end || !Number.isSafeInteger(p.revision) || !Array.isArray(p.findings) || p.findings.some(x => !x || typeof x.code !== 'string' || typeof x.text !== 'string' || !ids.has(x.item))) throw new Error('Invalid saved proposal');
      } else if (['proposed', 'applied'].includes(reply.status)) throw new Error('Missing saved proposal');
    }
    if (validate(state.items).length) throw new Error('Invalid saved dates');
    return state;
  }
  const api = { fixture, fresh, copy, addDays, validate, queue, simulate, accept, reject, changes, restore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CarterModel = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
