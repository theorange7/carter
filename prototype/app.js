/* Browser-only prototype. No network, model, MCP or filesystem operations. */
(function () {
  'use strict';
  const M = window.CarterModel;
  const KEY = 'carter.prototype.v1';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const selected = new Set();
  let state = M.fresh(), view = 'timeline', inspected = null, storageAvailable = true;
  function notify(message) { $('notice').textContent = message; $('notice').hidden = !message; }
  function focusTestId(id, preventScroll = false) {
    const target = [...document.querySelectorAll('[data-testid]')].find(element => element.dataset.testid === id);
    if (target) target.focus({ preventScroll });
  }
  let saved = null;
  try { saved = localStorage.getItem(KEY); }
  catch (_) { storageAvailable = false; notify('Browser storage is unavailable. You can still explore; this session will not survive a reload.'); }
  if (saved) {
    try { state = M.restore(saved); }
    catch (_) { notify('Saved demo data could not be read. The fixture is shown safely. Use Reset demo to replace the damaged saved copy.'); }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; }
    catch (_) { storageAvailable = false; notify('Browser storage is unavailable or full. Changes remain usable in this session only.'); }
  }
  const track = id => M.fixture.tracks.find(t => t.id === id);
  const team = id => M.fixture.teams.find(t => t.id === id);
  const item = id => state.items.find(x => x.id === id);
  function date(value) { if (!value) return 'Unscheduled'; return new Date(value + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }); }
  const range = x => x.start ? date(x.start) + ' – ' + date(x.end) : 'Unscheduled';
  function visibleItems() {
    return state.items.filter(x => {
      const t = track(x.track), period = $('time-filter').value;
      return ($('team-filter').value === 'all' || t.team === $('team-filter').value) && ($('track-filter').value === 'all' || t.id === $('track-filter').value) && (!x.start || period === 'all' || (period === 'q1' ? x.start <= '2027-03-31' && x.end >= '2027-01-01' : x.start <= '2027-06-30' && x.end >= '2027-04-01'));
    });
  }
  function pos(d) { return Math.max(0, Math.min(100, (Date.parse(d + 'T00:00:00Z') - Date.parse('2027-01-01T00:00:00Z')) / 86400000 / 181 * 100)); }
  function barStyle(x) { const left = pos(x.start), right = pos(M.addDays(x.end, 1)); return 'left:' + left + '%;width:' + Math.max(1, right - left) + '%'; }
  function trackHeader(t, count) { return '<div class="track-heading"><div><strong>' + esc(t.name) + '</strong><small>' + esc(team(t.team).name) + ' · ' + count + ' milestone' + (count === 1 ? '' : 's') + '</small></div><button class="track-select" data-action="select-track" data-id="' + t.id + '" data-testid="select-track-' + t.id + '">Select track</button></div>'; }
  function renderRoadmap() {
    const rows = visibleItems();
    $('record-count').textContent = rows.length + ' of ' + state.items.length + ' milestones · ' + new Set(rows.map(x => x.track)).size + ' tracks';
    let html = '';
    if (!rows.length) html = '<div class="empty-filter">No milestones in this view. Try another team, track or period.</div>';
    else if (view === 'timeline') {
      html = '<div class="timeline-scroll" tabindex="0" aria-label="Scrollable roadmap timeline"><div class="timeline-inner"><div class="timeline-head"><span>TRACK / MILESTONE</span><div class="months"><span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span></div></div>';
      for (const t of M.fixture.tracks) {
        const group = rows.filter(x => x.track === t.id && x.start);
        if (!group.length) continue;
        html += trackHeader(t, group.length);
        for (const x of group) {
          const isSelected = selected.has(x.id), base = M.fixture.items.find(y => y.id === x.id), changed = x.start !== base.start || x.end !== base.end;
          html += '<div class="timeline-row" data-record="' + x.id + '"><button class="item-label ' + (isSelected ? 'is-selected' : '') + '" data-action="select" data-id="' + x.id + '" data-testid="item-' + x.id + '" aria-pressed="' + isSelected + '"><strong><span class="selection-dot"></span>' + esc(x.title) + '</strong><small>' + esc(x.commitment) + (x.dependencies.length ? ' · ' + x.dependencies.length + ' dependency' : ' · ' + esc(x.owner)) + '</small></button><div class="timeline-lane"><button class="timeline-bar ' + (isSelected ? 'is-selected' : '') + '" style="' + barStyle(x) + '" data-action="select" data-id="' + x.id + '" data-testid="bar-' + x.id + '" aria-pressed="' + isSelected + '" aria-label="Select ' + esc(x.title) + ', ' + range(x) + '">' + esc(x.commitment === 'Committed' ? '• ' : '') + esc(date(x.start)) + ' – ' + esc(date(x.end)) + '</button>' + (changed ? '<span class="baseline-bar" style="' + barStyle(base) + '" title="Baseline: ' + range(base) + '"></span>' : '') + '</div></div>';
        }
      }
      html += '</div></div>';
      const unscheduled = rows.filter(x => !x.start);
      if (unscheduled.length) html += '<div class="unscheduled"><div class="unscheduled-heading">UNSCHEDULED · NOT BOUND TO A TIME FILTER</div>' + unscheduled.map(x => '<button data-action="select" data-id="' + x.id + '" data-testid="item-' + x.id + '" aria-pressed="' + selected.has(x.id) + '"><span>–</span><span>' + esc(x.title) + '<small>' + esc(track(x.track).name) + ' · Target · no dates yet</small></span></button>').join('') + '</div>';
    } else {
      for (const t of M.fixture.tracks) {
        const group = rows.filter(x => x.track === t.id);
        if (!group.length) continue;
        html += trackHeader(t, group.length) + '<table class="list-table"><thead><tr><th scope="col">MILESTONE</th><th scope="col">WINDOW</th><th scope="col">COMMITMENT</th><th scope="col">OWNER</th></tr></thead><tbody>';
        html += group.map(x => '<tr data-record="' + x.id + '"><td><button class="' + (selected.has(x.id) ? 'is-selected' : '') + '" data-action="select" data-id="' + x.id + '" data-testid="item-' + x.id + '" aria-pressed="' + selected.has(x.id) + '">' + esc(x.title) + '</button><small>' + esc(x.status) + (x.dependencies.length ? ' · ' + x.dependencies.length + ' dependency' : '') + '</small></td><td>' + esc(range(x)) + '</td><td><span class="tag">' + esc(x.commitment) + '</span></td><td>' + esc(x.owner) + '</td></tr>').join('');
        html += '</tbody></table>';
      }
    }
    $('roadmap-content').innerHTML = html;
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('selected', b.dataset.view === view); b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
  }
  function renderDetail() {
    const x = item(inspected);
    if (!x) { $('detail').innerHTML = '<div class="empty-detail"><div class="detail-icon">↗</div><h2>Good decisions begin<br>with a little context.</h2><p>Select a milestone to see its owner,<br>delivery window and dependencies.<br>Then ask what could change.</p></div>'; return; }
    const t = track(x.track);
    $('detail').innerHTML = '<div class="detail-kicker">' + esc(t.name.toUpperCase()) + '</div><h2>' + esc(x.title) + '</h2><div class="detail-tags"><span class="tag">' + esc(x.commitment) + '</span><span class="tag">' + esc(x.status) + '</span></div><p class="detail-note">' + esc(x.note) + '</p><dl class="detail-facts"><div><dt>ACCOUNTABLE OWNER</dt><dd>' + esc(x.owner) + '</dd></div><div><dt>DELIVERY WINDOW</dt><dd>' + esc(range(x)) + '</dd></div><div><dt>TEAM</dt><dd>' + esc(team(t.team).name) + '</dd></div><div><dt>RECORD</dt><dd>' + esc(x.id) + '</dd></div></dl><div class="dependencies">' + (x.dependencies.length ? '<span class="small-label">FINISHES AFTER</span>' + x.dependencies.map(id => { const before = item(id); return '<button class="dependency-link" data-action="inspect" data-id="' + id + '" data-testid="dependency-' + id + '">After: ' + esc(before.title) + ' · ' + esc(team(track(before.track).team).name) + '</button>'; }).join('') : 'No predecessor dependencies.') + '</div>';
  }
  function renderChips() {
    $('selection-count').textContent = selected.size + ' selected';
    $('chips').innerHTML = selected.size ? [...selected].map(id => '<span class="chip">' + esc(item(id).title) + '<button data-action="remove" data-id="' + id + '" aria-label="Remove ' + esc(item(id).title) + ' from selection" data-testid="remove-' + id + '">×</button></span>').join('') : '<span class="no-selection">No references yet. Select a milestone or track.</span>';
    $('queue').disabled = !selected.size || !$('reply').value.trim() || state.replies.length >= 100;
  }
  function renderHistory() {
    $('history-count').textContent = state.replies.length;
    if (!state.replies.length) { $('history-content').innerHTML = '<div class="history-empty">Your next “what if” starts here.<br>Try the rehearsal example above.</div>'; return; }
    const labels = { queued: 'Waiting for agent', proposed: 'Proposal ready · simulated', applied: 'Applied to local scenario', rejected: 'Rejected · dates unchanged', needs_clarification: 'Needs a dated selection' };
    $('history-content').innerHTML = state.replies.map(r => {
      let body = '<article class="reply-card" data-testid="reply-' + r.id + '" tabindex="-1" aria-label="Reply ' + r.id + '"><div class="reply-status" tabindex="-1" data-testid="status-' + r.id + '">' + labels[r.status] + '</div><p class="reply-text">' + esc(r.message) + '</p><div class="reply-context">CONTEXT · ' + r.context.map(x => esc(item(x.id).title)).join(' + ') + '<br>Snapshot revision ' + r.revision + ' · selection implies no new dependency</div>';
      if (r.status === 'queued') body += '<button class="demo-button" data-action="simulate" data-id="' + r.id + '" data-testid="run-demo-' + r.id + '">+ Run demo agent <span>· simulation</span></button>';
      if (r.status === 'needs_clarification') body += '<div class="validation">This preset needs a dated milestone. Dismiss this reply, select Migration rehearsal and try again.</div><button class="text-button" data-action="reject" data-id="' + r.id + '">Dismiss reply</button>';
      if (r.proposal) {
        const p = r.proposal, stale = p.revision !== state.revision && r.status === 'proposed', blocked = p.findings.length > 0 || stale;
        body += '<div class="simulation-response" tabindex="-1" data-testid="proposal-' + r.id + '" role="region" aria-label="Simulated proposal review"><strong>Demo response</strong><br>Move <strong>' + esc(p.title) + '</strong> by ' + esc(p.days) + ' days, preserving its duration. This fixed preset demonstrates a proposal; it does not interpret your note.<br><small>Affected prototype record: ' + esc(p.item) + '. No repository file changes.</small></div><div class="proposal-dates"><div><span>BASELINE AT REQUEST</span>' + esc(range(p.before)) + '</div><div><span>PROPOSED WINDOW</span>' + esc(range(p.after)) + '</div></div>';
        if (stale) body += '<div class="validation blocked"><strong>Stale proposal · acceptance blocked</strong>The scenario advanced to revision ' + state.revision + '. Reject this proposal, reread the updated dates and queue a fresh reply.</div>';
        else if (p.findings.length) body += '<div class="validation blocked"><strong>Validation blocks this change</strong>' + p.findings.map(f => '<div><code>' + esc(f.code) + '</code> · ' + esc(f.text) + '</div>').join('') + '<br>Reject this proposal and try the +7 days preset. No dates have changed.</div>';
        else body += '<div class="validation"><strong>Checks passed · prototype subset</strong>Date windows and predecessor ordering. No capacity or full-schema checks.</div>';
        if (r.status === 'proposed') body += '<div class="proposal-actions"><button class="text-button" data-action="reject" data-id="' + r.id + '" data-testid="reject-' + r.id + '">Reject proposal</button><button class="primary-button" data-action="accept" data-id="' + r.id + '" data-testid="accept-' + r.id + '"' + (blocked ? ' disabled' : '') + '>Accept in scenario</button></div>';
      }
      return body + '</article>';
    }).join('');
  }
  function renderComparison() {
    const changes = M.changes(state);
    $('comparison-content').innerHTML = changes.length ? changes.map(c => '<div class="comparison-item"><strong>' + esc(c.after.title) + '</strong><div class="date-change">' + esc(range(c.before)) + ' → <strong>' + esc(range(c.after)) + '</strong></div><small>Same owner, commitment and dependencies · scenario revision ' + state.revision + '</small></div>').join('') : '<div class="comparison-empty">No changes yet. The scenario matches the fixture baseline.<br>Accept a valid proposal to see the difference here.</div>';
  }
  function render() { const focusedId = document.activeElement.dataset.testid; renderRoadmap(); renderDetail(); renderChips(); renderHistory(); renderComparison(); $('storage-note').textContent = storageAvailable ? 'Saved in this browser under carter.prototype.v1. Not a production inbox. Reset demo clears only this demo’s saved state.' : 'Storage unavailable. This session works, but changes will not survive reload. Not a production inbox.'; if (focusedId) focusTestId(focusedId, true); }
  function showComparison() { $('comparison').hidden = false; renderComparison(); $('comparison').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('comparison-title').focus({ preventScroll: true }); }
  for (const t of M.fixture.teams) $('team-filter').insertAdjacentHTML('beforeend', '<option value="' + t.id + '">' + esc(t.name) + '</option>');
  for (const t of M.fixture.tracks) $('track-filter').insertAdjacentHTML('beforeend', '<option value="' + t.id + '">' + esc(t.name) + '</option>');
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.dataset.view) { view = button.dataset.view; renderRoadmap(); return; }
      const action = button.dataset.action, id = button.dataset.id;
      if (action === 'select') { selected.has(id) ? selected.delete(id) : selected.add(id); inspected = id; render(); }
      if (action === 'select-track') { state.items.filter(x => x.track === id).forEach(x => selected.add(x.id)); inspected = [...selected].at(-1); render(); }
      if (action === 'remove') {
        const index = [...selected].indexOf(id);
        selected.delete(id); render();
        const remaining = [...selected];
        if (remaining.length) focusTestId('remove-' + remaining[Math.min(index, remaining.length - 1)], true);
        else $('reply').focus({ preventScroll: true });
      }
      if (action === 'inspect') { inspected = id; renderDetail(); $('detail').focus(); }
      if (action === 'simulate') { const reply = M.simulate(state, Number(id)); persist(); render(); focusTestId((reply.proposal ? 'proposal-' : 'reply-') + id); }
      if (action === 'reject') { M.reject(state, Number(id)); persist(); render(); notify('Proposal rejected. The scenario dates are unchanged.'); focusTestId('status-' + id); }
      if (action === 'accept') { M.accept(state, Number(id)); persist(); render(); $('comparison').hidden = false; notify('Accepted in your local scenario. The fixture baseline is unchanged.'); $('comparison-title').focus(); }
    } catch (error) { notify(error.message); render(); $('notice').focus(); }
  });
  ['team-filter', 'track-filter', 'time-filter'].forEach(id => $(id).addEventListener('change', renderRoadmap));
  $('reply').addEventListener('input', renderChips);
  $('queue').addEventListener('click', () => {
    try { const reply = M.queue(state, [...selected], $('reply').value, $('demo-mode').value); $('reply').value = ''; persist(); render(); notify('Reply queued. Waiting for agent — choose Run demo agent to simulate processing.'); focusTestId('run-demo-' + reply.id); }
    catch (error) { notify(error.message); }
  });
  $('example').addEventListener('click', () => { selected.clear(); selected.add('rehearsal'); inspected = 'rehearsal'; $('reply').value = 'What if we moved the migration rehearsal one week later? Show the downstream impact before changing the plan.'; $('demo-mode').value = 'shift'; render(); $('reply').focus(); });
  $('compare').addEventListener('click', showComparison); $('compare-nav').addEventListener('click', showComparison);
  $('close-compare').addEventListener('click', () => { $('comparison').hidden = true; $('compare').focus(); });
  $('reset').addEventListener('click', () => { state = M.fresh(); selected.clear(); inspected = null; $('reply').value = ''; $('demo-mode').value = 'shift'; ['team-filter', 'track-filter', 'time-filter'].forEach(id => $(id).value = 'all'); view = 'timeline'; $('comparison').hidden = true; persist(); render(); notify('Demo reset. Fictional baseline restored; replies and scenario changes cleared.'); });
  render();
}());
