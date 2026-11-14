import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { usePrototype } from '@/lib/prototype/store';
import { GEARS, numberValue, SPECIES, speciesName, type TrendMetric } from '@/lib/prototype/model';
import { buildTrendSeries, calculateRecordSeries, DEMO_YEAR, deriveTrendComparison, earlierBandForWeek, evidenceLine, excludedRecordCount, logTrendReminder, makeTrendSnapshot, metricTitle, MIN_YEARS_FOR_BAND, summarizeTrendMonth } from '@/lib/prototype/trends-model';
import { ActionBar, Btn, C, Card, Choices, Field, Heading, Notice, Overlay, Select, Shell, Txt, s } from './ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['#4B35C4', '#34495A', '#49606F', '#62788B', '#80949A', '#A6B4B0'];
const colorForYear = (year: number) => year === DEMO_YEAR ? COLORS[0] : COLORS[((DEMO_YEAR - year - 1) % (COLORS.length - 1)) + 1];
const dashForYear = (year: number) => year === DEMO_YEAR ? '' : ['', '10 5', '5 5', '2 4', '7 3 2 3'][((DEMO_YEAR - year - 1) % 5)];
const QUESTIONS: { metric: TrendMetric; question: string; chart: string }[] = [
  { metric: 'total', question: 'Are we catching less than before?', chart: 'Total catch' },
  { metric: 'species', question: 'Is one species down?', chart: 'Catch of one species' },
  { metric: 'length', question: 'Are trips longer?', chart: 'Trip length' },
  { metric: 'perHour', question: 'Are we catching less for the time at sea?', chart: 'Catch per trip hour' },
  { metric: 'price', question: 'Are prices changing?', chart: 'Price per kg' },
  { metric: 'trips', question: 'Are boats going out less often?', chart: 'Number of trips' },
];
const isTimeMetric = (metric: TrendMetric) => metric === 'length' || metric === 'perHour';
type ChartSession = {
  metric: TrendMetric; range: string; selectedMonth: number | null; focusedYear: number | null; view: 'Chart' | 'List';
  species: string; average: boolean; boatMode: string; measure: 'trip' | 'week'; gear: string[]; site: string;
};
let chartSession: ChartSession | null = null;
let trendsRootScrollOffset = 0;
const chartScrollOffsets: Record<string, number> = {};
export function resetTrendChartSession() { chartSession = null; }
const unitFor = (metric: TrendMetric, measure: 'trip' | 'week' = 'trip') => metric === 'price' ? 'Ksh/kg' : metric === 'length' ? 'hours' : metric === 'trips' ? 'trips' : metric === 'perHour' ? 'kg/hour' : measure === 'week' ? 'kg/week' : 'kg/trip';
const fmt = (v: number | null | undefined, metric: TrendMetric, measure: 'trip' | 'week' = 'trip') => v == null ? 'No records' : `${Number(v.toFixed(1))} ${unitFor(metric, measure)}`;

function Segments({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <View style={{ flexDirection: 'row', minWidth: options.length === 2 ? 168 : undefined, borderWidth: 1, borderColor: C.input, borderRadius: 13, overflow: 'hidden', backgroundColor: C.card }}>
    {options.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: value === item }} onPress={() => onChange(item)}
      style={{ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 4, backgroundColor: value === item ? C.primary : C.card }}>
      {value === item ? <Feather name="check" size={15} color={C.primaryForeground} /> : null}
       <Text numberOfLines={options.length === 2 ? 1 : undefined} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 16, lineHeight: 18, fontWeight: '700', color: value === item ? C.primaryForeground : C.foreground }}>{item}</Text>
    </Pressable>)}
  </View>;
}
export function TrendsRoot({ onChart, onFlags, onTab, onNeedsReview, onView }: {
  onChart: (m: TrendMetric, custom?: boolean) => void; onFlags: () => void; onTab: (tab: string) => void; onNeedsReview: () => void;
  onView: (view: 'All records' | 'Needs review' | 'Trends') => void;
}) {
  const { data } = usePrototype();
  const [notRecorded, setNotRecorded] = useState('');
  if (!data) return null;
  const prior = data.trends?.history !== 'None';
  return <Shell title="What do you want to check?" tab="Records" onTab={onTab} offline={data.settings.offline} offlineCompact stickyIndices={[0]}
    scrollKey="TrendsRoot" initialScrollOffset={trendsRootScrollOffset} onScrollOffset={value => { trendsRootScrollOffset = value; }}
    headerRight={<Pressable accessibilityRole="button" accessibilityLabel={`Flags (${data.flags?.length ?? 0})`} onPress={onFlags} style={[s.iconButton, { width: 74, flexDirection: 'row', gap: 4 }]}><Text style={{ color: C.primary, fontWeight: '700', fontSize: 14 }}>Flags ({data.flags?.length ?? 0})</Text></Pressable>}
    contentGap={12}>
    <Segments value="Trends" options={['All records', 'Needs review', 'Trends']} onChange={value => onView(value as 'All records' | 'Needs review' | 'Trends')} />
    <Txt small muted>{prior ? 'Compare what was recorded with earlier years.' : 'Only records made in this app so far. Earlier years show here when county history is loaded.'}</Txt>
    {QUESTIONS.map(item => <Pressable key={item.metric} accessibilityRole="button" onPress={() => onChart(item.metric)}
      style={[s.settingRow, { minHeight: 72, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 12 }]}>
      <View style={{ flex: 1, gap: 3 }}><Text style={{ color: C.foreground, fontSize: 17, fontWeight: '700' }}>{item.question}</Text><Text style={{ color: C.mutedForeground, fontSize: 14 }}>{item.chart}</Text></View>
      <Feather name="chevron-right" size={20} color={C.foreground} />
    </Pressable>)}
    <Heading>Not in this app&apos;s records</Heading>
    {['Is fuel use going up?', 'Is fish lost after landing?'].map(label => <Pressable key={label} accessibilityRole="button" onPress={() => setNotRecorded(label.includes('fuel') ? 'fuel' : 'loss')}
      style={[s.settingRow, { minHeight: 64, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 }]}>
      <View style={{ flex: 1 }}><Text style={{ color: C.foreground, fontSize: 16, fontWeight: '600' }}>{label}</Text><Text style={{ color: C.mutedForeground, fontSize: 14 }}>Not recorded</Text></View><Feather name="chevron-right" size={20} color={C.foreground} />
    </Pressable>)}
    <Btn label="Build your own chart" kind="secondary" icon="sliders" onPress={() => onChart('total', true)} />
    <Pressable accessibilityRole="button" onPress={onNeedsReview} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: C.primary, fontSize: 14 }}>{excludedRecordCount(data, 'review')} records not included (need review). Check records.</Text>
    </Pressable>
    {!data.records.some(r => !r.deleted && ['Saved', 'Waiting to send', 'Sent'].includes(r.status)) ?
      <Card><Heading>Nothing to chart yet</Heading><Txt>Charts use saved records. Use Add record to start. Past years can come from the county.</Txt></Card> : null}
    {notRecorded ? <Overlay title="Not recorded yet" size="medium" onClose={() => setNotRecorded('')}>
      <Txt>The catch sheet has no {notRecorded === 'fuel' ? 'fuel use' : 'loss after landing'}, so this app cannot show it.</Txt>
      {notRecorded === 'fuel' ? <><Heading>What we can show instead</Heading><Txt>Fuel is not recorded. The catch sheet has no fuel amount, so this app cannot show fuel use or fuel cost. On boats with an engine, trip hours are a rough hint only: a longer trip may use more fuel, or it may mean more travelling, waiting or searching. Price per kg is recorded, so you can see if prices changed. The chart cannot say why.</Txt>
        <Btn label="Show trip length" kind="secondary" closeOnPress onPress={() => { setTimeout(() => onChart('length'), 210); return true; }} />
        <Btn label="Show price per kg" kind="secondary" closeOnPress onPress={() => { setTimeout(() => onChart('price'), 210); return true; }} /></> : null}
    </Overlay> : null}
  </Shell>;
}

