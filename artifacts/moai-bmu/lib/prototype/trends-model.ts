import { dayKey, numberValue, speciesName, type CatchRecord, type CountyFlag, type FlagFollowup, type PrototypeState, type TrendMetric, type TrendPoint, type TrendReminderEntry, type TrendSettings, type TrendSnapshot, validEmail } from './model';

export const DEMO_YEAR = 2026;
export const MIN_YEARS_FOR_BAND = 3;
export const MIN_TRIPS_FOR_SOLID_WEEK = 3;
const MONTH_BASE: Record<TrendMetric, number[]> = {
  total: [520, 540, 500, 360, 300, 280, 270, 290, 340, 430, 500, 540],
  species: [80, 85, 75, 55, 45, 40, 40, 45, 55, 70, 80, 85],
  length: [6, 6, 6, 5, 5, 5, 5, 5, 6, 6, 6, 6],
  perHour: [19, 20, 18, 14, 12, 11, 11, 12, 14, 17, 19, 20],
  price: [280, 280, 280, 280, 280, 280, 280, 310, 310, 310, 310, 310],
  trips: [40, 40, 38, 30, 26, 24, 24, 26, 30, 36, 40, 42],
};
const PER_TRIP = [21, 19, 18, 14, 11, 10, 9, 10, 11, 13, 14, 14];
const TRIP_BASE_BY_YEAR: Record<number, number[]> = {
  2023: [23, 22, 21, 16, 13, 12, 11, 13, 15, 20, 22, 23],
  2024: [24, 23, 21, 17, 14, 12, 12, 14, 16, 20, 23, 24],
  2025: [22, 21, 20, 16, 13, 12, 12, 13, 15, 19, 21, 22],
};
const YEAR_FACTORS: Record<number, number> = { 2021: .95, 2022: 1.05 };
const monthForWeek = (week: number) => Math.min(11, Math.floor((week - 1) / 4.35));
const deterministicNoise = (year: number, week: number) => (((year * 37 + week * 19) % 121) / 1000) - .06;

