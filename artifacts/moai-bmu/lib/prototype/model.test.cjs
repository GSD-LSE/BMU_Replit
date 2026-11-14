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
const T = require('./trends-model.ts');
const savedRecord = () => ({ ...M.selectBoat(M.blankRecord(), M.makeFixtures().boats[0]), status: 'Saved' });

test('full catalog and internally consistent sample states', () => {
  const state = M.makeFixtures();
  assert.equal(state.boats.length, 5);
  assert.equal(M.SPECIES.length, 44);
  assert.deepEqual(new Set(state.records.map(r => M.displayStatus(r).startsWith('Sent') ? 'Sent' : M.displayStatus(r))), new Set(['Saved', 'Needs review', 'Sent', 'Draft']));
  assert.equal(state.version, 2);
  assert.equal(state.records.filter(r => r.status === 'Needs review').length, 6);
  assert.equal(M.recordCount(0), 'No records');
  assert.equal(M.recordCount(1), '1 record');
  assert.equal(M.recordCount(4), '4 records');
  assert.equal(state.schedule.enabled, false);
});
test('only boat required; missing measurements never become zero', () => {
  const r = savedRecord();
  assert.equal(M.canSave(r), true);
  assert.equal(M.canSave({ ...r, boatId: '' }), false);
  const lines = [M.blankLine('Rabbit fish')];
  assert.equal(M.totals(lines).weight, null);
  assert.equal(M.totals(lines).value, null);
  assert.match(M.totalText(lines), /No weight or price yet/);
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
test('photo A suggests species without measures and saves uncertain rows for review', () => {
  const state = M.makeFixtures(), r = savedRecord();
  const finished = M.finishPhoto(state, { ...r, photo: { scenario: 'A', state: 'processing' } });
  assert.equal(finished.lines.length, 8);
  assert.equal(M.needsCheck(finished), 2);
  assert.ok(finished.lines.every(l => l.weight === ''));
  assert.deepEqual(finished.lines.find(l => l.speciesId === 'Parrot fish').alternatives, ['Rabbit fish', 'Scavengers']);
  assert.deepEqual(finished.lines.find(l => l.speciesId === 'Mullets').alternatives, ['Cavalla jacks', 'Barracuda']);
  assert.equal(M.blankLine('Mixed demersals').checked, true);
  assert.equal(M.canSave(finished), true);
  assert.equal(M.canSend(finished), false);
  const reviewed = { ...finished, lines: finished.lines.map(l => ({ ...l, checked: true })) };
  assert.equal(M.canSave(reviewed), true);
  assert.equal(M.canSend(reviewed), true);
  assert.equal(M.canSave({ ...r, photo: { scenario: 'B', state: 'processing' } }), true);
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
test('day prices are keyed by site, landing day, and species', () => {
  const state = M.makeFixtures();
  const old = { ...savedRecord(), id: 'old', date: new Date().toISOString(), site: 'North landing',
    lines: [{ ...M.blankLine('Rabbit fish'), price: '350' }] };
  state.records = [old];
  state.dayPrices = M.setDayPrice(state, old.site, old.date, 'Rabbit fish', '350', old.date);
  assert.equal(M.priceToday(state, 'Rabbit fish', 'old'), '350');
  assert.equal(M.dayPriceFor(state, 'Rabbit fish', '', old.date, 'North landing').price, '350');
  assert.equal(M.dayPriceFor(state, 'Rabbit fish', '', old.date, 'South landing'), undefined);
  assert.equal(M.priceToday(state, 'Mullets', 'old'), '');
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  assert.equal(M.dayPriceFor(state, 'Rabbit fish', '', yesterday, old.site), undefined);
  assert.equal(M.priceYesterday(state, 'Rabbit fish', 'old'), '');
});
test('edits require reasons, label note history and demote sent records', () => {
  const r = { ...savedRecord(), status: 'Sent', sentAt: new Date().toISOString(), lines: [{ ...M.blankLine('Rabbit fish'), weight: '14' }] };
  const working = { ...r, lines: [{ ...r.lines[0], weight: '12' }] };
  assert.throws(() => M.saveEdit(r, working, ''), /reason/);
  assert.throws(() => M.saveEdit(r, r, 'Wrong weight'), /No changes/);
  const edited = M.saveEdit(r, working, 'Wrong weight');
  assert.equal(edited.status, 'Saved');
  assert.equal(edited.history.at(-1).was, '14');
  assert.equal(edited.history.at(-1).now, '12');
  assert.equal(edited.history.at(-1).reason, 'Wrong weight');
  assert.equal(M.saveEdit({ ...savedRecord(), notes: 'Old note' }, { ...savedRecord(), notes: 'New note' }, 'Missing information').history.at(-1).field, 'Notes changed');
  assert.equal(M.saveEdit({ ...r, status: 'Saved', sentAt: r.date }, working, 'Wrong weight').status, 'Saved');
  assert.equal(M.saveEdit({ ...r, status: 'Saved', sentAt: undefined }, working, 'Wrong weight').status, 'Saved');
});
test('no-catch edits are audited, landing timestamps are consistent, and deleted records are never ready', () => {
  const state = M.makeFixtures(), record = state.records[0];
  const updated = M.saveEdit(record, { ...record, noCatch: true, lines: [] }, 'Missing information');
  assert.ok(updated.history.some(item => item.field === 'No catch' && item.now === 'Yes'));
  assert.equal(M.readyToSend({ ...record, deleted: true }), false);
  assert.ok(state.records.every(item => M.dayKey(item.date) === M.dayKey(item.timeIn)));
  const blank = M.blankRecord();
  assert.equal(M.dayKey(blank.date), M.dayKey(blank.timeIn));
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
  assert.equal(preview.eligible.length, 4);
  assert.equal(preview.excluded.length, 8);
  assert.ok(preview.eligible.every(M.readyToSend));
  state.records[0].deleted = true;
  assert.equal(M.sendPreview(state, from, to).eligible.length, 3);
});
test('one-off send is local-only; offline queue has no automatic dispatch', () => {
  const state = M.makeFixtures();
  const draft = { step: 3, period: 'Last 2 weeks', from: '', to: '', email: 'new@example.com', saveEmail: true, message: 'Demo' };
  const waiting = M.simulateSend(state, draft);
  assert.equal(waiting.attempt.state, 'Waiting to send');
  assert.ok(waiting.state.records.filter(r => waiting.attempt.recordIds.includes(r.id)).every(r => r.status === 'Waiting to send'));
  assert.ok(waiting.state.recipients.includes(draft.email));
  assert.equal(waiting.state.records.filter(r => r.sentAt).length, 1);
  const online = M.simulateSend({ ...state, settings: { ...state.settings, offline: false } }, draft);
  assert.equal(online.attempt.state, 'Sent');
  assert.ok(online.state.records.filter(r => online.attempt.recordIds.includes(r.id)).every(r => r.status === 'Sent' && !!r.lastSentAt));
  const failed = M.simulateSend({ ...state, settings: { ...state.settings, offline: false, nextSendFails: true } }, draft);
  assert.equal(failed.attempt.state, "Couldn't send");
  assert.ok(failed.state.records.filter(r => failed.attempt.recordIds.includes(r.id)).every(r => r.status === "Couldn't send"));
  assert.deepEqual(state.schedule, online.state.schedule);
  assert.throws(() => M.simulateSend(state, { ...draft, email: 'bad' }), /email/);
  assert.throws(() => M.simulateSend({ ...state, records: [] }, draft), /No records/);
});
test('pending send retry and cancellation preserve newer record states', () => {
  const state = M.makeFixtures();
  const draft = { period: 'Last 4 weeks', from: '', to: '', email: 'practice@example.com', saveEmail: false, message: '' };
  const queued = M.simulateSend({ ...state, settings: { ...state.settings, offline: true } }, draft);
  const changedId = queued.attempt.recordIds[0];
  const changed = { ...queued.state, records: queued.state.records.map(record => record.id === changedId ? { ...record, status: 'Needs review' } : record) };
  const cancelled = M.resolveSendAttempt(changed, queued.attempt.id, 'cancel');
  assert.equal(cancelled.records.find(record => record.id === changedId).status, 'Needs review');
  assert.equal(cancelled.attempts[0].state, 'Cancelled');
  const failed = M.simulateSend({ ...state, settings: { ...state.settings, offline: false, nextSendFails: true } }, draft);
  const retried = M.resolveSendAttempt(failed.state, failed.attempt.id, 'retry');
  assert.equal(retried.attempts[0].state, 'Sent');
  assert.ok(retried.records.filter(record => failed.attempt.recordIds.includes(record.id)).every(record => record.lastSentAt));
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
  await assert.rejects(storage.write({ ...initial, revision: 1, settings: { ...initial.settings, failSaves: true } }), /Local save failed/);
  assert.equal((await storage.read()).revision, 0);
  await storage.write({ ...initial, revision: 2 });
  assert.equal((await storage.read()).revision, 2);
});
test('legacy Approved prototype data loads as Saved without changing legacy storage', async () => {
  const state = M.makeFixtures();
  state.records[2].status = 'Approved';
  state.filters.statuses = ['Approved'];
  const storage = createLocalStorage({ getItem: async () => JSON.stringify(state), setItem: async () => {} });
  const loaded = await storage.read();
  assert.equal(loaded.records[2].status, 'Saved');
  assert.deepEqual(loaded.filters.statuses, []);
});
test('older local records gain site, no-catch, price-source and day-price data safely', async () => {
  const state = M.makeFixtures();
  state.version = 1;
  delete state.dayPrices;
  delete state.records[0].site;
  delete state.records[0].noCatch;
  delete state.records[0].lines[0].priceSource;
  delete state.records[0].lines[0].priceSetAt;
  const storage = createLocalStorage({ getItem: async () => JSON.stringify(state), setItem: async () => {} });
  const loaded = await storage.read();
  assert.equal(loaded.records[0].site, state.settings.site);
  assert.equal(loaded.records[0].noCatch, false);
  assert.equal(loaded.records[0].lines[0].priceSource, "today's price");
  assert.ok(loaded.records[0].lines[0].priceSetAt);
  assert.ok(loaded.dayPrices.some(p => p.site === state.settings.site && p.speciesId === loaded.records[0].lines[0].speciesId));
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
  for (const bg of [C.background, C.card]) {
    const a = lum(C.input), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    assert.ok(ratio >= 3, `Input/button border ${C.input} on ${bg}: ${ratio}`);
  }
  const dangerRatio = (Math.max(lum(C.destructiveForeground), lum(C.destructive)) + .05) / (Math.min(lum(C.destructiveForeground), lum(C.destructive)) + .05);
  assert.ok(dangerRatio >= 4.5, `Danger button text contrast: ${dangerRatio}`);
});

test('trend series preserve gaps, measured zero, and exclude Draft and Needs review records', () => {
  const base = M.makeFixtures().boats[0];
  const make = (day, weight, status = 'Saved') => {
    const date = new Date(`2024-01-${String(day).padStart(2, '0')}T12:00:00.000Z`).toISOString();
    return { ...M.selectBoat(M.blankRecord(), base), id: `trend-${day}-${status}`, date, status,
      noCatch: weight === 0, lines: weight === null ? [] : [{ ...M.blankLine('Rabbit fish'), weight: String(weight), price: '250' }] };
  };
  const records = [make(8, 0), make(15, null), make(16, 12, 'Needs review'), make(17, 18, 'Draft')];
  const series = T.calculateRecordSeries(records, 'total');
  const points = series[2024].filter(Boolean);
  assert.equal(points.length, 2);
  assert.equal(points.find(p => p.value === 0).value, 0);
  assert.equal(points.find(p => p.value === null).value, null);
  assert.equal(T.calculateRecordSeries([make(8, null)], 'total')[2024][1].value, null);
});

test('trip-hour charts use engine trips with valid times and calculate ratio of sums', () => {
  const engine = M.makeFixtures().boats[0];
  const outboard = (day, weight, hours, status = 'Saved', propulsion = 'Outboard engine') => {
    const date = new Date(`2024-02-${String(day).padStart(2, '0')}T12:00:00.000Z`).toISOString();
    const start = new Date(`2024-02-${String(day).padStart(2, '0')}T00:00:00.000Z`);
    const end = new Date(start.getTime() + hours * 3600000);
    return { ...M.selectBoat(M.blankRecord(), { ...engine, propulsion }), id: `time-${day}-${weight}`, date, status,
      timeOut: start.toISOString(), timeIn: hours === null ? '' : end.toISOString(),
      lines: weight === null ? [] : [{ ...M.blankLine('Rabbit fish'), weight: String(weight), price: '250' }] };
  };
  const records = [outboard(5, 10, 1), outboard(6, 100, 2), outboard(7, 90, null), outboard(8, 900, 1, 'Saved', 'Sail'), outboard(9, 800, 1, 'Needs review')];
  const ratio = T.calculateRecordSeries(records, 'perHour')[2024].filter(Boolean)[0];
  assert.equal(ratio.value, 110 / 3);
  assert.equal(ratio.trips, 3);
  assert.equal(ratio.missingTimes, 1);
  const hours = T.calculateRecordSeries(records, 'length')[2024].filter(Boolean)[0];
  assert.equal(hours.value, 1.5);
  assert.equal(hours.trips, 3);
});

test('weighted price is ratio of sums and year states expose only available historical years', () => {
  const boat = M.makeFixtures().boats[0];
  const make = (day, weight, price) => {
    const date = new Date(`2024-03-${String(day).padStart(2, '0')}T12:00:00.000Z`).toISOString();
    return { ...M.selectBoat(M.blankRecord(), boat), date, status: 'Saved', lines: [{ ...M.blankLine('Rabbit fish'), weight: String(weight), price: String(price) }] };
  };
  const price = T.calculateRecordSeries([make(8, 1, 100), make(9, 3, 200)], 'price')[2024].filter(Boolean)[0];
  assert.equal(price.value, 175);
  assert.deepEqual(T.trendHistoryYears('None'), [2026]);
  assert.deepEqual(T.trendHistoryYears('Some'), [2026, 2025]);
  assert.deepEqual(T.trendHistoryYears('County loaded'), [2026, 2025, 2024, 2023, 2022, 2021]);
  const state = M.makeFixtures();
  const none = T.buildTrendSeries(state, 'total', 'None');
  assert.equal(none.years.length, 1);
  assert.ok(none.series[2026].slice(0, 34).every(point => point.value === null));
  assert.ok(none.series[2026].some(point => point.week === 41 && point.value === null));
});

test('chart source snapshot omits fisher and boat identifiers and records provenance and missing data', () => {
  const state = M.makeFixtures();
  const snapshot = T.makeTrendSnapshot(state, 'total', '3 years');
  assert.equal(snapshot.years.length, 3);
  assert.equal(snapshot.synthetic, true);
  assert.ok(Object.values(snapshot.sources).every(source => source.includes('Synthetic sample')));
  assert.equal(JSON.stringify(snapshot).includes('Neema'), false);
  assert.equal(JSON.stringify(snapshot).includes('Amani'), false);
  assert.ok(snapshot.series['2026'].some(point => point.value === null));
});

test('flag send lifecycle queues offline, cancels to draft, retries locally and snapshots sent content', () => {
  const state = M.makeFixtures();
  const snapshot = T.makeTrendSnapshot(state, 'species', '3 years');
  const flag = { ...T.createFlag(state, snapshot), recipient: 'county@example.test', note: 'Catch looks lower.' };
  const waiting = T.queueFlag(flag, state);
  assert.equal(waiting.status, 'Waiting to send');
  const cancelledState = T.resolveFlag({ ...state, flags: [waiting] }, waiting.id, 'cancel');
  assert.equal(cancelledState.flags[0].status, 'Draft');
  const failState = { ...state, settings: { ...state.settings, offline: false }, trends: { ...state.trends, nextFlagFails: true }, flags: [{ ...flag }] };
  const queuedFailure = T.queueFlag(flag, failState);
  assert.equal(queuedFailure.status, "Couldn't send");
  const failedState = { ...failState, trends: { ...failState.trends, nextFlagFails: false }, flags: [queuedFailure] };
  const sentState = T.resolveFlag(failedState, flag.id, 'retry');
  const sent = sentState.flags[0];
  assert.equal(sent.status, 'Sent');
  assert.equal(sent.sentNote, 'Catch looks lower.');
  assert.equal(sent.sentTo, 'county@example.test');
  assert.deepEqual(sent.sentSnapshot, snapshot);
  const followed = T.addFlagFollowup(sent, { agreed: 'Analyse', owner: 'County team', when: 'Not known', evidence: '', outcome: 'County will analyse' });
  assert.equal(followed.status, 'Sent');
  assert.equal(followed.followup.when, 'Not known');
  assert.ok(followed.history.some(item => item.label === 'Sent'));
  const closed = T.setFlagClosed(followed, true);
  assert.ok(closed.closedAt);
  const reopened = T.setFlagClosed(closed, false);
  assert.equal(reopened.closedAt, undefined);
  assert.ok(reopened.history.some(item => item.label === 'Flag reopened'));
});

test('legacy local storage migrates trend defaults without replacing records or flags', async () => {
  const state = M.makeFixtures();
  delete state.trends;
  delete state.flags;
  state.trendReminderLog = [2, 4];
  const originalRecordIds = state.records.map(record => record.id);
  const storage = createLocalStorage({ getItem: async () => JSON.stringify(state), setItem: async () => {} });
  const migrated = await storage.read();
  assert.equal(migrated.trends.history, 'County loaded');
  assert.deepEqual(migrated.flags, []);
  assert.deepEqual(migrated.trendReminderLog, []);
  assert.deepEqual(migrated.records.map(record => record.id), originalRecordIds);
});

test('reminder history logs a shown chart once and updates its local choice', () => {
  const state = M.makeFixtures();
  const shown = T.logTrendReminder(state, 'reminder-total-3-4', 'total', '3 years', 4);
  const duplicate = T.logTrendReminder(shown, 'reminder-total-3-4', 'total', '3 years', 4);
  assert.equal(duplicate.trendReminderLog.length, 1);
  const chosen = T.logTrendReminder(duplicate, 'reminder-total-3-4', 'total', '3 years', 4, 'Not now');
  assert.equal(chosen.trendReminderLog[0].choice, 'Not now');
  assert.equal(chosen.trendReminderLog[0].runLength, 4);
});

test('month readouts use the same weighted facts as weekly ratios, not the first point or mean of ratios', () => {
  const boat = { ...M.makeFixtures().boats[0], propulsion: 'Outboard engine' };
  const make = (day, weight, hours, price) => ({ ...M.selectBoat(M.blankRecord(), boat),
    date: `2026-03-${day}T12:00:00Z`, status: 'Saved', timeOut: `2026-03-${day}T00:00:00Z`,
    timeIn: `2026-03-${day}T${String(hours).padStart(2, '0')}:00:00Z`,
    lines: [{ ...M.blankLine('Rabbit fish'), weight: String(weight), price: String(price) }] });
  const records = [make('09', 10, 1, 100), make('16', 90, 3, 300)];
  const ratio = T.calculateRecordSeries(records, 'perHour')[2026];
  assert.equal(T.summarizeTrendMonth(ratio, 2, 'perHour').value, 100 / 4);
  const price = T.calculateRecordSeries(records, 'price')[2026];
  assert.equal(T.summarizeTrendMonth(price, 2, 'price').value, 280);
  assert.equal(T.summarizeTrendMonth(price, 0, 'price').value, null);
});

test('comparison runs ignore future weeks but stop at internal gaps, and bands require distinct years', () => {
  const point = (week, value, trips = 5) => ({ week, month: 0, value, trips });
  const current = [point(1, 8), point(2, null, null), point(3, 7), point(4, 6), point(5, null, null)];
  const series = { 2026: current, 2025: current.map(p => point(p.week, 10)), 2024: current.map(p => point(p.week, 11)), 2023: current.map(p => point(p.week, 12)) };
  const comparison = T.deriveTrendComparison(series, [2026, 2025, 2024, 2023], 'total');
  assert.equal(comparison.runLength, 2);
  assert.equal(comparison.startWeek, 3);
  assert.equal(comparison.endWeek, 4);
  assert.match(comparison.text, /2 weeks in a row/);
  assert.equal(T.earlierBandForWeek(series, [2025], 2), null);
  assert.deepEqual(T.earlierBandForWeek(series, [2025, 2024, 2023], 2), { low: 10, high: 12 });
});

test('synthetic source coverage and filters never invent county breakdowns or other species histories', () => {
  const state = { ...M.makeFixtures(), records: [] };
  const loaded = T.buildTrendSeries(state, 'total', 'County loaded');
  assert.ok(loaded.series[2025].slice(0, 4).every(p => p.value !== null));
  assert.ok(loaded.series[2023].filter(p => p.month === 5 || p.month === 6).every(p => p.value === null));
  const some = T.buildTrendSeries(state, 'trips', 'Some');
  assert.ok(some.series[2025].filter(p => p.month < 7).every(p => p.value === null));
  const filtered = T.buildTrendSeries(state, 'total', 'County loaded', 'Rabbit fish', 'trip', 'All', ['GN · Gill net']);
  assert.ok(Object.values(filtered.series).flat().every(p => p.value === null));
  const otherSpecies = T.buildTrendSeries(state, 'species', 'County loaded', 'Snappers');
  assert.ok(Object.values(otherSpecies.series).flat().every(p => p.value === null));
});

test('stable local flag numbers and sent snapshots survive new flags and prohibit re-sending', () => {
  const state = { ...M.makeFixtures(), settings: { ...M.makeFixtures().settings, offline: false } };
  const first = T.createFlag(state, T.makeTrendSnapshot(state, 'total', '3 years'));
  const second = T.createFlag({ ...state, flags: [first] }, first.snapshot);
  assert.equal(first.number, 1);
  assert.equal(second.number, 2);
  const followup = T.createFlag({ ...state, flags: [second, first] }, first.snapshot, first.id);
  assert.equal(followup.note, 'Follows flag 1');
  assert.equal(M.makeFixtures().records.filter(record => record.status === 'Needs review').length, 6);
  const sent = T.queueFlag({ ...first, recipient: 'county@example.test' }, { ...state, flags: [second, first] });
  assert.equal(sent.sentCard.number, 1);
  assert.throws(() => T.patchFlag(sent, { note: 'changed' }), /read-only/);
  assert.throws(() => T.queueFlag(sent, state), /already sent/);
  assert.throws(() => T.addFlagFollowup(sent, { agreed: '', owner: '', when: '2026-02-31', evidence: '', outcome: 'Not sure yet' }), /valid date/);
});