function TrendChartSvg({ series, years, metric, species = 'Rabbit fish', measure = 'trip', selectedMonth, onSelect, focusedYear, present, onTouch, showAverage = false, showBand = true, comparison, averageSeries, weekAxis = false }: {
  series: Record<number, any[]>; years: number[]; metric: TrendMetric; species?: string; measure?: 'trip' | 'week'; selectedMonth: number | null; onSelect: (m: number) => void;
  focusedYear: number | null; present: boolean; onTouch: (active: boolean) => void; showAverage?: boolean; showBand?: boolean;
  comparison?: { direction: string; runLength: number; startWeek?: number | null; endWeek?: number | null };
  averageSeries?: { week: number; value: number | null }[];
  weekAxis?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(Math.max(280, width - 48));
  const plotW = containerWidth - 52, plotH = present ? 230 : 185, left = 38, top = 18;
  const values = years.flatMap(y => (series[y] ?? []).map(p => p.value).filter((v: number | null) => v !== null));
  const max = Math.max(1, Math.ceil((Math.max(...values, 0) * 1.1) / 10) * 10);
  const xFor = (week: number) => left + ((week - 1) / 51) * plotW;
  const yFor = (value: number) => top + plotH - value / max * plotH;
  const bandAvailable = showBand && years.length - 1 >= MIN_YEARS_FOR_BAND;
  const visibleYears = bandAvailable ? years.slice(0, 1) : showBand ? years : years.slice(0, 5);
  const currentPoints = series[years[0]] ?? [];
  const firstObservedWeek = currentPoints.find((point: any) => point.value !== null)?.week ?? 0;
  const lastObservedWeek = [...currentPoints].reverse().find((point: any) => point.value !== null)?.week ?? 0;
  const weekTickCount = Math.min(7, Math.max(1, lastObservedWeek - firstObservedWeek + 1));
  const weekTicks = firstObservedWeek ? Array.from({ length: weekTickCount }, (_, index) =>
    weekTickCount < 2 ? firstObservedWeek : Math.round(firstObservedWeek + index * (lastObservedWeek - firstObservedWeek) / (weekTickCount - 1))) : [];
  const lastIndex = currentPoints.reduce((last: number, point: any, index: number) => point.value !== null ? index : last, -1);
  const previousIndex = lastIndex > 0 && currentPoints[lastIndex - 1]?.week + 1 === currentPoints[lastIndex]?.week ? lastIndex - 1 : -1;
  const paths = visibleYears.map(year => {
    const pts = series[year] ?? [];
    let segments: string[] = [], line = '';
    pts.forEach((p: any, index: number) => {
      const omitLast = year === years[0] && previousIndex >= 0 && index === lastIndex;
      if (p.value == null || omitLast) { if (line) segments.push(line); line = ''; return; }
      line += `${line ? ' L' : 'M'} ${xFor(p.week)} ${yFor(p.value)}`;
    });
    if (line) segments.push(line);
    const lastSegment = year === years[0] && previousIndex >= 0
      ? `M ${xFor(currentPoints[previousIndex].week)} ${yFor(currentPoints[previousIndex].value)} L ${xFor(currentPoints[lastIndex].week)} ${yFor(currentPoints[lastIndex].value)}` : '';
    const lastValidIndex = pts.reduce((last: number, point: any, index: number) => point.value !== null ? index : last, -1);
    return { year, pts, d: segments.join(' '), lastSegment, lastValidIndex };
  });
  const bandRanges = Array.from({ length: 52 }, (_, index) => {
    if (!bandAvailable) return null;
    const distinctAtWeek = years.slice(1).filter(year => {
      const value = (series[year] ?? [])[index]?.value;
      return value !== null && value !== undefined;
    }).length;
    return distinctAtWeek >= MIN_YEARS_FOR_BAND ? earlierBandForWeek(series, years.slice(1), index) : null;
  });
  const bandRuns: { upper: string; lower: string; polygon: string }[] = [];
  let bandRun: { week: number; low: number; high: number }[] = [];
  const finishBandRun = () => {
    if (bandRun.length > 1) {
      const upper = bandRun.map(p => `${xFor(p.week)},${yFor(p.high)}`).join(' ');
      const lowerPoints = [...bandRun].reverse().map(p => `${xFor(p.week)},${yFor(p.low)}`);
      bandRuns.push({ upper, lower: lowerPoints.slice().reverse().join(' '), polygon: [...bandRun.map(p => `${xFor(p.week)},${yFor(p.high)}`), ...lowerPoints].join(' ') });
    }
    bandRun = [];
  };
  bandRanges.forEach((range, index) => {
    if (!range) { finishBandRun(); return; }
    const week = index + 1;
    if (bandRun.length && bandRun[bandRun.length - 1].week + 1 !== week) finishBandRun();
    bandRun.push({ week, low: range.low, high: range.high });
  });
  finishBandRun();
  const historyAveragePath = Array.from({ length: 52 }, (_, index) => {
    const values = years.slice(1).map(year => (series[year] ?? [])[index]?.value).filter((v: number | null | undefined) => v !== null && v !== undefined) as number[];
    if (!values.length) return null;
    return { week: index + 1, value: values.reduce((a, b) => a + b, 0) / values.length };
  });
  const toPath = (points: ({ week: number; value: number | null } | null)[]) => {
    let segments: string[] = [], line = '';
    points.forEach(point => {
      if (!point || point.value == null) { if (line) segments.push(line); line = ''; return; }
      line += `${line ? ' L' : 'M'} ${xFor(point.week)} ${yFor(point.value)}`;
    });
    if (line) segments.push(line);
    return segments.join(' ');
  };
  const averagePath = averageSeries ? toPath(averageSeries) : toPath(historyAveragePath);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.25,
    onPanResponderGrant: () => onTouch(true),
    onPanResponderMove: (event) => { const x = Math.max(0, Math.min(plotW, event.nativeEvent.locationX - left)); onSelect(Math.max(0, Math.min(11, Math.round(x / plotW * 11)))); },
    onPanResponderRelease: () => onTouch(false),
    onPanResponderTerminate: () => onTouch(false),
  })).current;
  return <View onLayout={e => setContainerWidth(e.nativeEvent.layout.width)} onTouchStart={() => onTouch(true)} onTouchEnd={() => onTouch(false)} accessibilityRole="image"
    accessibilityLabel={`Compare trends, ${metricTitle(metric, species, measure)}, ${years.length} years, by month. Select a month to hear the monthly summary.`}
    style={{ width: '100%', height: plotH + 58 }} {...pan.panHandlers}>
    <Svg width={containerWidth} height={plotH + 54}>
      {Array.from({ length: 4 }, (_, i) => {
        const val = max * i / 3, y = top + plotH - i / 3 * plotH;
        return <React.Fragment key={i}>{i > 0 ? <Line x1={left} x2={left + plotW} y1={y} y2={y} stroke="#C9D3CF" strokeWidth={1} /> : null}
          <SvgText x={left + 4} y={y + 5} fill="#263B45" fontSize={present ? 18 : 14}>{Math.round(val)}</SvgText></React.Fragment>;
      })}
      {selectedMonth !== null ? <Rect x={left + selectedMonth * plotW / 12} y={top} width={plotW / 12} height={plotH} fill="#EFF2F0" /> : null}
      {currentPoints.filter((point: any) => point.value === null && point.trips === null && point.week >= firstObservedWeek && point.week <= lastObservedWeek && point.week <= 46).map((point: any) =>
        <Rect key={`gap-${point.week}`} x={xFor(point.week) - plotW / 104} y={top} width={plotW / 52} height={plotH} fill="#EEF1EF" />)}
      {bandRuns.map((run, index) => <React.Fragment key={`band-${index}`}>
        <Polygon points={run.polygon} fill="#E3E9E6" />
        <Polyline points={run.upper} fill="none" stroke="#62788B" strokeWidth={1} strokeDasharray="2 3" />
        <Polyline points={run.lower} fill="none" stroke="#62788B" strokeWidth={1} strokeDasharray="2 3" />
      </React.Fragment>)}
      {paths.map(({ year, d, pts, lastSegment, lastValidIndex }) => <React.Fragment key={year}>
        <Path d={d} fill="none" stroke={colorForYear(year)} strokeWidth={year === DEMO_YEAR ? (present ? 5 : 4) : (present ? 4 : 3)}
          strokeDasharray={dashForYear(year)} opacity={focusedYear !== null && focusedYear !== year ? 0.3 : 1} />
        {lastSegment ? <Path d={lastSegment} fill="none" stroke={colorForYear(year)} strokeWidth={year === DEMO_YEAR ? (present ? 5 : 4) : 3} strokeDasharray="2 4" /> : null}
        {pts.map((point: any, index: number) => {
          const isLast = index === lastValidIndex;
          const thinRelevant = !!point.thin && ['total', 'species', 'price', 'perHour', 'length'].includes(metric);
          const weightRelevant = ['total', 'species', 'price', 'perHour'].includes(metric) && (point.missingWeight ?? 0) > 0;
          const timeRelevant = ['length', 'perHour'].includes(metric) && ((point.missingTimes ?? 0) > 0 || point.incomplete);
          const marked = thinRelevant || weightRelevant || timeRelevant || selectedMonth === point.month || isLast;
          if (point.value === null || !marked) return null;
          const hollow = thinRelevant || weightRelevant || timeRelevant;
          return <Circle key={index} cx={xFor(point.week)} cy={yFor(point.value)} r={present ? 5 : 4}
            fill={hollow ? C.card : colorForYear(year)} stroke={colorForYear(year)} strokeWidth={2} />;
        })}
        {year === DEMO_YEAR ? <>
          {pts.filter((point: any) => point.value !== null).slice(-1).map((point: any) =>
            <SvgText key="now" x={xFor(point.week) + 5} y={yFor(point.value) - 9} fill="#263B45" fontSize={14}>Now</SvgText>)}
        </> : null}
      </React.Fragment>)}
      {showAverage && averagePath ? <Path d={averagePath} fill="none" stroke="#62788B" strokeWidth={2} strokeDasharray="3 5" /> : null}
      {comparison?.runLength && comparison.startWeek && comparison.endWeek ? <>
        <Line x1={xFor(comparison.startWeek)} x2={xFor(comparison.endWeek)} y1={top - 6} y2={top - 6} stroke="#263B45" strokeWidth={2} />
        <Line x1={xFor(comparison.startWeek)} x2={xFor(comparison.startWeek)} y1={top - 6} y2={top + 2} stroke="#263B45" strokeWidth={2} />
        <Line x1={xFor(comparison.endWeek)} x2={xFor(comparison.endWeek)} y1={top - 6} y2={top + 2} stroke="#263B45" strokeWidth={2} />
      </> : null}
      {weekAxis
        ? weekTicks.map(week => <SvgText key={week} x={xFor(week)} y={plotH + top + 24} fill="#263B45" fontSize={present ? 18 : 14} textAnchor="middle">{week}</SvgText>)
        : [0, 2, 4, 6, 8, 10].map(month => <SvgText key={month} x={left + (month + .5) * plotW / 12} y={plotH + top + 24}
          fill="#263B45" fontSize={present ? 18 : 14} textAnchor="middle">{['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'][month / 2]}</SvgText>)}
    </Svg>
    <View style={{ position: 'absolute', left, right: 0, top, height: plotH, flexDirection: 'row' }}>
      {MONTHS.map((month, index) => <Pressable key={month} accessibilityRole="button" accessibilityLabel={`${month}. ${years.map(year => {
        const summary = summarizeTrendMonth(series[year] ?? [], index, metric, measure);
        return `${year}: ${fmt(summary.value, metric, measure)}, ${summary.trips == null ? 'trips not given' : `${summary.trips} trips`}`;
      }).join('. ')}`}
        onPress={() => onSelect(index)} style={{ width: `${100 / 12}%`, height: '100%' }} />)}
    </View>
  </View>;
}
export function TrendChartScreen({ metric: initialMetric, onBack, onFlag, onTab, onPresentChange, onPlotTouchChange, onReminderVisibilityChange, onNeedsReview, custom = false }: {
  metric: TrendMetric; onBack: () => void; onFlag: (snapshot: ReturnType<typeof makeTrendSnapshot>) => void; onTab: (tab: string) => void;
  onPresentChange: (show: boolean) => void; onPlotTouchChange: (touching: boolean) => void; onReminderVisibilityChange: (show: boolean) => void; onNeedsReview: () => void; custom?: boolean;
}) {
  const { data, change } = usePrototype();
  const changeRef = useRef(change);
  changeRef.current = change;
  const reminderVisibilityRef = useRef(onReminderVisibilityChange);
  reminderVisibilityRef.current = onReminderVisibilityChange;
  const topSpecies = data?.records.filter(record => !record.deleted && new Date(record.date).getFullYear() === DEMO_YEAR && ['Saved', 'Waiting to send', 'Sent'].includes(record.status))
    .flatMap(record => record.lines).reduce<Record<string, number>>((totals, line) => {
      const weight = numberValue(line.weight);
      if (weight !== null) totals[line.speciesId] = (totals[line.speciesId] ?? 0) + weight;
      return totals;
    }, {});
  const speciesSeenThisYear = data?.records.filter(record => !record.deleted && new Date(record.date).getFullYear() === DEMO_YEAR && ['Saved', 'Waiting to send', 'Sent'].includes(record.status))
    .flatMap(record => record.lines).reduce<Record<string, number>>((totals, line) => {
      totals[line.speciesId] = (totals[line.speciesId] ?? 0) + 1;
      return totals;
    }, {});
  const mostRecordedSpecies = topSpecies ? Object.entries(topSpecies).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Rabbit fish' : 'Rabbit fish';
  const seed = chartSession;
  const seededMetric = seed?.metric ?? initialMetric;
  const [metric, setMetric] = useState(seededMetric), [requestedRange, setRequestedRange] = useState(seed?.range ?? data?.trends?.rangeChoice ?? '3 years');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(seed?.selectedMonth ?? null), [focusedYear, setFocusedYear] = useState<number | null>(seed?.focusedYear ?? null);
  const [view, setView] = useState<'Chart' | 'List'>(seed?.view ?? data?.trends?.chartView ?? 'Chart'), [filterOpen, setFilterOpen] = useState(custom), [help, setHelp] = useState(false);
  const [present, setPresent] = useState(false), [filterSpecies, setFilterSpecies] = useState(seed?.species ?? mostRecordedSpecies), [avg, setAvg] = useState(seed?.average ?? data?.trends?.showAverage ?? false);
  const defaultBoatMode = isTimeMetric(seededMetric) ? 'With engine' : 'All';
  const [boatMode, setBoatMode] = useState(isTimeMetric(seededMetric)
    ? seed?.boatMode === 'Without engine' ? 'Without engine' : defaultBoatMode
    : 'All');
  const [measure, setMeasure] = useState<'trip' | 'week'>(seed?.measure ?? 'trip');
  const [selectedGear, setSelectedGear] = useState<string[]>(seed?.gear ?? []);
  const [selectedSite, setSelectedSite] = useState(seed?.site ?? data?.settings.site ?? 'All sites'), [tripCountLabel, setTripCountLabel] = useState('');
  const [fuelOpen, setFuelOpen] = useState(false);
  useEffect(() => {
    chartSession = { metric, range: requestedRange, selectedMonth, focusedYear, view, species: filterSpecies, average: avg,
      boatMode, measure, gear: [...selectedGear], site: selectedSite };
  }, [metric, requestedRange, selectedMonth, focusedYear, view, filterSpecies, avg, boatMode, measure, selectedGear, selectedSite]);
  if (!data) return null;
  const sites = [...new Set(data.records.map(record => record.site).filter(Boolean))];
  const built = buildTrendSeries(data, metric, undefined, filterSpecies, measure, boatMode, selectedGear, selectedSite);
  const actualCurrentPoints = (calculateRecordSeries(data.records, metric, filterSpecies, measure, boatMode, selectedGear, selectedSite)[DEMO_YEAR] ?? [])
    .filter(point => Boolean(point));
  const unavailableCountyBreakdown = ((metric === 'species' || metric === 'price') && filterSpecies !== 'Rabbit fish')
    || selectedGear.length > 0 || (selectedSite !== 'All sites' && selectedSite !== data.settings.site);
  const displayYears = unavailableCountyBreakdown
    ? built.years.filter(year => year === DEMO_YEAR || (built.series[year] ?? []).some((point: any) => point.value !== null))
    : built.years;
  const observedCurrentPoints = (built.series[DEMO_YEAR] ?? []).filter((point: any) => point.value !== null);
  const observedSpan = observedCurrentPoints.length
    ? observedCurrentPoints[observedCurrentPoints.length - 1].week - observedCurrentPoints[0].week + 1 : 0;
  const shortHistory = data.trends?.history === 'None' && observedSpan < 8;
  const rangeOptions = ['This year', ...(displayYears.length >= 2 ? ['2 years'] : []), ...(displayYears.length >= 3 ? ['3 years'] : []),
    ...(displayYears.length >= 5 ? ['5 years'] : []), ...(displayYears.length >= 10 ? ['10 years'] : []),
    ...(![1, 2, 3, 5, 10].includes(displayYears.length) && displayYears.length > 1 ? [`All ${displayYears.length} years`] : [])];
  const defaultRange = rangeOptions.filter(option => option === 'This year' || option === '2 years' || option === '3 years').at(-1) ?? 'This year';
  const range = rangeOptions.includes(requestedRange) ? requestedRange : defaultRange;
  const selectedYearCount = range === 'This year' ? 1 : range.startsWith('All ') ? displayYears.length : Number(range.split(' ')[0]);
  const years = displayYears.slice(0, selectedYearCount);
  const drawn = years.filter(y => !!built.series[y]);
  const actualByWeek = new Map(actualCurrentPoints.map(point => [point.week, point]));
  const series = Object.fromEntries(drawn.map(year => [year, year === DEMO_YEAR && shortHistory
    ? (built.series[year] ?? []).map((point: any) => actualByWeek.get(point.week) ?? { ...point, value: null, trips: null })
    : built.series[year]]));
  const allWeeks = drawn[0] ? series[drawn[0]] : [];
  const currentVals = allWeeks.map((p: any) => p.value).filter((v: number | null) => v !== null);
  const firstObservedWeek = allWeeks.find((point: any) => point.value !== null)?.week ?? 0;
  const lastObservedWeek = [...allWeeks].reverse().find((point: any) => point.value !== null)?.week ?? 53;
  const gapWeek = allWeeks.find((point: any) => point.value === null && point.trips === null
    && point.week > firstObservedWeek && point.week < lastObservedWeek)?.week;
  const comparison = deriveTrendComparison(series, drawn, metric, filterSpecies, measure);
  const headline = comparison.text;
  const yearsForDefinition = drawn.slice(1);
  const hasData = currentVals.length > 0;
  const priorDismissal = [...(data.trendReminderLog ?? [])].reverse().find(item => item.metric === metric && item.range === range && item.choice === 'Not now');
  const runLength = comparison.runLength;
  const reminder = (data.trends?.reminderWeeks ?? 0) > 0
    && ['lower', 'higher'].includes(comparison.direction) && runLength >= (data.trends?.reminderWeeks ?? 0)
    && (!priorDismissal || runLength >= priorDismissal.runLength + 2);
  const reminderId = `reminder-${metric}-${range}-${runLength}`;
  useEffect(() => { if (reminder) void changeRef.current(state => logTrendReminder(state, reminderId, metric, range, runLength)); },
    [reminder, reminderId, metric, range, runLength]);
  useEffect(() => { reminderVisibilityRef.current(reminder); }, [reminder]);
  const snapshot = () => makeTrendSnapshot(data, metric, range, drawn, filterSpecies, measure, boatMode, selectedGear, selectedSite);
  const title = metricTitle(metric, filterSpecies, measure);
  const sourceCaption = data.trends?.history === 'None'
    ? 'Only records made in this app so far. Earlier years show here when county history is loaded.'
    : drawn.map(year => `${year}: ${built.source[year].replace(' · Synthetic sample', '')}${built.source[year].startsWith('From county') ? ' (loaded 3 Nov)' : year === 2025 && data.trends?.history === 'Some' ? ', from August' : ''}`).join('. ');
  const averageSeries = shortHistory ? allWeeks.map((point: any, index: number) => {
    const prior = allWeeks.slice(0, index).filter((candidate: any) => candidate.value !== null).slice(-4);
    return { week: point.week, value: prior.length ? prior.reduce((sum: number, candidate: any) => sum + candidate.value, 0) / prior.length : null };
  }) : undefined;
  const isNoHistoryEmpty = data.trends?.history === 'None'
    && !data.records.some(r => !r.deleted && ['Saved', 'Waiting to send', 'Sent'].includes(r.status));
  if (isNoHistoryEmpty) return <Shell title={title} subtitle={`Showing ${DEMO_YEAR}`} back={onBack} tab="Records" onTab={onTab} offline={data.settings.offline} offlineCompact>
    <Card><Heading>Nothing to chart yet. Charts use saved records.</Heading><Txt>Use Add record to start. Past years can come from the county.</Txt></Card>
  </Shell>;
  const adjustMonth = (delta: number) => setSelectedMonth(v => Math.max(0, Math.min(11, (v ?? 10) + delta)));
  const bandMode = data.trends?.chartLines !== 'Each year as a line' && drawn.length - 1 >= MIN_YEARS_FOR_BAND;
  const lineLegendYears = bandMode ? drawn.slice(0, 1) : data.trends?.chartLines === 'Each year as a line' ? drawn.slice(0, 5) : drawn;
  const readoutMonth = selectedMonth ?? 10;
  const readoutPeriod = selectedMonth === null ? `${MONTHS[readoutMonth]} so far` : MONTHS[readoutMonth];
  const yearsLabel = yearsForDefinition.length ? `${Math.min(...yearsForDefinition)}–${Math.max(...yearsForDefinition)}` : 'no earlier years';
  const summaryIcon = comparison.direction === 'lower' ? 'arrow-down' : comparison.direction === 'higher' ? 'arrow-up' : 'minus';
  const panel = <View style={{ gap: 12 }}>
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
        <Feather name={summaryIcon} size={22} color={C.foreground} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, color: C.foreground, fontSize: present ? 24 : 18, lineHeight: present ? 29 : 23, fontWeight: '600' }}>{headline}</Text>
      </View>
      {comparison.runLength > 0 && comparison.startWeek && comparison.endWeek ? <Text style={{ color: C.mutedForeground, fontSize: 14 }}>
        Longest current stretch: {comparison.runLength} {comparison.runLength === 1 ? 'week' : 'weeks'} · weeks {comparison.startWeek}–{comparison.endWeek}{comparison.trips ? ` · ${comparison.trips} trips observed` : ''}
      </Text> : null}
      <Txt small muted>Compared with {yearsLabel} ({yearsForDefinition.length} earlier years), same weeks. {evidenceLine(data, metric, drawn, measure, boatMode, selectedGear, selectedSite, filterSpecies)}</Txt>
      <Txt small muted>This chart shows what was recorded. It does not show why.</Txt></View>
    {reminder && !present ? <Card><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Feather name="eye" size={20} color={C.foreground} /><Txt bold>{runLength} weeks {comparison.direction} than earlier years. Worth a look together?</Txt></View>
      <ActionBar secondary={<Btn label="Not now" kind="secondary" onPress={() => {
        void change(s => logTrendReminder(s, reminderId, metric, range, runLength, 'Not now'));
      }} />}
        primary={<Btn label="Look closer" onPress={() => {
          void change(s => logTrendReminder(s, reminderId, metric, range, runLength, 'Look closer'));
          onFlag(snapshot());
        }} />} /></Card> : null}
    {!present ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>Chart: {title}</Text></Pressable>
      {metric === 'species' || metric === 'price' ? <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>{speciesName(filterSpecies)}</Text></Pressable> : null}
      {measure === 'week' && (metric === 'total' || metric === 'species') ? <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>Per week</Text></Pressable> : null}
      {boatMode !== 'With engine' && (metric === 'length' || metric === 'perHour') ? <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>{boatMode}</Text></Pressable> : null}
      {selectedGear.length ? <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>Gear: {selectedGear.join(', ')}</Text></Pressable> : null}
      {selectedSite !== 'All sites' ? <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>Site: {selectedSite}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)} style={s.quickChip}><Text style={s.chipLabel}>{range}</Text></Pressable>
    </View> : null}
    {!present ? <View style={{ gap: 2 }}>
      {lineLegendYears.map(year => <Pressable key={year} accessibilityRole="button" onPress={() => setFocusedYear(focusedYear === year ? null : year)}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: focusedYear !== null && focusedYear !== year ? .45 : 1 }}>
        <Svg width={30} height={15}><Line x1="0" x2="28" y1="8" y2="8" stroke={colorForYear(year)} strokeWidth={year === DEMO_YEAR ? 4 : 3} strokeDasharray={dashForYear(year)} /></Svg>
        <View style={{ flex: 1 }}><Text style={{ color: C.foreground, fontSize: 16, fontWeight: '700' }}>{year}{year === DEMO_YEAR ? ' (this year)' : ''}</Text><Text style={{ color: C.mutedForeground, fontSize: 14 }}>{built.source[year]}</Text></View>
      </Pressable>)}
      {bandMode ? <View accessibilityLabel={`Earlier-year range, ${yearsForDefinition.length} years, ${yearsLabel}, sources: ${[...new Set(yearsForDefinition.map(year => built.source[year]))].join(', ')}`}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 12, backgroundColor: '#E3E9E6', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#62788B' }} />
        <View style={{ flex: 1 }}><Text style={{ color: C.foreground, fontSize: 16, fontWeight: '700' }}>Earlier-year range · {yearsForDefinition.length} years</Text>
          <Text style={{ color: C.mutedForeground, fontSize: 14 }}>{yearsLabel} · {[...new Set(yearsForDefinition.map(year => built.source[year]))].join(' + ')}</Text></View>
      </View> : null}
      {!bandMode && data.trends?.chartLines === 'Each year as a line' && drawn.length > 5 ? <Txt small muted>Showing the current year and four earlier lines. Readouts include all {drawn.length} selected years.</Txt> : null}
    </View> : null}
    {!present ? <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Segments value={view} options={['Chart', 'List']} onChange={v => {
          const next = v as 'Chart' | 'List'; setView(next);
          void change(s => ({ ...s, trends: { ...s.trends!, chartView: next } }));
        }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Present chart" onPress={() => { setPresent(true); onPresentChange(true); }} style={[s.button, { minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', gap: 6 }]}>
          <Feather name="maximize-2" size={17} color={C.foreground} /><Text style={s.buttonText}>Present</Text>
        </Pressable>
      </View>
      <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => adjustMonth(-1)} style={s.iconButton}><Feather name="chevron-left" size={24} color={C.foreground} /></Pressable>
           <View style={{ flex: 1, gap: 3 }}><Text style={{ fontWeight: selectedMonth === null ? '400' : '700', color: C.foreground, textAlign: 'center', fontSize: selectedMonth === null ? 14 : present ? 20 : 16 }}>{selectedMonth === null ? 'Tap a month to compare' : readoutPeriod}</Text>
             {selectedMonth !== null ? drawn.map(year => {
               const summary = summarizeTrendMonth(series[year] ?? [], readoutMonth, metric, measure);
              return <View key={year} style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <Svg width={25} height={14}><Line x1="0" x2="24" y1="7" y2="7" stroke={colorForYear(year)} strokeWidth={year === DEMO_YEAR ? 4 : 3} strokeDasharray={dashForYear(year)} /></Svg>
                 <Text style={{ flex: 1, color: C.foreground, fontSize: present ? 20 : 16 }}>{year}: {fmt(summary.value, metric, measure)}</Text>
                 <Text style={{ color: C.mutedForeground, fontSize: present ? 16 : 14 }}>{summary.trips == null ? 'Trips not given' : `${summary.trips} trips`}</Text>
              </View>;
            }) : null}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => adjustMonth(1)} style={s.iconButton}><Feather name="chevron-right" size={24} color={C.foreground} /></Pressable>
      </View>
      {view === 'Chart' ? <TrendChartSvg series={series} years={drawn} metric={metric} species={filterSpecies} measure={measure} selectedMonth={selectedMonth} onSelect={setSelectedMonth} focusedYear={focusedYear} present={present} onTouch={onPlotTouchChange} showAverage={avg || shortHistory} showBand={data.trends?.chartLines !== 'Each year as a line'} comparison={comparison} averageSeries={averageSeries} weekAxis={shortHistory} />
        : <View style={{ gap: 0 }}>
          <ScrollView stickyHeaderIndices={[0]} nestedScrollEnabled style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 0 }}>
            <View style={{ flexDirection: 'row', minHeight: 48, alignItems: 'center', backgroundColor: C.seaGlass, zIndex: 2 }}>
              <Text style={{ width: 56, fontSize: 14, fontWeight: '700', color: C.foreground }}>Month</Text>
              {drawn.map(year => <Text key={year} style={{ flex: 1, minWidth: 34, fontSize: 16, fontWeight: '700', color: C.foreground, textAlign: 'right' }}>{year}</Text>)}
            </View>
            {MONTHS.map((month, index) => <Pressable key={month} onPress={() => setSelectedMonth(index)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.border, backgroundColor: selectedMonth === index ? C.seaGlass : C.card }}>
              <Text style={{ width: 56, fontSize: 16, color: C.foreground, fontWeight: selectedMonth === index ? '700' : '400' }}>{month.slice(0, 3)}</Text>
              {drawn.map(year => {
                const summary = summarizeTrendMonth(series[year] ?? [], index, metric, measure);
                const monthlyValue = summary.value;
                return <Text key={year} accessibilityLabel={`${year}: ${fmt(monthlyValue, metric, measure)}; ${summary.trips} trips${summary.missingWeight ? `; ${summary.missingWeight} missing weights` : ''}${summary.missingTimes ? `; ${summary.missingTimes} missing times` : ''}`}
                  style={{ flex: 1, minWidth: 34, textAlign: 'right', fontSize: 16, fontWeight: year === DEMO_YEAR ? '700' : '400', color: C.foreground }}>{monthlyValue == null ? '–' : Number(monthlyValue).toFixed(1)}</Text>;
             })}
            </Pressable>)}
            <Text style={{ minHeight: 32, paddingTop: 8, color: C.mutedForeground, fontSize: 14 }}>– means no records</Text>
          </ScrollView>
        </View>}
      {bandMode ? <Txt small muted>The earlier-year band uses {yearsForDefinition.length} years with data at each week. It is not a limit.</Txt> : null}
      {shortHistory ? <Notice><Txt>This is an early-season view with fewer than eight weeks recorded. Dashed line is the average of previous recorded weeks; season timing may explain a change.</Txt></Notice> : null}
      <View><Text style={{ fontSize: 14, color: C.mutedForeground }}>Trips recorded</Text><View style={{ flexDirection: 'row', gap: 2, height: 40, alignItems: 'flex-end' }}>{(series[DEMO_YEAR] ?? []).slice(0, 52).map((p: any, i: number) =>
        <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Week ${i + 1}: ${p.trips ?? 'Trips not given'}`} onPress={() => setTripCountLabel(p.trips === null ? `Week ${i + 1}: Trips not given` : `Week ${i + 1}: ${p.trips} trips recorded`)} style={{ flex: 1, height: p.trips == null ? 4 : Math.max(5, Math.min(38, p.trips)), backgroundColor: p.trips == null ? '#E3E9E6' : '#A9B7B3' }} />)}</View>
        {tripCountLabel ? <Text style={{ minHeight: 32, paddingTop: 6, fontSize: 14, color: C.foreground }}>{tripCountLabel}</Text> : null}</View>
      <Text style={{ fontSize: 14, lineHeight: 20, color: C.foreground }}>{evidenceLine(data, metric, drawn, measure, boatMode, selectedGear, selectedSite, filterSpecies)}</Text>
      {allWeeks.some((p: any) => p.trips === 2) ? <Txt small muted>Based on 2 trips</Txt> : null}
      {gapWeek ? <Txt small muted>No records for week {gapWeek} (not recorded, or not loaded).</Txt> : null}
      {allWeeks.some((p: any) => p.missingWeight === 2 && p.trips === 5) ? <Txt small muted>In two thin-data weeks, 3 of 5 trips have a weight.</Txt> : null}
      {isTimeMetric(metric) ? <Txt small muted>{boatMode === 'Without engine'
        ? 'Without-engine boats only. Invalid or incomplete times are excluded. Hours include travelling, waiting and searching; they are not engine hours.'
        : 'Engine boats only. Invalid or incomplete times are excluded. Hours include travelling, waiting and searching; they are not fishing time.'}</Txt> : null}
      {metric === 'length' || metric === 'perHour' ? <Pressable accessibilityRole="button" onPress={() => setFuelOpen(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: C.primary, fontSize: 15 }}>Fuel is not recorded</Text></Pressable> : null}
    </Card> : null}
    {!present ? <View style={{ gap: 8 }}>
      <View style={s.wrap}>{rangeOptions.map(option =>
        <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: range === option }} onPress={() => {
          setRequestedRange(option); void change(s => ({ ...s, trends: { ...s.trends!, rangeChoice: option } }));
        }} style={[s.quickChip, range === option && s.quickChipSelected]}>
          {range === option ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{option}</Text></Pressable>)}</View>
      {displayYears.length < 10 ? <Txt small muted>More years will show when county history is loaded.</Txt> : null}
       <Pressable accessibilityRole="button" accessibilityLabel="Chart definitions" onPress={() => setHelp(true)}
         style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
         <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: C.primary, justifyContent: 'center', alignItems: 'center' }}>
           <Feather name="info" size={20} color={C.primary} />
         </View><Text style={{ color: C.primary, fontSize: 15, fontWeight: '600' }}>How this measure is calculated</Text>
       </Pressable>
      <Pressable accessibilityRole="button" onPress={onNeedsReview} style={{ minHeight: 48, justifyContent: 'center' }}>
        <Text style={{ color: C.primary, fontSize: 14 }}>{excludedRecordCount(data, 'review')} records not included (need review). Check records.</Text>
      </Pressable>
      {!hasData ? <Txt small muted>Nothing to flag yet: no records in this range.</Txt> : null}
      {excludedRecordCount(data) > excludedRecordCount(data, 'review') ? <Txt small muted>{excludedRecordCount(data) - excludedRecordCount(data, 'review')} draft records are also not included.</Txt> : null}
      <Btn label="Flag for county" kind="secondary" icon="flag" disabled={!hasData || (sites.length > 1 && selectedSite === 'All sites')} onPress={() => onFlag(snapshot())} />
      {sites.length > 1 && selectedSite === 'All sites' ? <Txt small muted>Choose one site before flagging. Boat and fisher filters are not available.</Txt> : null}
      <Txt small muted>County figures may be counted differently from this app.</Txt>
       {unavailableCountyBreakdown ? <Txt small muted>County history has no breakdown for this species, gear or site selection; only matching app records are shown.</Txt> : null}
      <Txt small muted>{sourceCaption} · Synthetic sample · Demo data, not real catches.</Txt>
    </View> : null}
    {help ? <Overlay title="Reading this chart" size="medium" onClose={() => setHelp(false)}>
      <View style={{ gap: 12 }}>
        <Txt>The current year is the thicker line. Each-year view draws up to four earlier lines; with enough history, the band summarizes all earlier years with data at each week. Gaps mean no records for that week. The band is not a target or a limit.</Txt>
        <Heading>How the measures work</Heading>
        <Txt>{boatMode === 'Without engine'
          ? 'Trip hours use valid time-in and time-out for the selected non-engine boats. Invalid or incomplete times are excluded. Hours include travelling, waiting and searching; they are not fishing time.'
          : 'Trip hours use valid time-in and time-out for engine boats only. Invalid or incomplete times are excluded. Hours include travelling, waiting and searching; they are not fishing time.'}</Txt>
        <Txt>Catch per trip hour is a ratio of sums: total kg with valid weights divided by valid trip hours for the selected boat group. Trips without a weight or valid time are excluded from that calculation.</Txt>
        <Txt>Price per kg is weighted by kilograms, not a simple average of weekly prices. Weeks with no matching records are not treated as zero.</Txt>
        <Text style={{ color: C.mutedForeground, fontSize: 14 }}>Demo data, not real catches · Synthetic sample</Text></View>
    </Overlay> : null}
    {fuelOpen ? <Overlay title="Not recorded yet" size="medium" onClose={() => setFuelOpen(false)}>
      <Txt>{boatMode === 'Without engine'
        ? 'Fuel quantity and cost are not recorded. The selected non-engine trip hours are not a fuel measure; they include travelling, waiting and searching. Invalid or incomplete times are left out.'
        : 'Fuel quantity and cost are not recorded. Engine-only trip hours are only a rough clue: they include travelling, waiting and searching, and longer trips may not use more fuel. Invalid or incomplete times are left out. This chart cannot say why a trip took longer.'}</Txt>
      <Btn label="Show trip length" kind="secondary" closeOnPress onPress={() => { setMetric('length'); setBoatMode('With engine'); setFuelOpen(false); return true; }} />
      <Btn label="Show price per kg" kind="secondary" closeOnPress onPress={() => { setMetric('price'); setFilterSpecies(mostRecordedSpecies); setBoatMode('All'); setFuelOpen(false); return true; }} />
      <Txt small muted>Price per kg is recorded separately; it does not estimate fuel cost.</Txt>
    </Overlay> : null}
    {filterOpen ? <Overlay title="Chart settings" onClose={() => setFilterOpen(false)} footer={<ActionBar
       secondary={<Btn label="Reset" kind="secondary" onPress={() => { setMeasure('trip'); setFilterSpecies(mostRecordedSpecies); setRequestedRange(defaultRange); setBoatMode(isTimeMetric(metric) ? 'With engine' : 'All'); setSelectedGear([]); setSelectedSite('All sites'); }} />}
      primary={<Btn label="Show chart" onPress={() => { void change(s => ({ ...s, trends: { ...s.trends!, rangeChoice: range } })); setFilterOpen(false); }} />} />}>
      <Heading>Measure</Heading>
      {metric === 'total' || metric === 'species' ? <Choices label="Unit" options={['Per trip', 'Per week']} value={measure === 'trip' ? 'Per trip' : 'Per week'} onChange={v => setMeasure(v === 'Per week' ? 'week' : 'trip')} /> : null}
      <Choices label="Chart" options={QUESTIONS.map(q => q.chart)} value={QUESTIONS.find(q => q.metric === metric)?.chart ?? 'Total catch'} onChange={v => {
        const nextMetric = QUESTIONS.find(q => q.chart === v)!.metric;
        setMetric(nextMetric);
        setBoatMode(isTimeMetric(nextMetric) ? 'With engine' : 'All');
      }} rows />
       {metric === 'species' || metric === 'price' ? <Select label="Species" value={filterSpecies} allowEmpty={false}
         options={SPECIES.map(item => ({ value: item.id, label: `${item.common}${item.local ? ` (${item.local})` : ''}` }))}
         recentValues={Object.entries(speciesSeenThisYear ?? {}).sort((a, b) => b[1] - a[1]).map(([speciesId]) => speciesId)}
         recentLabel="Seen this year" onChange={setFilterSpecies} /> : null}
      <Heading>Years</Heading>
        {['This year', '2 years', '3 years', '5 years', '10 years', ...(![1, 2, 3, 5, 10].includes(displayYears.length) && displayYears.length > 1 ? [`All ${displayYears.length} years`] : [])].map(option => {
        const available = rangeOptions.includes(option);
          const count = option === 'This year' ? 1 : option.startsWith('All ') ? displayYears.length : Number(option.split(' ')[0]);
          const fullLabel = option === 'This year' ? 'This year' : option.startsWith('All ') ? `All ${displayYears.length} years`
           : count === 2 ? 'This year and last year' : `This year and last ${count - 1} years`;
        return <View key={option}><Pressable accessibilityRole="radio" accessibilityState={{ selected: range === option, disabled: !available }} disabled={!available}
           onPress={() => { setRequestedRange(option); void change(s => ({ ...s, trends: { ...s.trends!, rangeChoice: option } })); }} style={[s.pickerRow, !available && { opacity: .45 }, range === option && s.quickChipSelected]}>
           <Text style={s.pickerRowText}>{fullLabel}</Text>{range === option ? <Feather name="check-circle" size={20} color={C.primary} /> : null}</Pressable>
            {!available ? <Text style={{ fontSize: 14, color: C.mutedForeground, paddingHorizontal: 12 }}>Needs {Math.max(0, count - 1)} earlier {count - 1 === 1 ? 'year' : 'years'}; {Math.max(0, displayYears.length - 1)} available.</Text> : null}
        </View>;
      })}
      {isTimeMetric(metric) ? <><Heading>Boats</Heading><Choices label="Boats" options={['With engine', 'Without engine']} value={boatMode} onChange={setBoatMode} />
        <Pressable accessibilityRole="radio" accessibilityState={{ disabled: true }} disabled style={[s.pickerRow, { opacity: 0.45 }]}><Text style={s.pickerRowText}>All · unavailable</Text></Pressable>
        <Text style={{ fontSize: 14, lineHeight: 20, color: C.mutedForeground }}>Choose one boat group. All would mix engine and non-engine trips.</Text></> : null}
       <Heading>Gear</Heading><View style={s.wrap}>{GEARS.map(gear =>
        <Pressable key={gear} accessibilityRole="checkbox" accessibilityState={{ checked: selectedGear.includes(gear) }} onPress={() => setSelectedGear(current => current.includes(gear) ? current.filter(v => v !== gear) : [...current, gear])}
          style={[s.quickChip, selectedGear.includes(gear) && s.quickChipSelected]}>{selectedGear.includes(gear) ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{gear}</Text></Pressable>)}</View>
       {sites.length > 1 ? <><Heading>Site</Heading>
         <Choices label="Site" options={['All sites', ...sites]} value={selectedSite} onChange={setSelectedSite} /></> : null}
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: avg }} onPress={() => { setAvg(v => !v); void change(s => ({ ...s, trends: { ...s.trends!, showAverage: !avg } })); }}
        style={[s.settingRow, { minHeight: 48 }]}><Text style={{ flex: 1, color: C.foreground }}>Show average of earlier years</Text><Feather name={avg ? 'check-square' : 'square'} size={20} color={C.primary} /></Pressable>
    </Overlay> : null}
  </View>;
  if (present) return <Shell title={title} subtitle={`${drawn.length > 1 ? `This year + ${drawn.length - 1} earlier years` : 'This year'} · ${range}`}
    headerRight={<Pressable accessibilityRole="button" accessibilityLabel="Close presentation" onPress={() => { setPresent(false); onPresentChange(false); }}
      style={[s.iconButton, { minWidth: 72, height: 48, flexDirection: 'row', gap: 4, paddingHorizontal: 8 }]}><Feather name="x" size={20} color={C.foreground} /><Text style={s.buttonText}>Close</Text></Pressable>}
    contentGap={10}>
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}><Feather name={summaryIcon} size={22} color={C.foreground} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, color: C.foreground, fontSize: 24, lineHeight: 29, fontWeight: '700' }}>{headline}</Text></View>
      <Text style={{ color: C.mutedForeground, fontSize: 16 }}>{yearsForDefinition.length ? `Compared with ${yearsLabel} (${yearsForDefinition.length} earlier years), same weeks.` : 'No earlier years are loaded yet.'}</Text>
      <Text style={{ color: C.mutedForeground, fontSize: 16 }}>Demo data, not real catches · Synthetic sample · {sourceCaption}</Text>
    </View>
    <View style={{ gap: 4 }}>
      {lineLegendYears.map(year => <View key={year} style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Svg width={30} height={15}><Line x1="0" x2="28" y1="8" y2="8" stroke={colorForYear(year)} strokeWidth={year === DEMO_YEAR ? 4 : 3} strokeDasharray={dashForYear(year)} /></Svg>
        <Text style={{ color: C.foreground, fontSize: 16, fontWeight: '700' }}>{year === DEMO_YEAR ? `${year} · this year` : `${year} · ${built.source[year]}`}</Text>
      </View>)}
      {bandMode ? <View style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 12, backgroundColor: '#E3E9E6', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#62788B' }} />
        <Text style={{ color: C.foreground, fontSize: 16 }}>Earlier-year range · {yearsForDefinition.length} years ({yearsLabel})</Text>
      </View> : null}
    </View>
    <View style={{ flexDirection: 'row', minHeight: 48, alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => adjustMonth(-1)} style={s.iconButton}><Feather name="chevron-left" size={24} color={C.foreground} /></Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: C.foreground, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{readoutPeriod}</Text>
        {drawn.map(year => {
          const summary = summarizeTrendMonth(series[year] ?? [], readoutMonth, metric, measure);
          return <Text key={year} style={{ color: C.foreground, fontSize: 20 }}>{year}: {fmt(summary.value, metric, measure)} · {summary.trips ?? 'Trips not given'}</Text>;
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => adjustMonth(1)} style={s.iconButton}><Feather name="chevron-right" size={24} color={C.foreground} /></Pressable>
    </View>
    <TrendChartSvg series={series} years={drawn} metric={metric} species={filterSpecies} measure={measure} selectedMonth={selectedMonth} onSelect={setSelectedMonth} focusedYear={focusedYear} present onTouch={onPlotTouchChange} showAverage={avg || shortHistory} showBand={data.trends?.chartLines !== 'Each year as a line'} comparison={comparison} averageSeries={averageSeries} weekAxis={shortHistory} />
    <Text style={{ color: C.mutedForeground, fontSize: 16 }}>{evidenceLine(data, metric, drawn, measure, boatMode, selectedGear, selectedSite, filterSpecies)}</Text>
  </Shell>;
  return <Shell title={title} titleSize={16} subtitle={`Showing ${drawn.join(', ')}`} back={onBack} tab="Records" onTab={onTab}
    scrollKey={`TrendChart-${metric}`} initialScrollOffset={chartScrollOffsets[metric] ?? 0}
    onScrollOffset={value => { chartScrollOffsets[metric] = value; }}
    offline={data.settings.offline} offlineCompact contentGap={12}>
    <Pressable accessibilityRole="button" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)}
      style={[s.filterButton, { alignSelf: 'flex-start' }]}>
      <Feather name="filter" size={18} color={C.foreground} /><Text style={s.filterLabel}>Filter</Text>
    </Pressable>
    <Text style={{ fontSize: 14, color: C.mutedForeground }}>{shortHistory
      ? `${currentVals.length} recorded weeks this year · No earlier county history · Demo data, not real catches`
      : 'Nov so far, 14 days · Demo data, not real catches · Synthetic sample'}</Text>
    {panel}
  </Shell>;
}

