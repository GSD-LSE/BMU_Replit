// Deliberately independent of the legacy landing, AI and sync contracts.
export const PROTOTYPE_KEY = 'moai-bmu-scenarios-v1';
export const SPECIES = [
  ['Demersal', 'Rabbit fish', 'Tafi'], ['Demersal', 'Scavengers', 'Changu/Tangu'],
  ['Demersal', 'Snappers', 'Kiunga'], ['Demersal', 'Parrot fish', 'Pono/Mwera/Parati'],
  ['Demersal', 'Surgeon fish', 'Kangaja'], ['Demersal', 'Unicorn fish', 'Puju'],
  ['Demersal', 'Grunters', 'Pamamba'], ['Demersal', 'Pouter', 'Chaa'],
  ['Demersal', 'Black skin', 'Fute/Kufi'], ['Demersal', 'Goat fish', 'Mkundaji'],
  ['Demersal', 'Streaker', 'Mshigashawe'], ['Demersal', 'Rock cod', 'Tewa'],
  ['Demersal', 'Cat fish', 'Fumme'], ['Demersal', 'Mixed demersals', 'Fulusi n.k.'],
  ['Pelagic', 'Cavalla jacks', 'Kolekole/Kandoizi'], ['Pelagic', 'Mullets', 'Mkizi'],
  ['Pelagic', 'Little mackerel', 'Una/Mbono'], ['Pelagic', 'Barracuda', 'Mzio'],
  ['Pelagic', 'Milk fish', 'Mwatiko/Mborode'], ['Pelagic', 'King fish', 'Nguru'],
  ['Pelagic', 'Queen fish', 'Pandu'], ['Pelagic', 'Sail fish', 'Sulisuli'],
  ['Pelagic', 'Blue marlin', 'Nduoro'], ['Pelagic', 'Black marlin', ''],
  ['Pelagic', 'Striped marlin', ''], ['Pelagic', 'Bonito', 'Sheruwe'],
  ['Pelagic', 'Dolphin fish', ''], ['Pelagic', 'Wahoo', ''], ['Pelagic', 'Skipjack tuna', ''],
  ['Pelagic', 'Yellowfin tuna', ''], ['Pelagic', 'Bigeye tuna', 'Jodari'],
  ['Pelagic', 'Other tunas', ''], ['Pelagic', 'Other pelagics', ''],
  ['Pelagic', 'Sharks', 'Papa'], ['Pelagic', 'Rays', 'Taa'], ['Pelagic', 'Sardines', 'Simu simu'],
  ['Other invertebrates', 'Holothurians', ''], ['Other invertebrates', 'Oysters', 'Mashaza'],
  ['Other invertebrates', 'Beche-de-mer', 'Jongoo'], ['Other invertebrates', 'Octopus', 'Pweza'],
  ['Other invertebrates', 'Squids', 'Ngisi'], ['Crustaceans', 'Lobsters', 'Kamba mawe'],
  ['Crustaceans', 'Prawns', 'Kamba'], ['Crustaceans', 'Crabs', 'Kaa'],
].map(([group, common, local]) => ({ id: common, group, common, local }));
export const VESSELS = ['Ngalawa', 'Mtumbwi', 'Mashua', 'Hori', 'Dau', 'Other'];
export const PROPULSIONS = ['Paddle', 'Sail', 'Paddle and sail', 'Outboard engine', 'Inboard engine'];
export const GEARS = [
  'GN · Gill net', 'BT · Basket trap', 'DL · Dropline', 'LL · Longline', 'SG · Speargun',
  'HL · Handline', 'BS · Beach seine', 'RN · Ring net', 'SN · Scoop net',
  'MF · Monofilament', 'RS · Reef seine', 'CN · Cast net', 'TL · Trolling line', 'OT · Other',
];
export type Status = 'Draft' | 'Needs review' | 'Saved' | 'Waiting to send' | "Couldn't send" | 'Sent';
export type Boat = { id: string; name: string; vesselType: string; propulsion: string; horsepower: string; length: string; registration: string; crew: string; archived?: boolean };
export type Fisher = { id: string; name: string; boatIds: string[]; archived?: boolean };
export type PriceSource = "typed here" | "today's price" | 'changed here';
export type CatchLine = { id: string; speciesId: string; count: string; weight: string; price: string; remarks: string; checked: boolean; origin: 'manual' | 'photo'; alternatives?: string[]; priceSource?: PriceSource; priceSetAt?: string };
export type DayPrice = { site: string; date: string; speciesId: string; price: string; setAt: string };
export type Photo = { scenario: 'A' | 'B' | 'C' | 'Error'; state: 'preview' | 'processing' | 'ready' | 'empty' | 'error' | 'cancelled'; startedAt?: number; dueAt?: number };
export type History = { at: string; field: string; was: string; now: string; reason: string };
export type CatchRecord = {
  id: string; date: string; site: string; boatId: string; boatName: string; fisherId: string;
  vesselType: string; propulsion: string; horsepower: string; length: string; registration: string;
  crew: string; gear: string; gearCount: string; mesh: string; hookSize: string; hooks: string;
  area: string; timeOut: string; timeIn: string; fad: string; fadType: string;
  lines: CatchLine[]; suggestions: CatchLine[]; notes: string; noCatch: boolean; photo?: Photo;
  status: Status; step: number; updateBoat: boolean; history: History[];
  deleted?: boolean; sentAt?: string; lastSentAt?: string; sentTo?: string; revision: number; editedAt?: string;
};
export type Filters = { days: string; from: string; to: string; boatId: string; fisherId: string; statuses: string[]; species: string[]; search: string };
export type SendDraft = { step: number; period: string; from: string; to: string; email: string; saveEmail: boolean; message: string; includeSent?: boolean; noteOpen?: boolean; periodOpen?: boolean };
export type Attempt = { id: string; at: string; from: string; to: string; email: string; message: string; recordIds: string[]; state: 'Sent' | 'Waiting to send' | "Couldn't send" | 'Cancelled'; includeSent?: boolean; automatic?: boolean };
export type Schedule = { enabled: boolean; frequency: string; weeks: string; email: string; firstDate: string };
export type EditSession = { recordId: string; working: CatchRecord; reason: string; otherReason: string; section: string };
export type Undo = { kind: 'line' | 'edit' | 'delete' | 'discard' | 'discardEdit'; target?: 'edit'; editSession?: EditSession; before: CatchRecord; line?: CatchLine; index?: number; afterRevision: number; expiresAt: number; label: string };
export type PrototypeState = {
  version: 2; records: CatchRecord[]; boats: Boat[]; fishers: Fisher[]; recipients: string[]; dayPrices: DayPrice[];
  settings: { collector: string; county: string; site: string; offline: boolean; failSaves: boolean; nextPhoto: 'A' | 'B' | 'C' | 'Error'; nextSendFails?: boolean; introSeen?: boolean };
  filters: Filters; schedule: Schedule; attempts: Attempt[]; sendDraft?: SendDraft; edit?: EditSession;
  undo?: Undo; banner?: { text: string; recordId: string }; revision: number;
};
export const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const dayKey = (value: string | number | Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const dayLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value));
export const shortDayLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' }).format(new Date(value));
export const timeLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
export const localTime = () => new Date().toISOString();
export function numberValue(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
export const speciesName = (speciesId: string) => {
  const s = SPECIES.find(s => s.id === speciesId);
  return s ? `${s.common}${s.local ? ` (${s.local})` : ''}` : speciesId;
};
export const emptyFilters = (): Filters => ({ days: '7', from: '', to: '', boatId: '', fisherId: '', statuses: [], species: [], search: '' });
export const recordCount = (count: number) => count === 0 ? 'No records' : count === 1 ? '1 record' : `${count} records`;
export const blankLine = (speciesId: string, price = '', priceSetAt?: string): CatchLine => ({
  id: id('catch'), speciesId, count: '', weight: '', price, remarks: '', checked: true, origin: 'manual',
  ...(price ? { priceSource: "today's price" as const, priceSetAt } : {}),
});
export function blankRecord(site = 'Msambweni Landing Site'): CatchRecord {
  return { id: id('record'), date: new Date().toISOString(), site, boatId: '', boatName: '', fisherId: '',
    vesselType: '', propulsion: '', horsepower: '', length: '', registration: '', crew: '', gear: '', gearCount: '',
    mesh: '', hookSize: '', hooks: '', area: '', timeOut: '', timeIn: localTime(), fad: '', fadType: '',
    lines: [], suggestions: [], notes: '', noCatch: false, status: 'Draft', step: 1, updateBoat: false, history: [], revision: 0 };
}
export function selectBoat(record: CatchRecord, boat: Boat): CatchRecord {
  return { ...record, boatId: boat.id, boatName: boat.name, vesselType: boat.vesselType, propulsion: boat.propulsion,
    horsepower: boat.horsepower, length: boat.length, registration: boat.registration, crew: boat.crew, updateBoat: false };
}
export function totals(lines: CatchLine[]) {
  const weights = lines.map(l => numberValue(l.weight));
  const values = lines.map(l => {
    const w = numberValue(l.weight), p = numberValue(l.price);
    return w === null || p === null ? null : w * p;
  });
  return { weight: weights.some(v => v !== null) ? weights.reduce<number>((a, v) => a + (v ?? 0), 0) : null,
    value: values.some(v => v !== null) ? values.reduce<number>((a, v) => a + (v ?? 0), 0) : null,
    missingWeights: weights.filter(v => v === null).length, missingValues: values.filter(v => v === null).length };
}
export function totalText(lines: CatchLine[]) {
  const t = totals(lines);
  if (t.weight === null && t.value === null) return 'No weight or price yet';
  const weight = t.weight === null ? 'No weight yet' : `${t.weight.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg${t.missingWeights ? ` (${t.missingWeights} without weight)` : ''}`;
  const value = t.value === null ? 'No price yet' : `Ksh ${t.value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}${t.missingValues ? ` (${t.missingValues} incomplete)` : ''}`;
  return `${weight} · ${value}`;
}
export const needsCheck = (r: CatchRecord) => r.lines.filter(l => !l.checked).length;
export const canSave = (r: CatchRecord) => !!r.boatId && validNumbers(r);
export const canSend = (r: CatchRecord) => canSave(r) && needsCheck(r) === 0 && r.photo?.state !== 'processing';
export function validNumbers(r: CatchRecord) {
  return [r.horsepower, r.length, r.crew, r.gearCount, r.mesh, r.hooks, ...r.lines.flatMap(l => [l.count, l.weight, l.price])]
    .every(v => !v.trim() || numberValue(v) !== null);
}
export const displayStatus = (r: CatchRecord) => r.photo?.state === 'processing' ? 'Processing'
  : r.status === 'Sent' ? `Sent${r.lastSentAt || r.sentAt ? ` ${shortDayLabel(r.lastSentAt || r.sentAt!)}` : ''}` : r.status;
export function dayPriceFor(state: PrototypeState, speciesId: string, recordId = '', date?: string, site?: string) {
  const record = state.records.find(r => r.id === recordId);
  const targetDate = dayKey(date ?? record?.date ?? new Date());
  const targetSite = site ?? record?.site ?? state.settings.site;
  return state.dayPrices?.find(item => item.site === targetSite && item.date === targetDate && item.speciesId === speciesId
    && numberValue(item.price) !== null);
}
export const priceToday = (state: PrototypeState, speciesId: string, recordId = '') =>
  dayPriceFor(state, speciesId, recordId)?.price ?? '';
export const priceYesterday = (state: PrototypeState, speciesId: string, recordId = '') => {
  const record = state.records.find(r => r.id === recordId);
  const [year, month, date] = dayKey(record?.date ?? new Date()).split('-').map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, date - 1, 12));
  return dayPriceFor(state, speciesId, '', yesterday.toISOString(), record?.site)?.price ?? '';
};
export function setDayPrice(state: PrototypeState, site: string, date: string, speciesId: string, price: string, setAt = new Date().toISOString()) {
  const day = dayKey(date);
  return [...(state.dayPrices ?? []).filter(item => !(item.site === site && item.date === day && item.speciesId === speciesId)),
    { site, date: day, speciesId, price, setAt }];
}
export function photoLines(state: PrototypeState, recordId: string): CatchLine[] {
  return [
    ['Rabbit fish', '12'], ['Scavengers', '8'], ['Snappers', '5'], ['Parrot fish', '4'],
    ['Octopus', '2'], ['Mullets', '10'], ['Goat fish', '3'], ['Barracuda', '1'],
  ].map(([speciesId, count]) => {
    const daily = dayPriceFor(state, speciesId, recordId);
    const checked = !['Parrot fish', 'Mullets'].includes(speciesId);
    return { ...blankLine(speciesId, daily?.price ?? '', daily?.setAt), count,
      ...(checked ? {} : { alternatives: speciesId === 'Parrot fish' ? ['Rabbit fish', 'Scavengers'] : ['Cavalla jacks', 'Barracuda'] }),
      checked, origin: 'photo' as const };
  });
}
export function finishPhoto(state: PrototypeState, r: CatchRecord): CatchRecord {
  if (r.photo?.state !== 'processing') return r;
  const nextPhoto: Photo = { ...r.photo, state: r.photo.scenario === 'C' ? 'empty' : r.photo.scenario === 'Error' ? 'error' : 'ready' };
  if (nextPhoto.state !== 'ready') return { ...r, photo: nextPhoto, revision: r.revision + 1 };
  const results = photoLines(state, r.id);
  // Typed entries always win; late results have to be explicitly added.
  return { ...r, photo: nextPhoto, ...(r.lines.length ? { suggestions: results } : { lines: results }),
    revision: r.revision + 1 };
}
export const recordFields = ['boatId', 'boatName', 'fisherId', 'vesselType', 'propulsion', 'horsepower', 'length', 'registration', 'crew', 'gear', 'gearCount', 'mesh', 'hookSize', 'hooks', 'area', 'timeOut', 'timeIn', 'fad', 'fadType', 'notes'] as const;
export function differences(original: CatchRecord, changed: CatchRecord): Omit<History, 'at' | 'reason'>[] {
  const changes: Omit<History, 'at' | 'reason'>[] = [];
  for (const key of recordFields) if (original[key] !== changed[key]) changes.push({ field: key === 'notes' ? 'Notes changed' : key, was: original[key] || 'No value yet', now: changed[key] || 'No value yet' });
  if (!!original.noCatch !== !!changed.noCatch) changes.push({ field: 'No catch', was: original.noCatch ? 'Yes' : 'No', now: changed.noCatch ? 'Yes' : 'No' });
  const ids = [...new Set([...original.lines, ...changed.lines].map(l => l.id))];
  for (const lineId of ids) {
    const before = original.lines.find(l => l.id === lineId), after = changed.lines.find(l => l.id === lineId);
    if (!before || !after) changes.push({ field: `Catch · ${speciesName((before ?? after)!.speciesId)}`, was: before ? JSON.stringify(before) : 'No value yet', now: after ? JSON.stringify(after) : 'Removed' });
    else for (const key of ['speciesId', 'count', 'weight', 'price', 'remarks', 'checked'] as const) {
      if (before[key] !== after[key]) changes.push({ field: `${speciesName(before.speciesId)} · ${key}`, was: String(before[key] === '' ? 'No value yet' : before[key]), now: String(after[key] === '' ? 'No value yet' : after[key]) });
    }
  }
  return changes;
}
export function saveEdit(original: CatchRecord, working: CatchRecord, reason: string): CatchRecord {
  if (!reason.trim()) throw new Error('Choose a reason for change.');
  const changes = differences(original, working);
  if (!changes.length) throw new Error('No changes to save.');
  if (!working.boatId || !validNumbers(working)) throw new Error('Choose a boat and check the numeric fields.');
  const at = new Date().toISOString();
  const needsReview = !canSave(working) || needsCheck(working) > 0 || working.photo?.state === 'processing';
  return { ...working, status: needsReview ? 'Needs review' : original.status === 'Sent' || original.status === 'Needs review' || !!original.sentAt ? 'Saved' : original.status,
    editedAt: at, revision: original.revision + 1, history: [...original.history, ...changes.map(c => ({ ...c, at, reason }))] };
}
export function filterRecords(state: PrototypeState, filters = state.filters): CatchRecord[] {
  const today = dayKey(), from = filters.days === 'custom' ? filters.from : filters.days === 'all' ? '' : filters.days === 'yesterday'
    ? dayKey(Date.now() - 86400000) : dayKey(Date.now() - (Number(filters.days || 7) - 1) * 86400000);
  const to = filters.days === 'custom' ? filters.to : filters.days === 'yesterday' ? from : today;
  return state.records.filter(r => {
    const day = dayKey(r.date), fisher = state.fishers.find(f => f.id === r.fisherId)?.name ?? '';
    return !r.deleted && (!from || day >= from) && (!to || day <= to) &&
      (!filters.boatId || r.boatId === filters.boatId) && (!filters.fisherId || r.fisherId === filters.fisherId) &&
      (!filters.statuses.length || filters.statuses.some(status => status === 'Sent' ? displayStatus(r).startsWith('Sent') : status === (displayStatus(r) === 'Processing' ? r.status : displayStatus(r)))) &&
      (!filters.species.length || r.lines.some(l => filters.species.includes(l.speciesId))) &&
      `${r.boatName} ${fisher}`.toLowerCase().includes(filters.search.toLowerCase().trim());
  }).sort((a, b) => b.date.localeCompare(a.date));
}
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function dateRange(period: string, from = '', to = '', now = new Date()): [string, string] {
  if (period === 'Custom range') return [from, to];
  if (period === 'Last month') {
    const today = dayKey(now), [y, m] = today.split('-').map(Number);
    return [dayKey(new Date(Date.UTC(y, m - 2, 1, 12))), dayKey(new Date(Date.UTC(y, m - 1, 0, 12)))];
  }
  return [dayKey(now.getTime() - (period === 'Last 4 weeks' ? 27 : 13) * 86400000), dayKey(now)];
}
export const validRange = (from: string, to: string) => /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to)) && from <= to && new Date(from).toISOString().slice(0, 10) === from && new Date(to).toISOString().slice(0, 10) === to;
export function readyToSend(r: CatchRecord) {
  return !r.deleted && r.status === 'Saved' && canSend(r) && (!r.lastSentAt || (!!r.editedAt && r.editedAt > r.lastSentAt));
}
export function sendPreview(state: PrototypeState, from: string, to: string, includeSent = false) {
  const inPeriod = state.records.filter(r => !r.deleted && dayKey(r.date) >= from && dayKey(r.date) <= to);
  return { eligible: inPeriod.filter(r => readyToSend(r) || (includeSent && r.status === 'Sent' && canSend(r))),
    excluded: inPeriod.filter(r => !readyToSend(r) && !(includeSent && r.status === 'Sent' && canSend(r))) };
}
export function simulateSend(state: PrototypeState, draft: SendDraft): { state: PrototypeState; attempt: Attempt } {
  const [from, to] = dateRange(draft.period, draft.from, draft.to);
  if (!validEmail(draft.email) || !validRange(from, to)) throw new Error('Check the email address and period.');
  const preview = sendPreview(state, from, to, draft.includeSent);
  if (!preview.eligible.length) throw new Error('No records to send in this period.');
  const at = new Date().toISOString();
  const attempt: Attempt = { id: id('send'), at, from, to, email: draft.email.trim(), message: draft.message,
    recordIds: preview.eligible.map(r => r.id), state: state.settings.offline ? 'Waiting to send' : state.settings.nextSendFails ? "Couldn't send" : 'Sent',
    includeSent: !!draft.includeSent };
  return { attempt, state: { ...state, sendDraft: undefined, attempts: [attempt, ...state.attempts],
    recipients: draft.saveEmail ? [...new Set([...state.recipients, draft.email.trim()])] : state.recipients,
    settings: { ...state.settings, nextSendFails: false },
    records: state.records.map(r => attempt.recordIds.includes(r.id) ? attempt.state === 'Sent'
      ? { ...r, status: 'Sent', sentAt: at, lastSentAt: at, sentTo: draft.email.trim() }
      : { ...r, status: attempt.state === 'Waiting to send' ? 'Waiting to send' : "Couldn't send" } : r) } };
}
export function resolveSendAttempt(state: PrototypeState, attemptId: string, action: 'retry' | 'cancel'): PrototypeState {
  const attempt = state.attempts.find(item => item.id === attemptId);
  if (!attempt || !['Waiting to send', "Couldn't send"].includes(attempt.state)) throw new Error('This send is no longer pending.');
  const pending = state.records.filter(record => attempt.recordIds.includes(record.id) && !record.deleted
    && ['Waiting to send', "Couldn't send"].includes(record.status));
  const eligible = action === 'retry' ? pending.filter(canSend) : pending;
  if (action === 'retry' && !eligible.length) throw new Error('No records in this batch are still ready.');
  const at = new Date().toISOString();
  const outcome: Attempt['state'] = action === 'cancel' ? 'Cancelled' : state.settings.offline ? 'Waiting to send' : state.settings.nextSendFails ? "Couldn't send" : 'Sent';
  return { ...state, settings: { ...state.settings, nextSendFails: action === 'retry' ? false : state.settings.nextSendFails },
    records: state.records.map(record => !eligible.some(item => item.id === record.id) ? record
      : outcome === 'Cancelled' ? { ...record, status: canSend(record) ? 'Saved' : 'Needs review' }
        : outcome === 'Sent' ? { ...record, status: 'Sent', sentAt: at, lastSentAt: at, sentTo: attempt.email }
          : { ...record, status: outcome }),
    attempts: state.attempts.map(item => item.id === attempt.id ? { ...item, at, state: outcome,
      ...(action === 'retry' ? { recordIds: eligible.map(record => record.id) } : {}) } : item) };
}
export function applyUndo(state: PrototypeState, now = Date.now()): PrototypeState {
  const undo = state.undo;
  if (!undo || undo.expiresAt <= now) return { ...state, undo: undefined };
  if (undo.kind === 'discardEdit') return { ...state, edit: undo.editSession, undo: undefined };
  if (undo.target === 'edit' && state.edit?.recordId === undo.before.id && undo.line) {
    const lines = [...state.edit.working.lines];
    lines.splice(undo.index ?? lines.length, 0, undo.line);
    return { ...state, edit: { ...state.edit, working: { ...state.edit.working, lines } }, undo: undefined };
  }
  const current = state.records.find(r => r.id === undo.before.id);
  if (!current) return { ...state, records: [undo.before, ...state.records], undo: undefined };
  if (undo.kind !== 'line' && current.revision !== undo.afterRevision) throw new Error('This record changed again. Undo is no longer safe.');
  const restored = undo.kind === 'line' && undo.line
    ? { ...current, lines: [...current.lines.slice(0, undo.index), undo.line, ...current.lines.slice(undo.index)], revision: current.revision + 1 }
    : { ...undo.before, revision: current.revision + 1 };
  const at = new Date().toISOString();
  restored.history = [...current.history, ...(
    undo.kind === 'edit' ? differences(current, restored).map(d => ({ ...d, at, reason: 'Undo saved edit within 10 seconds' }))
      : undo.kind === 'delete' || undo.kind === 'discard' ? [{ at, field: 'Deleted', was: 'Yes', now: 'No', reason: 'Undo within 10 seconds' }] : []
  )];
  return { ...state, records: state.records.map(r => r.id === restored.id ? restored : r), undo: undefined };
}
export function makeFixtures(): PrototypeState {
  const boats: Boat[] = [
    { id: 'neema', name: 'Neema', vesselType: 'Mashua', propulsion: 'Outboard engine', horsepower: '15', length: '7', registration: 'KMFRI-241', crew: '4' },
    { id: 'baraka', name: 'Baraka', vesselType: 'Ngalawa', propulsion: 'Paddle and sail', horsepower: '', length: '5', registration: 'KWL-118', crew: '2' },
    { id: 'pili', name: 'Pili', vesselType: 'Hori', propulsion: 'Sail', horsepower: '', length: '9', registration: 'KWA-036', crew: '5' },
    { id: 'faraja', name: 'Faraja', vesselType: 'Dau', propulsion: 'Sail', horsepower: '', length: '10', registration: 'KWM-078', crew: '6' },
    { id: 'imani', name: 'Imani', vesselType: 'Mtumbwi', propulsion: 'Paddle', horsepower: '', length: '3', registration: 'KWM-092', crew: '1' },
  ];
  const fishers: Fisher[] = ['Amani Bakari', 'Salama Juma', 'Juma Mwakio', 'Zawadi Masha', 'Bahati Kombo'].map((name, i) => ({ id: `fisher-${i}`, name, boatIds: [boats[i].id] }));
  const statuses: Status[] = ['Saved', 'Needs review', 'Saved', 'Sent', 'Draft', 'Needs review', 'Needs review', 'Saved', 'Saved'];
  const records = statuses.map((status, index) => {
    const r = selectBoat(blankRecord('Msambweni Landing Site'), boats[index % 5]);
    const date = new Date(Date.now() - Math.floor(index / 3) * 86400000 - index * 600000).toISOString();
    return { ...r, id: `sample-${index}`, date, timeIn: date, fisherId: fishers[index % 5].id, status, step: status === 'Draft' ? 3 : 5,
      sentAt: index === 3 ? date : undefined, gear: GEARS[index % GEARS.length],
      lines: [{ ...blankLine(index % 2 ? 'Mullets' : 'Rabbit fish', index === 8 ? '' : '300', date),
        id: `sample-line-${index}`, weight: index === 8 ? '' : String(8 + index), count: String(10 + index), checked: status !== 'Needs review' }],
       notes: index === 8 ? 'Partial record: no measurements entered.' : '' };
  });
  const dayPrices: DayPrice[] = [];
  for (const record of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const line of record.lines) {
      if (!line.price || dayPrices.some(item => item.site === record.site && item.date === dayKey(record.date) && item.speciesId === line.speciesId)) continue;
      dayPrices.push({ site: record.site, date: dayKey(record.date), speciesId: line.speciesId, price: line.price, setAt: record.date });
    }
  }
  records[3] = { ...records[3], lastSentAt: records[3].date, sentTo: 'records@msambwenibmu.co.ke' };
  return { version: 2, revision: 0, records, boats, fishers, recipients: ['records@msambwenibmu.co.ke'], dayPrices,
    settings: { collector: 'Asha Mwakio', county: 'Kwale', site: 'Msambweni Landing Site', offline: true, failSaves: false, nextPhoto: 'A', nextSendFails: false, introSeen: false },
    filters: emptyFilters(), attempts: [{ id: 'sample-send', at: records[3].date, from: dayKey(Date.now() - 13 * 86400000), to: dayKey(), email: 'records@msambwenibmu.co.ke', message: '', recordIds: [records[3].id], state: 'Sent' }],
    schedule: { enabled: false, frequency: 'Every 2 weeks', weeks: '2', email: 'records@msambwenibmu.co.ke', firstDate: dayKey(Date.now() + 86400000) } };
}
