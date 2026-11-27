'use strict';
const assert = require('node:assert/strict');
const M = require('./model.js');
let count = 0;
function test(name, check) { check(); count++; console.log('PASS ' + name); }
test('fixture has two teams, three tracks, cross-team dependency and unscheduled target', () => {
  assert.equal(M.fixture.teams.length, 2); assert.equal(M.fixture.tracks.length, 3);
  const x = M.fixture.items.find(i => i.id === 'rehearsal'), before = M.fixture.items.find(i => i.id === x.dependencies[0]);
  assert.notEqual(M.fixture.tracks.find(t => t.id === x.track).team, M.fixture.tracks.find(t => t.id === before.track).team);
  assert(M.fixture.items.some(i => !i.start)); assert.deepEqual(M.validate(M.fixture.items), []);
});
test('queue preserves dates and immutable multi-item context without inventing dependencies', () => {
  const s = M.fresh(), dates = JSON.stringify(s.items), r = M.queue(s, ['rehearsal', 'images'], '<img src=x onerror=alert(1)>', 'shift');
  assert.equal(r.status, 'queued'); assert.equal(JSON.stringify(s.items), dates); assert.equal(r.context.length, 2);
  assert.deepEqual(r.context[0].dependencies, ['landing']); s.items[2].title = 'Changed'; assert.equal(r.context[0].title, 'Migration rehearsal');
});
test('reject leaves plan identical', () => { const s = M.fresh(), before = JSON.stringify(s.items), r = M.queue(s, ['rehearsal'], 'Try', 'shift'); M.simulate(s, r.id); M.reject(s, r.id); assert.equal(JSON.stringify(s.items), before); assert.equal(s.revision, 0); });
test('valid proposal needs acceptance then changes scenario only', () => {
  const s = M.fresh(), r = M.queue(s, ['rehearsal'], 'Try', 'shift'); M.simulate(s, r.id);
  assert.equal(s.items.find(x => x.id === 'rehearsal').start, '2027-02-01'); M.accept(s, r.id);
  assert.equal(s.items.find(x => x.id === 'rehearsal').start, '2027-02-08'); assert.equal(s.revision, 1); assert.equal(M.changes(s).length, 1); assert.equal(M.fixture.items[2].start, '2027-02-01');
  assert.throws(() => M.accept(s, r.id), /pending/);
});
test('dependency conflict blocks mutation and gives actionable finding', () => { const s = M.fresh(), r = M.queue(s, ['rehearsal'], 'Try', 'conflict'); M.simulate(s, r.id); assert(r.proposal.findings.some(x => x.code === 'DEPENDENCY_ORDER')); assert.throws(() => M.accept(s, r.id), /Validation/); assert.equal(s.revision, 0); });
test('concurrent proposal is stale after another acceptance', () => { const s = M.fresh(), a = M.queue(s, ['rehearsal'], 'First', 'shift'), b = M.queue(s, ['rehearsal'], 'Second', 'shift'); M.simulate(s, a.id); M.simulate(s, b.id); M.accept(s, a.id); assert.throws(() => M.accept(s, b.id), /stale/); });
test('changed selected dates cannot be overwritten at same revision', () => { const s = M.fresh(), r = M.queue(s, ['rehearsal'], 'Try', 'shift'); M.simulate(s, r.id); s.items[2].start = '2027-02-02'; assert.throws(() => M.accept(s, r.id), /record changed/); });
test('undated target produces recoverable clarification', () => { const s = M.fresh(), r = M.queue(s, ['decision-guides'], 'Try', 'shift'); M.simulate(s, r.id); assert.equal(r.status, 'needs_clarification'); M.reject(s, r.id); assert.equal(r.status, 'rejected'); });
test('saved scenario and reply lifecycle round trip', () => { const s = M.fresh(), r = M.queue(s, ['rehearsal'], 'Try', 'shift'); M.simulate(s, r.id); M.accept(s, r.id); assert.deepEqual(M.restore(JSON.stringify(s)), s); });
test('malformed and incompatible saved state is rejected', () => { for (const text of ['{', 'null', '{}', JSON.stringify({ ...M.fresh(), items: [] }), JSON.stringify({ ...M.fresh(), replies: [{}] })]) assert.throws(() => M.restore(text)); });
test('reversed dates detected', () => { const s = M.fresh(); s.items[0].start = '2027-02-20'; assert(M.validate(s.items).some(x => x.code === 'DATE_WINDOW')); });
console.log(count + ' workflow checks passed');