export function trendHistoryYears(mode: TrendSettings['history']): number[] {
  if (mode === 'None') return [DEMO_YEAR];
  if (mode === 'Some') return [DEMO_YEAR, DEMO_YEAR - 1];
  return [DEMO_YEAR, 2025, 2024, 2023, 2022, 2021];
}
function isAllowed(record: CatchRecord) {
  return !record.deleted && ['Saved', 'Waiting to send', 'Sent'].includes(record.status);
}
function recordSpeciesKg(record: CatchRecord, species: string) {
  if (record.noCatch && species === 'all') return { kg: 0, missing: false, priceWeight: [] as { kg: number | null; price: number | null }[] };
  const lines = record.lines.filter(line => species === 'all' || line.speciesId === species);
  const kg = lines.map(line => numberValue(line.weight)).filter((value): value is number => value !== null);
  return { kg: kg.length ? kg.reduce((a, b) => a + b, 0) : null, missing: !lines.length || kg.length < lines.length,
    priceWeight: lines.map(line => ({ kg: numberValue(line.weight), price: numberValue(line.price) })).filter(v => v.kg !== null && v.price !== null) };
}
function tripHours(record: CatchRecord): number | null {
  if (!record.timeOut || !record.timeIn) return null;
  const out = Date.parse(record.timeOut), input = Date.parse(record.timeIn);
  if (!Number.isFinite(out) || !Number.isFinite(input) || input <= out) return null;
  return (input - out) / 3600000;
}
export function calculateRecordSeries(records: CatchRecord[], metric: TrendMetric, species = 'Rabbit fish', measure: 'trip' | 'week' = 'trip', boatMode = ['length', 'perHour'].includes(metric) ? 'With engine' : 'All', gear: string[] = [], site = ''): Record<number, TrendPoint[]> {
  const grouped = new Map<string, CatchRecord[]>();
  for (const r of records.filter(record => isAllowed(record)
    && (boatMode === 'All' || (boatMode === 'With engine' ? record.propulsion.toLowerCase().includes('engine') : !!record.propulsion && !record.propulsion.toLowerCase().includes('engine')))
    && (!site || site === 'All sites' || record.site === site)
    && (!gear.length || gear.includes(record.gear)))) {
    const date = new Date(`${dayKey(r.date)}T12:00:00Z`);
    if (!Number.isFinite(date.getTime())) continue;
    const year = date.getUTCFullYear(), week = Math.ceil((((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 1)) / 86400000) + new Date(Date.UTC(year, 0, 1)).getUTCDay() + 1) / 7);
    const key = `${year}:${week}`;
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }
  const output: Record<number, TrendPoint[]> = {};
  for (const [key, group] of grouped) {
    const [year, week] = key.split(':').map(Number), month = monthForWeek(week);
    const weightFacts = group.map(r => recordSpeciesKg(r, metric === 'species' || metric === 'price' ? species : 'all'));
    const knownKg = weightFacts.flatMap(f => f.kg === null ? [] : [f.kg]);
    const timed = group.map(r => ({ r, hours: tripHours(r) })).filter((v): v is { r: CatchRecord; hours: number } => v.hours !== null);
    let value: number | null = null;
    if (metric === 'trips') value = group.length;
    if (metric === 'total' || metric === 'species') value = knownKg.length ? knownKg.reduce((a, b) => a + b, 0) / (measure === 'week' ? 1 : knownKg.length) : null;
    if (metric === 'length') value = timed.length ? timed.reduce((sum, item) => sum + item.hours, 0) / timed.length : null;
    if (metric === 'perHour') {
      const included = timed.map(item => ({ ...item, kg: recordSpeciesKg(item.r, 'all').kg })).filter(item => item.kg !== null);
      value = included.length ? included.reduce((sum, item) => sum + (item.kg ?? 0), 0) / included.reduce((sum, item) => sum + item.hours, 0) : null;
    }
    if (metric === 'price') {
      const prices = weightFacts.flatMap(f => f.priceWeight);
      const denom = prices.reduce((sum, p) => sum + (p.kg ?? 0), 0);
      value = denom ? prices.reduce((sum, p) => sum + (p.kg ?? 0) * (p.price ?? 0), 0) / denom : null;
    }
    const paired = timed.map(item => ({ ...item, kg: recordSpeciesKg(item.r, 'all').kg })).filter(item => item.kg !== null);
    const prices = weightFacts.flatMap(f => f.priceWeight);
    const sums = { kg: knownKg.reduce((sum, kg) => sum + kg, 0), weightTrips: knownKg.length,
      hours: timed.reduce((sum, item) => sum + item.hours, 0), timedTrips: timed.length,
      pairedKg: paired.reduce((sum, item) => sum + (item.kg ?? 0), 0), pairedHours: paired.reduce((sum, item) => sum + item.hours, 0),
      priceValue: prices.reduce((sum, item) => sum + item.kg! * item.price!, 0), pricedKg: prices.reduce((sum, item) => sum + item.kg!, 0) };
    const target = (output[year] ??= []);
    target[week - 1] = { week, month, value, trips: group.length, thin: group.length < MIN_TRIPS_FOR_SOLID_WEEK,
      missingWeight: group.filter((r, index) => weightFacts[index].missing).length,
      missingTimes: group.filter(r => !tripHours(r)).length,
      sums, ...(['length', 'perHour'].includes(metric) ? { incomplete: timed.length < group.length } : {}) };
  }
  return output;
}
function syntheticSeries(year: number, metric: TrendMetric, mode: TrendSettings['history'], measure: 'trip' | 'week', boatMode: string): TrendPoint[] {
  const points: TrendPoint[] = Array.from({ length: 52 }, (_, index) => {
    const week = index + 1, month = monthForWeek(week);
    const defaultTrip = TRIP_BASE_BY_YEAR[year] ?? (year === 2021 || year === 2022 ? TRIP_BASE_BY_YEAR[2023] : PER_TRIP);
    const base = metric === 'total' ? (measure === 'trip' ? defaultTrip[month] : MONTH_BASE.total[month])
      : metric === 'species' ? (measure === 'trip' ? MONTH_BASE.species[month] / 6 : MONTH_BASE.species[month])
        : metric === 'price' ? year < 2025 ? 250 : year === 2025 ? 280 : MONTH_BASE.price[month]
          : MONTH_BASE[metric][month];
    const story = year === DEMO_YEAR && month >= (metric === 'species' || metric === 'length' ? 8 : 7)
      ? (metric === 'species' ? .65 : metric === 'length' || metric === 'price' || metric === 'trips' || (metric === 'total' && measure === 'trip') ? 1 : .75) : 1;
    const lift = year === DEMO_YEAR && metric === 'length' && month >= 8 ? 1 : 0;
    let value = Number((base * (YEAR_FACTORS[year] ?? 1) * story * (1 + deterministicNoise(year, week)) + lift).toFixed(2));
    const cohort = boatMode === 'Without engine' ? .2 : boatMode === 'With engine' ? .8 : 1;
    const baseTrips = metric === 'trips' ? Math.max(2, Math.round(value)) : week === 33 || week === 34 ? 5 : week === 28 ? 2 : 5 + (week % 7);
    const trips = Math.max(1, Math.round(baseTrips * cohort));
    if (metric === 'trips') value = trips;
    if ((metric === 'total' || metric === 'species') && measure === 'week') value *= cohort;
    if (['length', 'perHour'].includes(metric) && boatMode === 'Without engine') value *= metric === 'length' ? 1.2 : .8;
    const missingWeight = year === DEMO_YEAR && (week === 33 || week === 34) ? Math.round(trips * .4) : 0;
    const missingTimes = year === DEMO_YEAR ? Math.round(trips * .15) : 0;
    const weightTrips = trips - missingWeight, timedTrips = trips - missingTimes;
    const sums = { kg: (measure === 'trip' ? value * weightTrips : value), weightTrips,
      hours: value * timedTrips, timedTrips, pairedKg: value * timedTrips * 6, pairedHours: timedTrips * 6,
      priceValue: value * weightTrips * 10, pricedKg: weightTrips * 10 };
    return { week, month, value, trips, thin: trips < MIN_TRIPS_FOR_SOLID_WEEK, missingWeight, missingTimes, sums };
  });
  if (year === 2023) points.forEach(point => { if (point.month === 5 || point.month === 6) Object.assign(point, { value: null, trips: null }); });
  if (year === 2026) {
    points[40] = { week: 41, month: 9, value: null, trips: null };
    for (let i = 0; i < 52; i++) if (i > 45 || (mode === 'None' && i < 35)) points[i] = { week: i + 1, month: monthForWeek(i + 1), value: null, trips: null };
    if (metric === 'length' || metric === 'perHour') points.forEach(p => { if (p.trips !== null) p.incomplete = (p.missingTimes ?? 0) > 0; });
  }
  if (year === 2025 && mode === 'Some') {
    for (let i = 0; i < 52; i++) if (points[i].month < 7) points[i] = { week: i + 1, month: monthForWeek(i + 1), value: null, trips: null };
  }
  return points;
}
export function buildTrendSeries(state: PrototypeState, metric: TrendMetric, mode = state.trends?.history ?? 'County loaded', species = 'Rabbit fish', measure: 'trip' | 'week' = 'trip', boatMode = ['length', 'perHour'].includes(metric) ? 'With engine' : 'All', gear: string[] = [], site = '') {
  const years = trendHistoryYears(mode);
  const hasSyntheticBreakdown = !gear.length && (!site || site === 'All sites' || site === state.settings.site)
    && (!['species', 'price'].includes(metric) || species === 'Rabbit fish');
  const synthetic: Record<number, TrendPoint[]> = Object.fromEntries(years.map(year => [year,
    hasSyntheticBreakdown ? syntheticSeries(year, metric, mode, measure, boatMode)
      : Array.from({ length: 52 }, (_, index) => ({ week: index + 1, month: monthForWeek(index + 1), value: null, trips: null }))]));
  const actual = calculateRecordSeries(state.records, metric, species, measure, boatMode, gear, site);
  const appYear = DEMO_YEAR;
  if (actual[appYear]?.length) {
    const current = synthetic[appYear] ?? Array.from({ length: 52 }, (_, i) => ({ week: i + 1, month: monthForWeek(i + 1), value: null, trips: null }));
    for (let i = 0; i < 52; i++) if (actual[appYear][i]) current[i] = actual[appYear][i];
    synthetic[appYear] = current;
  }
  return { years, series: synthetic, source: Object.fromEntries(years.map(year => [year, year === appYear ? 'Recorded in this app · Synthetic sample' : mode === 'Some' && year === 2025 ? 'Recorded in this app · Synthetic sample' : 'From county · Synthetic sample'])) };
}
export function metricTitle(metric: TrendMetric, species = 'Rabbit fish', measure: 'trip' | 'week' = 'trip') {
  const unit = measure === 'week' ? 'per week' : 'per trip';
  const names: Record<TrendMetric, string> = { total: `Fish landed ${unit}, kg`, species: `Catch of ${speciesName(species)}, kg ${unit}`, length: 'Trip hours, average', perHour: 'Catch per trip hour, kg', price: `Price per kg, Ksh · ${speciesName(species)}`, trips: 'Trips recorded per week' };
  return names[metric];
}
export function evidenceLine(state: PrototypeState, metric: TrendMetric, years: number[], measure: 'trip' | 'week' = 'trip', boatMode = ['length', 'perHour'].includes(metric) ? 'With engine' : 'All', gear: string[] = [], site = '', species = 'Rabbit fish') {
  const built = buildTrendSeries(state, metric, undefined, species, measure, boatMode, gear, site);
  const points = years.flatMap(year => built.series[year] ?? []).filter(point => point.trips !== null);
  const trips = points.reduce((sum, point) => sum + (point.trips ?? 0), 0);
  const missingWeights = points.reduce((sum, point) => sum + (point.missingWeight ?? 0), 0);
  const noTimes = points.reduce((sum, point) => sum + (point.missingTimes ?? 0), 0);
  const parts = [`Based on ${trips} trips in ${years.length} years`];
  if (missingWeights > 0) parts.push(`${missingWeights} trips have no weight`);
  if (noTimes > 0) parts.push(`${noTimes} trips have no times`);
  return `${parts.join('. ')}.`;
}
export function excludedRecordCount(state: PrototypeState, kind?: 'review') {
  return state.records.filter(r => !r.deleted && (kind === 'review' ? r.status === 'Needs review' : ['Draft', 'Needs review'].includes(r.status))).length;
}
export function makeTrendSnapshot(state: PrototypeState, metric: TrendMetric, range: string, selectedYears?: number[], species = 'Rabbit fish',
  measure: 'trip' | 'week' = 'trip', boatMode = ['length', 'perHour'].includes(metric) ? 'With engine' : 'All', gear: string[] = [], site = 'All sites'): TrendSnapshot {
  const built = buildTrendSeries(state, metric, undefined, species, measure, boatMode, gear, site);
  const years = selectedYears ?? built.years.slice(0, 3);
  const series = Object.fromEntries(years.map(year => [String(year), built.series[year] ?? []]));
  return { metric, title: metricTitle(metric, species, measure), species: metric === 'species' || metric === 'price' ? speciesName(species) : 'All species',
    years, months: Array.from({ length: 12 }, (_, i) => i), measure, site, sources: Object.fromEntries(years.map(year => [String(year), built.source[year] ?? 'Recorded in this app · Synthetic sample'])),
    trips: Object.fromEntries(years.map(year => [String(year), (series[String(year)] as TrendPoint[]).reduce((n, p) => n + (p.trips ?? 0), 0)])),
    series, synthetic: true, createdAt: new Date().toISOString(), range };
}
export function createFlag(state: PrototypeState, snapshot: TrendSnapshot, follows?: string): CountyFlag {
  const at = new Date().toISOString();
  const original = state.flags?.find(flag => flag.id === follows);
  return { id: `flag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, number: Math.max(state.flags?.length ?? 0, ...(state.flags ?? []).map(flag => flag.number ?? 0)) + 1, status: 'Draft',
    snapshot: JSON.parse(JSON.stringify(snapshot)) as TrendSnapshot, note: follows ? `Follows flag ${original?.number ?? original?.sentCard?.number ?? follows}` : '',
    includePicture: true, recipient: '', markedWeeks: null, createdAt: at, updatedAt: at,
    history: [{ at, label: 'Saved as draft' }], ...(follows ? { follows } : {}) };
}
export function patchFlag(flag: CountyFlag, patch: Partial<CountyFlag>): CountyFlag {
  if (flag.status === 'Sent') throw new Error('Sent flags are read-only. Start a follow-up flag instead.');
  return { ...flag, ...patch, updatedAt: new Date().toISOString() };
}
export function queueFlag(flag: CountyFlag, state: PrototypeState): CountyFlag {
  if (flag.status === 'Sent') throw new Error('This flag was already sent. Start a follow-up flag instead.');
  if (!validEmail(flag.recipient)) throw new Error('Choose a valid email address.');
  const at = new Date().toISOString();
  if (state.settings.offline) return { ...flag, status: 'Waiting to send', updatedAt: at, history: [...flag.history, { at, label: 'Waiting to send' }] };
  if (state.trends?.nextFlagFails) return { ...flag, status: "Couldn't send", updatedAt: at, history: [...flag.history, { at, label: "Couldn't send" }] };
  return { ...flag, status: 'Sent', sentAt: at, sentTo: flag.recipient,
    sentSnapshot: JSON.parse(JSON.stringify(flag.snapshot)) as TrendSnapshot, sentNote: flag.note, sentPicture: flag.includePicture,
    sentWeeks: flag.markedWeeks ? [...flag.markedWeeks] : null, sentRecipient: flag.recipient,
    sentCard: { collector: state.settings.collector, site: flag.snapshot.site && flag.snapshot.site !== 'All sites' ? flag.snapshot.site : state.settings.site,
      number: flag.number ?? Math.max(1, (state.flags?.findIndex(item => item.id === flag.id) ?? -1) + 1) },
    updatedAt: at, history: [...flag.history, { at, label: 'Sent' }] };
}
export function resolveFlag(state: PrototypeState, flagId: string, action: 'retry' | 'cancel'): PrototypeState {
  const flag = state.flags?.find(item => item.id === flagId);
  if (!flag || !['Waiting to send', "Couldn't send"].includes(flag.status)) throw new Error('This flag is no longer pending.');
  if (action === 'cancel') return { ...state, flags: state.flags!.map(f => f.id === flagId ? { ...f, status: 'Draft', updatedAt: new Date().toISOString(), history: [...f.history, { at: new Date().toISOString(), label: 'Cancel sending · Draft' }] } : f) };
  const sent = queueFlag({ ...flag, status: 'Draft' }, { ...state, settings: { ...state.settings, offline: state.settings.offline } });
  return { ...state, trends: { ...(state.trends as TrendSettings), nextFlagFails: false },
    flags: state.flags!.map(f => f.id === flagId ? sent : f) };
}
export function addFlagFollowup(flag: CountyFlag, followup: Omit<FlagFollowup, 'recordedAt'>): CountyFlag {
  if (flag.status !== 'Sent') throw new Error('Only sent flags can have follow-up.');
  if (followup.when !== 'Not known' && (!/^\d{4}-\d{2}-\d{2}$/.test(followup.when)
    || !Number.isFinite(Date.parse(followup.when)) || new Date(followup.when).toISOString().slice(0, 10) !== followup.when)) throw new Error('Choose a valid date or Not known.');
  const at = new Date().toISOString();
  return { ...flag, followup: { ...followup, recordedAt: at }, updatedAt: at, history: [...flag.history, { at, label: 'Follow-up recorded' }] };
}
export function setFlagClosed(flag: CountyFlag, closed: boolean): CountyFlag {
  if (flag.status !== 'Sent') throw new Error('Only sent flags can be closed or reopened.');
  const at = new Date().toISOString();
  return { ...flag, closedAt: closed ? at : undefined, updatedAt: at,
    history: [...flag.history, { at, label: closed ? 'Flag closed' : 'Flag reopened' }] };
}
export function logTrendReminder(state: PrototypeState, id: string, metric: TrendMetric, range: string, runLength: number, choice?: TrendReminderEntry['choice']) {
  const existing = state.trendReminderLog?.find(item => item.id === id);
  if (!existing) return { ...state, trendReminderLog: [...(state.trendReminderLog ?? []), { id, metric, range, runLength, shownAt: new Date().toISOString(), ...(choice ? { choice } : {}) }] };
  if (!choice) return state;
  return { ...state, trendReminderLog: state.trendReminderLog!.map(item => item.id === id ? { ...item, choice } : item) };
}

/** Shared by the chart readout, accessible month buttons, presentation and table. */
export function summarizeTrendMonth(points: TrendPoint[], month: number, metric: TrendMetric, measure: 'trip' | 'week' = 'trip') {
  const rows = points.filter(point => point.month === month);
  const known = rows.filter(point => point.value !== null);
  const counted = rows.filter(point => point.trips !== null);
  const trips = counted.length ? counted.reduce((sum, point) => sum + point.trips!, 0) : null;
  let value: number | null = null;
  if (known.length) {
    const sum = (key: keyof NonNullable<TrendPoint['sums']>) => known.reduce((total, point) => total + (point.sums?.[key] ?? 0), 0);
    if (known.every(point => point.sums)) {
      if (metric === 'price') value = sum('pricedKg') ? sum('priceValue') / sum('pricedKg') : null;
      else if (metric === 'perHour') value = sum('pairedHours') ? sum('pairedKg') / sum('pairedHours') : null;
      else if (metric === 'length') value = sum('timedTrips') ? sum('hours') / sum('timedTrips') : null;
      else if ((metric === 'total' || metric === 'species') && measure === 'trip') value = sum('weightTrips') ? sum('kg') / sum('weightTrips') : null;
      else value = known.reduce((total, point) => total + point.value!, 0) / known.length;
    } else {
      // Earlier persisted flag snapshots have weekly means but no denominators.
      // Their displayed monthly number is explicitly the mean of recorded weeks.
      value = known.reduce((total, point) => total + point.value!, 0) / known.length;
    }
  }
  return { value, trips, missingWeight: rows.reduce((sum, point) => sum + (point.missingWeight ?? 0), 0),
    missingTimes: rows.reduce((sum, point) => sum + (point.missingTimes ?? 0), 0) };
}

/** A band needs three distinct earlier years, not three points from one year. */
export function earlierBandForWeek(series: Record<number, TrendPoint[]>, priorYears: number[], index: number) {
  const represented = priorYears.map(year => (series[year] ?? []).slice(Math.max(0, index - 1), index + 2)
    .flatMap(point => point.value === null ? [] : [point.value])).filter(values => values.length);
  if (represented.length < MIN_YEARS_FOR_BAND) return null;
  const values = represented.flat();
  return { low: Math.min(...values), high: Math.max(...values) };
}

export function deriveTrendComparison(series: Record<number, TrendPoint[]>, years: number[], metric: TrendMetric, species = 'Rabbit fish', measure: 'trip' | 'week' = 'trip') {
  const current = series[years[0]] ?? [], earlier = years.slice(1);
  const lastIndex = current.reduce((last, point, index) => point.trips !== null || point.value !== null ? index : last, -1);
  const observed = current.slice(0, lastIndex + 1);
  const states = observed.map(point => {
    const values = earlier.flatMap(year => {
      const value = series[year]?.find(previous => previous.week === point.week)?.value;
      return value == null ? [] : [value];
    });
    return { ...point, direction: point.value === null || values.length !== earlier.length || !earlier.length ? 'gap'
      : point.value < Math.min(...values) ? 'lower' : point.value > Math.max(...values) ? 'higher' : 'inside' };
  });
  const latest = states.at(-1);
  const direction = latest?.direction ?? 'gap';
  const run: typeof states = [];
  if (direction === 'lower' || direction === 'higher') for (let i = states.length - 1; i >= 0; i--) {
    const point = states[i];
    if (point.direction !== direction || (run.length && point.week !== run[0].week - 1)) break;
    run.unshift(point);
  }
  const trips = observed.reduce((sum, point) => sum + (point.trips ?? 0), 0);
  const name = metric === 'species' ? `Kg of ${speciesName(species)}` : metric === 'length' ? 'Engine boat trips'
    : metric === 'perHour' ? 'Kg per trip hour' : metric === 'price' ? 'Price per kg' : metric === 'trips' ? 'Trips per week' : `Kg landed per ${measure === 'week' ? 'week' : 'trip'}`;
  let text: string;
  if (!earlier.length) text = 'No earlier years yet.';
  else if (earlier.length < MIN_YEARS_FOR_BAND) text = `Only ${earlier.length} earlier ${earlier.length === 1 ? 'year is' : 'years are'} shown, so there is no range yet. Compare the lines.`;
  else if (latest?.value === null) text = latest.trips !== null
    ? ['length', 'perHour'].includes(metric) ? `No trips have the required times${metric === 'perHour' ? ' and weights' : ''} in week ${latest.week}.`
      : `No ${metric === 'price' ? 'prices and weights' : 'weights'} are recorded for week ${latest.week}. Missing values are not zero.`
    : `No records for week ${latest.week}. Gaps are not counted as zero.`;
  else if (states.slice(-4).reduce((sum, point) => sum + (point.trips ?? 0), 0) < MIN_TRIPS_FOR_SOLID_WEEK) text = 'Only a few trips were recorded in the latest weeks, so this may not show the whole picture.';
  else if (run.length) {
    const adjective = metric === 'length' ? direction === 'higher' ? 'longer' : 'shorter' : direction;
    text = `${name} has been ${adjective} than all ${earlier.length} earlier years for ${run.length} ${run.length === 1 ? 'week' : 'weeks'}${run.length > 1 ? ` in a row (weeks ${run[0].week} to ${run.at(-1)!.week})` : ''}.${metric === 'length' ? ' Trip time is only a rough guide.' : ''}`;
  } else if (direction === 'inside') text = `${name} is inside the range of earlier years this month.`;
  else text = 'No matching weeks have records yet.';
  return { text, direction, runLength: earlier.length >= MIN_YEARS_FOR_BAND ? run.length : 0,
    startWeek: run[0]?.week ?? null, endWeek: run.at(-1)?.week ?? null, trips };
}
