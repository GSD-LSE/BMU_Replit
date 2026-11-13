const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const M = require('./model.ts');
const { createLocalStorage } = require('./storage.ts');
const savedRecord = () => ({ ...M.selectBoat(M.blankRecord(), M.makeFixtures().boats[0]), status: 'Saved' });

test('full catalog and internally consistent sample states', () => {
  const state = M.makeFixtures();
  assert.equal(state.boats.length, 5);
  assert.equal(M.SPECIES.length, 44);
  assert.deepEqual(new Set(state.records.map(M.displayStatus)), new Set(['Saved', 'Needs review', 'Approved', 'Sent', 'Draft']));
  assert.equal(state.records.filter(r => r.status === 'Needs review').length, 3);
  assert.equal(state.schedule.enabled, false);
});
test('only boat required; missing measurements never become zero', () => {
  const r = savedRecord();
  assert.equal(M.canSave(r), true);
  assert.equal(M.canSave({ ...r, boatId: '' }), false);
  const lines = [M.blankLine('Rabbit fish')];
  assert.equal(M.totals(lines).weight, null);
  assert.equal(M.totals(lines).value, null);
  assert.match(M.totalText(lines), /Weight not entered/);
  const t = M.totals([{ ...lines[0], weight: '12', price: '300' }, M.blankLine('Mullets')]);
  assert.deepEqual(t, { weight: 12, value: 3600, missingWeights: 1, missingValues: 1 });
  assert.equal(M.numberValue('0'), 0);
  assert.equal(M.numberValue(''), null);
  assert.equal(M.canSave({ ...r, lines: [{ ...lines[0], weight: '-1' }] }), false);
});
test('boat snapshot is independent of later registry updates', () => {
  const state = M.makeFixtures();
  const r = M.selectBoat(M.blankRecord(), state.boats[0]);
  state.boats[0].crew = '8';
  assert.equal(r.crew, '4');
  assert.equal(r.updateBoat, false);
});
test('photo A suggests only counts/species and blocks saving two uncertain rows', () => {
  const state = M.makeFixtures(), r = savedRecord();
  const finished = M.finishPhoto(state, { ...r, photo: { scenario: 'A', state: 'processing' } });
  assert.equal(finished.lines.length, 8);
  assert.equal(M.needsCheck(finished), 2);
  assert.ok(finished.lines.every(l => l.weight === ''));
  assert.equal(M.canSave(finished), false);
  assert.equal(M.canSave({ ...finished, lines: finished.lines.map(l => ({ ...l, checked: true })) }), true);
  assert.equal(M.canSave({ ...r, photo: { scenario: 'B', state: 'processing' } }), false);
});
test('slow and late results do not replace manual values or duplicate automatically', () => {
  const state = M.makeFixtures(), manual = { ...M.blankLine('Rabbit fish'), weight: '17.5', price: '410', count: '21' };
  const finished = M.finishPhoto(state, { ...savedRecord(), lines: [manual], photo: { scenario: 'B', state: 'processing' } });
  assert.deepEqual(finished.lines, [manual]);
  assert.equal(finished.suggestions.length, 8);
  assert.equal(M.canSave(finished), true);
});
test('empty/error/cancelled photo outcomes remain manual and never infer measures', () => {
  for (const scenario of ['C', 'Error']) {
    const r = M.finishPhoto(M.makeFixtures(), { ...savedRecord(), photo: { scenario, state: 'processing' } });
    assert.equal(r.lines.length, 0);
    assert.equal(r.suggestions.length, 0);
    assert.equal(r.photo.state, scenario === 'C' ? 'empty' : 'error');
  }
  const cancelled = { ...savedRecord(), photo: { scenario: 'B', state: 'cancelled' } };
  assert.equal(M.finishPhoto(M.makeFixtures(), cancelled), cancelled);
});
test('price recall is same-day/species only, excluding deleted and this draft', () => {
  const state = M.makeFixtures();
  state.records = [{ ...savedRecord(), id: 'old', date: new Date().toISOString(), lines: [{ ...M.blankLine('Rabbit fish'), price: '350' }] }];
  assert.equal(M.priceToday(state, 'Rabbit fish'), '350');
  assert.equal(M.priceToday(state, 'Rabbit fish', 'old'), '');
  assert.equal(M.priceToday(state, 'Mullets'), '');
  state.records[0].date = new Date(Date.now() - 86400000).toISOString();
  assert.equal(M.priceToday(state, 'Rabbit fish'), '');
});
test('edits require reasons, record field history and demote Approved or Sent', () => {
  const r = { ...savedRecord(), status: 'Approved', lines: [{ ...M.blankLine('Rabbit fish'), weight: '14' }] };
  const working = { ...r, lines: [{ ...r.lines[0], weight: '12' }] };
  assert.throws(() => M.saveEdit(r, working, ''), /reason/);
  assert.throws(() => M.saveEdit(r, r, 'Wrong weight'), /No changes/);
  const edited = M.saveEdit(r, working, 'Wrong weight');
  assert.equal(edited.status, 'Needs review');
  assert.equal(edited.history.at(-1).was, '14');
  assert.equal(edited.history.at(-1).now, '12');
  assert.equal(edited.history.at(-1).reason, 'Wrong weight');
  assert.equal(M.saveEdit({ ...r, status: 'Saved', sentAt: r.date }, working, 'Wrong weight').status, 'Needs review');
  assert.equal(M.saveEdit({ ...r, status: 'Saved' }, working, 'Wrong weight').status, 'Saved');
});
test('filters persist semantics and distinguish visible Sent from Saved', () => {
  const state = M.makeFixtures();
  state.filters = { ...M.emptyFilters(), days: 'all', statuses: ['Sent'] };
  assert.equal(M.filterRecords(state).length, 1);
  state.filters.statuses = ['Saved'];
  assert.ok(M.filterRecords(state).every(r => !r.sentAt));
  state.filters = { ...M.emptyFilters(), search: 'NEEMA', species: ['Rabbit fish'] };
  assert.ok(M.filterRecords(state).every(r => r.boatName === 'Neema' && r.lines.some(l => l.speciesId === 'Rabbit fish')));
  state.records = state.records.map(r => ({ ...r, deleted: true }));
  assert.equal(M.filterRecords(state).length, 0);
});
test('periods/emails and eligible exclusions are precise', () => {
  const state = M.makeFixtures(), [from, to] = M.dateRange('Last 2 weeks');
  assert.ok(M.validRange(from, to));
  assert.equal(M.validRange('2026-02-30', '2026-03-02'), false);
  assert.equal(M.validRange(to, from), false);
  assert.equal(M.validEmail('bad@'), false);
  assert.equal(M.validEmail('name@example.com'), true);
  const preview = M.sendPreview(state, from, to);
  assert.equal(preview.eligible.length, 5);
  assert.equal(preview.excluded.length, 4);
  assert.ok(preview.eligible.every(r => ['Saved', 'Approved'].includes(r.status)));
  state.records[0].deleted = true;
  assert.equal(M.sendPreview(state, from, to).eligible.length, 4);
});
test('one-off send is local-only; offline queue has no automatic dispatch', () => {
  const state = M.makeFixtures();
  const draft = { step: 3, period: 'Last 2 weeks', from: '', to: '', email: 'new@example.com', saveEmail: true, message: 'Demo' };
  const waiting = M.simulateSend(state, draft);
  assert.equal(waiting.attempt.state, 'Waiting to send');
  assert.ok(waiting.state.recipients.includes(draft.email));
  assert.equal(waiting.state.records.filter(r => r.sentAt).length, 1);
  const online = M.simulateSend({ ...state, settings: { ...state.settings, offline: false } }, draft);
  assert.equal(online.attempt.state, 'Sent');
  assert.ok(online.state.records.filter(r => online.attempt.recordIds.includes(r.id)).every(r => !!r.sentAt));
  assert.deepEqual(state.schedule, online.state.schedule);
  assert.throws(() => M.simulateSend(state, { ...draft, email: 'bad' }), /email/);
  assert.throws(() => M.simulateSend({ ...state, records: [] }, draft), /No records/);
});
test('Undo restores edit/delete values and keeps audit history; expires at 10 seconds', () => {
  const state = M.makeFixtures(), original = state.records[0];
  const updated = M.saveEdit(original, { ...original, notes: 'Changed' }, 'Missing information');
  state.records[0] = updated;
  state.undo = { kind: 'edit', before: original, afterRevision: updated.revision, expiresAt: 10000, label: 'Changes saved.' };
  const restored = M.applyUndo(state, 9000);
  assert.equal(restored.records[0].notes, original.notes);
  assert.ok(restored.records[0].history.length > updated.history.length);
  assert.equal(M.applyUndo(state, 10000).records[0].notes, 'Changed');
  const deleted = { ...original, deleted: true, revision: original.revision + 1, history: [{ at: original.date, field: 'Deleted', was: 'No', now: 'Yes', reason: 'Duplicate' }] };
  state.records[0] = deleted;
  state.undo = { kind: 'delete', before: original, afterRevision: deleted.revision, expiresAt: 10000, label: 'Record deleted.' };
  const undoneDelete = M.applyUndo(state, 9000).records[0];
  assert.equal(!!undoneDelete.deleted, false);
  assert.equal(undoneDelete.history[0].reason, 'Duplicate');
  assert.equal(undoneDelete.history.at(-1).now, 'No');
});
test('row Undo preserves edits to other rows; editor discard can be restored', () => {
  const state = M.makeFixtures(), r = state.records[0], line = r.lines[0];
  state.records[0] = { ...r, lines: [M.blankLine('Mullets')] };
  state.undo = { kind: 'line', before: r, line, index: 0, afterRevision: 1, expiresAt: 10000, label: 'Removed.' };
  const result = M.applyUndo(state, 5000);
  assert.equal(result.records[0].lines.length, 2);
  assert.equal(result.records[0].lines[1].speciesId, 'Mullets');
  state.undo = { kind: 'discardEdit', before: r, editSession: { recordId: r.id, working: { ...r, notes: 'Still editing' }, reason: 'Other', otherReason: 'Test', section: 'Notes' }, afterRevision: 1, expiresAt: 10000, label: 'Discarded.' };
  assert.equal(M.applyUndo(state, 5000).edit.working.notes, 'Still editing');
});
test('serialized persistence round-trips all prototype state and never touches legacy storage', async () => {
  const memory = new Map([['moai-bmu-demo-v1', 'legacy untouched']]), writes = [];
  const adapter = { getItem: async k => memory.get(k) ?? null, setItem: async (k, value) => { await new Promise(r => setTimeout(r, 5)); memory.set(k, value); writes.push(JSON.parse(value).revision); } };
  const storage = createLocalStorage(adapter), state = M.makeFixtures();
  state.edit = { recordId: state.records[0].id, working: state.records[0], reason: 'Wrong weight', otherReason: '', section: 'Catch' };
  state.sendDraft = { step: 2, period: 'Last 2 weeks', from: '', to: '', email: 'a@example.com', saveEmail: true, message: '' };
  await Promise.all([storage.write({ ...state, revision: 1 }), storage.write({ ...state, revision: 2 })]);
  assert.deepEqual(writes, [1, 2]);
  const reloaded = await storage.read();
  assert.equal(reloaded.revision, 2);
  assert.equal(reloaded.edit.reason, 'Wrong weight');
  assert.equal(reloaded.sendDraft.step, 2);
  assert.deepEqual(reloaded.filters, state.filters);
  assert.equal(memory.get('moai-bmu-demo-v1'), 'legacy untouched');
  await storage.write(M.makeFixtures());
  assert.equal(memory.get('moai-bmu-demo-v1'), 'legacy untouched');
});
test('failed writes reject, keep durable state, and later retries recover', async () => {
  let raw = null;
  const storage = createLocalStorage({ getItem: async () => raw, setItem: async (_, v) => { raw = v; } });
  const initial = M.makeFixtures();
  await storage.write(initial);
  await assert.rejects(storage.write({ ...initial, revision: 1, settings: { ...initial.settings, failSaves: true } }), /failure/);
  assert.equal((await storage.read()).revision, 0);
  await storage.write({ ...initial, revision: 2 });
  assert.equal((await storage.read()).revision, 2);
});
test('prototype UI and state have no delivery, model, share, network or background-task calls', () => {
  const base = path.resolve(__dirname, '../../components/prototype');
  const files = [...fs.readdirSync(base).map(n => path.join(base, n)), ...['store.tsx', 'storage.ts', 'model.ts'].map(n => path.join(__dirname, n))];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /\bfetch\s*\(|XMLHttpRequest|axios|expo-sharing|expo-network|ai-service|api-client-react|expo-task-manager|expo-background|mailto:|navigator\.share/);
  }
  assert.match(fs.readFileSync(path.resolve(__dirname, '../../app/(tabs)/index.tsx'), 'utf8'), /prototype\/PrototypeApp/);
});
test('text/token contrast meets 4.5:1 for normal, muted and status text', () => {
  const C = require('../../constants/colors.ts').default.light;
  const lum = hex => {
    const channels = hex.replace('#', '').match(/../g).map(c => parseInt(c, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  for (const [fg, bg] of [[C.foreground, C.background], [C.foreground, C.card], [C.mutedForeground, C.background], [C.mutedForeground, C.card], [C.primaryForeground, C.primary], [C.warning, C.paleWarning], [C.processing, C.processingSoft], [C.destructive, C.dangerSoft], [C.primary, C.card]]) {
    const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio}`);
  }
});
