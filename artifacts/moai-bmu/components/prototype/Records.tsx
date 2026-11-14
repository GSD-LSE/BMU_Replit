import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { usePrototype } from '@/lib/prototype/store';
import {
  SPECIES, dayKey, dayLabel, dayPriceFor, differences, displayStatus, emptyFilters, filterRecords, numberValue, recordCount, readyToSend, saveEdit, setDayPrice, speciesName, timeLabel, totalText, totals,
  validNumbers, validRange, type CatchRecord, type Filters,
} from '@/lib/prototype/model';
import { BoatDetails, BoatFields, GearTrip } from './RecordFields';
import { configureLayoutMotion, useMotionPrefs } from './motion';
import { updateSavedBoat } from './AddWizard';
import { CatchReview, SpeciesPicker } from './CatchReview';
import { ActionBar, Btn, C, Card, Choices, Field, Heading, Notice, Overlay, Select, Shell, StatusChip, Txt, s, useScrollTo } from './ui';

let recordListScrollY = 0;
export function RecordRow({ r, onOpen, onEdit }: { r: CatchRecord; onOpen: () => void; onEdit: () => void }) {
  const { data } = usePrototype();
  const action = r.status === 'Draft' ? 'Resume' : r.status === 'Needs review' ? 'Review' : 'Edit';
  const t = totals(r.lines);
  const measurements = t.weight !== null && t.value !== null
    ? `${t.weight.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg · Ksh ${t.value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
    : r.noCatch ? 'No catch from this fisher' : 'No weight or price yet';
  const title = `${r.boatName || 'Boat not chosen'} · ${timeLabel(r.date)}`;
  const fisher = data?.fishers.find(f => f.id === r.fisherId)?.name ?? 'No fisher';
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (!r.editedAt) return;
    const age = Date.now() - new Date(r.editedAt).getTime();
    if (age < 1500) { setHighlight(true); const timer = setTimeout(() => setHighlight(false), 1500 - age); return () => clearTimeout(timer); }
  }, [r.editedAt]);
  return <View style={[s.card, s.compactRecordCard]}>
    <Pressable testID={`record-${r.id}`} onPress={onOpen} accessibilityRole="button"
      accessibilityLabel={`Open ${title} record. ${fisher}. ${displayStatus(r)}. ${measurements}`}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }} />
    <View pointerEvents="none" style={{ gap: 0 }}>
      <View style={[s.row, { minHeight: 44, justifyContent: 'space-between', paddingRight: 88 }]}>
        <Text numberOfLines={1} style={s.compactRecordTitle}>{title}</Text>
      </View>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Txt small>{fisher}</Txt><StatusChip status={displayStatus(r)} />
      </View>
      <Text numberOfLines={1} style={s.daySummary}>{measurements}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${action} record, ${r.boatName} ${timeLabel(r.date)}`}
      testID={`edit-${r.id}`} onPress={onEdit}
      style={[s.compactEdit, RECORD_EDIT_ICON_ONLY && { minWidth: 48, paddingHorizontal: 0 }, { position: 'absolute', top: 4, right: 8, zIndex: 2 }]}>
      <Feather name={r.status === 'Draft' ? 'arrow-right' : 'edit-3'} size={24} color={C.primary} />
      {!RECORD_EDIT_ICON_ONLY ? <Text style={s.compactEditText}>{action}</Text> : null}
    </Pressable>
    {r.editedAt ? <Text style={[s.daySummary, highlight && s.editedHighlight]}>{r.sentAt ? 'Edited after sending' : 'Edited just now'}</Text> : null}
  </View>;
}
// B4 comparison toggle: set true to evaluate the icon-only Edit control against the labelled default.
export const RECORD_EDIT_ICON_ONLY = false;
function dayGroupSummary(group: CatchRecord[]) {
  const rows = group.map(record => totals(record.lines));
  const withWeight = rows.filter(value => value.weight !== null).length;
  const withPrice = rows.filter(value => value.value !== null).length;
  const weight = rows.reduce((sum, value) => sum + (value.weight ?? 0), 0);
  const price = rows.reduce((sum, value) => sum + (value.value ?? 0), 0);
  const parts = [
    dayLabel(group[0].date),
    recordCount(group.length),
    withWeight ? `${weight.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg` : 'No weight yet',
    withPrice ? `Ksh ${price.toLocaleString('en-KE', { maximumFractionDigits: 2 })}` : 'No price yet',
  ];
  if (withWeight < group.length) parts.push(`(${withWeight} of ${group.length} have weights)`);
  if (withPrice < group.length) parts.push(`(${withPrice} of ${group.length} have prices)`);
  return parts.join(' · ');
}
export function RecordList({ onTab, onOpen, onEdit, onResume, onResumeEdit }: {
  onTab: (tab: string) => void; onOpen: (r: CatchRecord) => void; onEdit: (r: CatchRecord) => void;
  onResume: (r: CatchRecord) => void; onResumeEdit: () => void;
}) {
  const { data, change } = usePrototype();
  const [filtersOpen, setFiltersOpen] = useState(false), [filterSection, setFilterSection] = useState('Time');
  if (!data) return null;
  const filters = data.filters, records = filterRecords(data).sort((a, b) => Number(b.status === 'Draft') - Number(a.status === 'Draft') || b.date.localeCompare(a.date));
  const patchFilters = (patch: Partial<Filters>) => { void change(s => ({ ...s, filters: { ...s.filters, ...patch } })); };
  const openFilters = (section = 'Time') => { setFilterSection(section); setFiltersOpen(true); };
  const timeText = filters.days === 'all' ? 'All time' : filters.days === 'custom' ? `${dayLabel(`${filters.from}T12:00:00`)} to ${dayLabel(`${filters.to}T12:00:00`)}` : filters.days === 'yesterday' ? 'Yesterday' : filters.days === '1' ? 'Today' : `Last ${filters.days} days`;
  const hasQuickStatus = filters.statuses.length === 1 && ['Needs review', 'Saved', 'Sent'].includes(filters.statuses[0]);
  const extras = [
    ...filters.statuses.filter(status => !(hasQuickStatus && ['Needs review', 'Saved', 'Sent'].includes(status)))
      .map(status => ({ label: status, clear: () => patchFilters({ statuses: filters.statuses.filter(v => v !== status) }) })),
    filters.boatId ? { label: `Boat: ${data.boats.find(b => b.id === filters.boatId)?.name ?? 'Selected'}`, clear: () => patchFilters({ boatId: '' }) } : null,
    filters.fisherId ? { label: `Fisher: ${data.fishers.find(f => f.id === filters.fisherId)?.name ?? 'Selected'}`, clear: () => patchFilters({ fisherId: '' }) } : null,
    ...filters.species.map(sp => ({ label: speciesName(sp), clear: () => patchFilters({ species: filters.species.filter(v => v !== sp) }) })),
  ].filter((v): v is { label: string; clear: () => void } => !!v);
  const activeFilterCount = extras.length + Number(filters.statuses.length > 0 && hasQuickStatus) + Number(filters.days !== '7') + Number(!!filters.search.trim());
  const reviewQuick = filters.statuses.length === 1 && filters.statuses[0] === 'Needs review';
  const readyQuick = filters.statuses.length === 1 && filters.statuses[0] === 'Saved';
  const sentQuick = filters.statuses.length === 1 && filters.statuses[0] === 'Sent';
  const readyCount = data.records.filter(r => !r.deleted && readyToSend(r)).length;
  const nodes: React.ReactNode[] = [
    <View key="toolbar" style={{ gap: 8 }}>
      <View style={s.recordToolbar}>
        <View style={s.searchWrap}><Feather name="search" size={20} color={C.mutedForeground} />
          <TextInput accessibilityLabel="Search boat or fisher" placeholder="Search boat or fisher" placeholderTextColor={C.mutedForeground}
            value={filters.search} onChangeText={search => patchFilters({ search })} style={s.searchInput} returnKeyType="search" />
          {filters.search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => patchFilters({ search: '' })} style={s.searchClear}><Feather name="x" size={20} color={C.foreground} /></Pressable> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Filter${activeFilterCount ? `, ${activeFilterCount} active` : ''}`} onPress={() => openFilters()}
          style={[s.filterButton, activeFilterCount > 0 && s.filterButtonActive]}>
          <Feather name="filter" size={18} color={activeFilterCount ? C.primary : C.foreground} /><Text style={[s.filterLabel, activeFilterCount > 0 && { color: C.primary }]}>Filter</Text>
          {activeFilterCount ? <Text style={s.filterBadge}>{activeFilterCount}</Text> : null}
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
        <Pressable accessibilityRole="button" style={s.timeChip} onPress={() => openFilters()}><Text style={s.chipLabel}>{timeText}</Text><Feather name="chevron-down" size={16} color={C.foreground} /></Pressable>
        {[['Needs review', reviewQuick], ['Ready to send', readyQuick], ['Sent', sentQuick]].map(([label, active]) =>
          <Pressable key={String(label)} accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => {
            const status = label === 'Needs review' ? 'Needs review' : label === 'Ready to send' ? 'Saved' : 'Sent';
            patchFilters({ statuses: active ? [] : [status] });
          }} style={[s.quickChip, active && s.quickChipSelected]}>
            {active ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{String(label)}</Text>
          </Pressable>)}
        {extras.map(v => <View key={v.label} style={s.appliedChip}><Pressable accessibilityRole="button" onPress={() => openFilters(v.label.startsWith('Boat:') ? 'Boat' : v.label.startsWith('Fisher:') ? 'Fisher' : SPECIES.some(sp => speciesName(sp.id) === v.label) ? 'Species' : 'Status')} style={s.appliedChipBody}><Text numberOfLines={1} style={s.chipLabel}>{v.label}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${v.label} filter`} onPress={v.clear} style={s.chipX}><Feather name="x" size={16} color={C.foreground} /></Pressable></View>)}
        {extras.length >= 2 ? <Pressable onPress={() => patchFilters(emptyFilters())} style={s.clearChip}><Text style={s.chipLabel}>Clear</Text></Pressable> : null}
      </ScrollView>
      <Txt bold>{recordCount(records.length)}</Txt>
      {data.edit ? <Btn label="Resume unsaved edit" kind="secondary" onPress={onResumeEdit} /> : null}
    </View>,
  ];
  const sticky: number[] = [];
  for (const day of [...new Set(records.map(r => dayKey(r.date)))]) {
    const group = records.filter(r => dayKey(r.date) === day);
    sticky.push(nodes.length);
     nodes.push(<View key={`day-${day}`} style={{ backgroundColor: C.background, paddingVertical: 10 }}><Text style={[s.daySummary, { fontWeight: '700' }]}>{dayGroupSummary(group)}</Text></View>);
      for (const r of group) nodes.push(<RecordRow key={r.id} r={r} onOpen={() => onOpen(r)}
        onEdit={() => r.status === 'Draft' || r.status === 'Needs review' ? onResume(r) : onEdit(r)} />);
  }
  if (!records.length) nodes.push(<Card key="empty"><Txt>No records match{filters.search ? ` "${filters.search}"` : ' these filters'}.</Txt>
    <Txt small muted>{extras.length ? `Filters: ${extras.map(e => e.label).join(' · ')}` : `Time: ${timeText}`}</Txt>
    <Btn label={filters.search ? 'Clear search' : 'Clear filters'} kind="secondary"
      onPress={() => patchFilters(filters.search ? { search: '' } : emptyFilters())} /></Card>);
  if (filtersOpen) nodes.push(<FilterOverlay key="filters" initialSection={filterSection} onClose={() => setFiltersOpen(false)} />);
  return <Shell title="Records" tab="Records" onTab={onTab} offline={data.settings.offline} offlineCompact contentGap={8} stickyIndices={sticky}
    initialScrollOffset={recordListScrollY} onScrollOffset={value => { recordListScrollY = value; }}
    footer={readyQuick ? <Btn label={`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`} disabled={!readyCount} onPress={() => onTab('Send')} /> : undefined}>{nodes}</Shell>;
}
function FilterHeading({ title, initialSection }: { title: string; initialSection: string }) {
  const scrollTo = useScrollTo(), y = useRef(0);
  useEffect(() => { if (title !== initialSection) return; const timer = setTimeout(() => scrollTo(y.current), 260); return () => clearTimeout(timer); }, [initialSection, scrollTo, title]);
  return <Text onLayout={event => { y.current = event.nativeEvent.layout.y; }} style={s.filterSection}>{title}</Text>;
}
function FilterOverlay({ onClose, initialSection = 'Time' }: { onClose: () => void; initialSection?: string }) {
  const { data, change } = usePrototype();
  const reduceMotion = useMotionPrefs();
  const [f, setF] = useState<Filters>(data!.filters);
  const [picker, setPicker] = useState<'boat' | 'fisher' | 'species' | ''>('');
  const [monthOffset, setMonthOffset] = useState(0), [calendarStart, setCalendarStart] = useState(f.days === 'custom' ? f.from : '');
  const [query, setQuery] = useState('');
  const patch = (p: Partial<Filters>) => setF(current => ({ ...current, ...p }));
  if (!data) return null;
  const count = filterRecords(data, f).length;
  const rangeGood = f.days !== 'custom' || validRange(f.from, f.to);
  const activeCalendar = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return d;
  })();
  const daysInMonth = new Date(activeCalendar.getFullYear(), activeCalendar.getMonth() + 1, 0).getDate();
  const weekdayOffset = (new Date(activeCalendar.getFullYear(), activeCalendar.getMonth(), 1).getDay() + 6) % 7;
  const fmtDate = (y: number, m: number, day: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const chooseDate = (key: string) => {
    if (!calendarStart || f.days !== 'custom' || (f.from && f.to)) { setCalendarStart(key); patch({ days: 'custom', from: key, to: '' }); }
    else if (key < calendarStart) { setCalendarStart(key); patch({ from: key, to: '' }); }
    else patch({ days: 'custom', from: calendarStart, to: key });
  };
  const pickerItems = picker === 'boat' ? [{ value: '', label: 'Any boat' }, ...data.boats.filter(b => !b.archived).map(b => ({ value: b.id, label: b.name }))]
    : picker === 'fisher' ? [{ value: '', label: 'Any fisher' }, ...data.fishers.filter(fisher => !fisher.archived).map(fisher => ({ value: fisher.id, label: fisher.name }))]
      : [...new Map(SPECIES.map(item => [item.id, { value: item.id, label: speciesName(item.id), group: item.group }])).values()];
  const pickerQuery = picker === 'boat' ? 'Search boats' : picker === 'fisher' ? 'Search fishers' : 'Search species';
  if (!data) return null;
  return <Overlay key={picker || 'filters'} variant={picker ? 'page' : 'sheet'} title={picker ? `Choose ${picker}` : 'Filter records'} onClose={picker ? () => setPicker('') : onClose}
    footer={picker === 'species' ? <Btn label={`Done (${f.species.length})`} onPress={() => { setPicker(''); }} /> : picker ? undefined : <ActionBar
    primary={<Btn label={`Show ${count} ${count === 1 ? 'record' : 'records'}`} disabled={!rangeGood}
      disabledReason={!rangeGood ? 'Choose a start and end date.' : undefined} closeOnPress onPress={async () => { configureLayoutMotion(reduceMotion); return await change(s => ({ ...s, filters: f })); }} />}
    secondary={<Btn label="Reset" kind="quiet" onPress={() => { setF(emptyFilters()); setCalendarStart(''); }} />} />}>
    {picker ? <>
      <Field label={pickerQuery} value={query} onChange={setQuery} />
      {pickerItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map(item => {
        const selected = picker === 'species' ? f.species.includes(item.value) : picker === 'boat' ? f.boatId === item.value : f.fisherId === item.value;
        return <Pressable key={item.value} accessibilityRole={picker === 'species' ? 'checkbox' : 'button'} onPress={() => {
          if (picker === 'species') patch({ species: selected ? f.species.filter(v => v !== item.value) : [...f.species, item.value] });
          else { patch(picker === 'boat' ? { boatId: item.value } : { fisherId: item.value }); setPicker(''); }
        }} style={[s.pickerRow, selected && s.quickChipSelected]}><Text style={s.pickerRowText}>{item.label}</Text>
          {selected ? <Feather name="check-circle" size={21} color={C.primary} /> : <Feather name="circle" size={20} color={C.mutedForeground} />}</Pressable>;
      })}
    </> : <>
       <FilterHeading title="Time" initialSection={initialSection} />
      <View style={s.choiceWrap}>{[['Today', '1'], ['Yesterday', 'yesterday'], ['Last 7 days', '7'], ['Last 14 days', '14'], ['All time', 'all'], ['Pick dates', 'custom']].map(([label, value]) =>
        <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: f.days === value }} onPress={() => {
          patch(value === 'custom' ? { days: 'custom', from: '', to: '' } : { days: value, from: '', to: '' });
          if (value === 'custom') { setCalendarStart(''); }
        }} style={[s.quickChip, f.days === value && s.quickChipSelected]}>{f.days === value ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{label}</Text></Pressable>)}</View>
      {f.days === 'custom' ? <View style={s.calendar}>
        <View style={s.calendarHead}><Pressable onPress={() => setMonthOffset(n => n - 1)} style={s.calendarNav}><Feather name="chevron-left" size={22} color={C.foreground} /></Pressable>
          <Text style={s.calendarTitle}>{activeCalendar.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
          <Pressable disabled={monthOffset >= 0} onPress={() => setMonthOffset(n => n + 1)} style={s.calendarNav}><Feather name="chevron-right" size={22} color={monthOffset >= 0 ? C.mutedForeground : C.foreground} /></Pressable></View>
        <View style={s.calendarGrid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={`${d}${i}`} style={s.calendarWeek}>{d}</Text>)}
          {Array.from({ length: weekdayOffset }, (_, i) => <View key={`blank${i}`} style={s.calendarCell} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const key = fmtDate(activeCalendar.getFullYear(), activeCalendar.getMonth(), day), today = dayKey(), future = key > today;
            const selected = key === f.from || key === f.to || (!!f.from && !!f.to && key > f.from && key < f.to);
            return <Pressable key={key} accessibilityRole="button" accessibilityLabel={dayLabel(`${key}T12:00:00`)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => chooseDate(key)} style={[s.calendarCell, selected && s.calendarSelected, key === today && s.calendarToday, future && { opacity: 0.3 }]}>
              <Text style={[s.calendarDay, selected && { color: C.primaryForeground }]}>{day}</Text></Pressable>;
          })}
        </View>
        <Txt>{f.from ? `${dayLabel(`${f.from}T12:00:00`)}${f.to ? ` to ${dayLabel(`${f.to}T12:00:00`)}` : ' · choose an end date'}` : 'Choose a start date'}</Txt>
      </View> : null}
       <FilterHeading title="Status" initialSection={initialSection} />
      <View style={s.choiceWrap}>{['Draft', 'Needs review', 'Saved', 'Waiting to send', "Couldn't send", 'Sent'].map(status => {
        const selected = f.statuses.includes(status);
        return <Pressable key={status} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => patch({ statuses: selected ? f.statuses.filter(v => v !== status) : [...f.statuses, status] })} style={[s.quickChip, selected && s.quickChipSelected]}>
          {selected ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{status}</Text></Pressable>;
      })}</View>
       <FilterHeading title="Boat" initialSection={initialSection} />
      <Pressable onPress={() => { setQuery(''); setPicker('boat'); }} style={s.pickerRow}><Text style={s.pickerRowText}>Boat: {data.boats.find(b => b.id === f.boatId)?.name ?? 'Any'}</Text><Feather name="chevron-right" size={20} color={C.foreground} /></Pressable>
       <FilterHeading title="Fisher" initialSection={initialSection} />
      <Pressable onPress={() => { setQuery(''); setPicker('fisher'); }} style={s.pickerRow}><Text style={s.pickerRowText}>Fisher: {data.fishers.find(v => v.id === f.fisherId)?.name ?? 'Any'}</Text><Feather name="chevron-right" size={20} color={C.foreground} /></Pressable>
       <FilterHeading title="Species" initialSection={initialSection} />
      <Pressable onPress={() => { setQuery(''); setPicker('species'); }} style={s.pickerRow}><Text style={s.pickerRowText}>{f.species.length ? `${f.species.length} selected` : 'Species: Any'}</Text><Feather name="chevron-right" size={20} color={C.foreground} /></Pressable>
      {f.species.length ? <Txt small muted>{f.species.map(speciesName).join(' · ')}</Txt> : null}
      {!rangeGood ? <Notice warning>Choose a start and end date.</Notice> : null}
    </>}
  </Overlay>;
}
export function RecordDetail({ r, onBack, onEdit, onHistory }: { r: CatchRecord; onBack: () => void; onEdit: () => void; onHistory: () => void }) {
  const { data, change } = usePrototype();
  const [moreOpen, setMoreOpen] = useState(false), [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState(''), [deleteText, setDeleteText] = useState('');
  const reduceMotion = useMotionPrefs();
  const facts = {
    Boat: r.boatName, Fisher: data?.fishers.find(f => f.id === r.fisherId)?.name, 'Vessel type': r.vesselType, Propulsion: r.propulsion,
    Horsepower: r.horsepower, 'Vessel length (m)': r.length, 'Registration or origin': r.registration, 'Number of crew': r.crew,
    'Gear type': r.gear, 'Total number of gears': r.gearCount, 'Mesh size (inches)': r.mesh, 'Hook size': r.hookSize, 'Hooks per line': r.hooks,
    'Area fished': r.area, 'Date and time out': r.timeOut, 'Date and time in': r.timeIn, 'FAD fishing': r.fad, 'FAD type': r.fadType,
  };
  const deleteRecord = async () => {
    if (!deleteReason || (deleteReason === 'Other' && !deleteText.trim())) return false;
    configureLayoutMotion(reduceMotion);
    const reason = deleteReason === 'Other' ? deleteText.trim() : deleteReason;
    const ok = await change(s => ({ ...s, records: s.records.map(record => record.id === r.id ? { ...record, deleted: true,
      revision: record.revision + 1, history: [...record.history, { at: new Date().toISOString(), field: 'Deleted', was: 'No', now: 'Yes', reason }] } : record),
      undo: { kind: 'delete', before: r, afterRevision: r.revision + 1, expiresAt: Date.now() + 10000, label: 'Record deleted.' } }));
    if (ok) setTimeout(onBack, reduceMotion ? 100 : 210);
    return ok;
  };
  const title = `${r.boatName || 'Boat not chosen'} · ${timeLabel(r.date)}`;
  return <Shell title={title} subtitle={dayLabel(r.date)} back={onBack}
    headerBadge={<StatusChip status={displayStatus(r)} />} headerRight={
      <Pressable accessibilityRole="button" accessibilityLabel="More record options" testID="record-more"
        onPress={() => setMoreOpen(true)} style={s.iconButton}><Feather name="more-horizontal" size={24} color={C.foreground} /></Pressable>
    } footer={<Btn label="Edit record" onPress={onEdit} />}>
     <Card><Heading>Record summary</Heading><Txt bold>{r.noCatch ? 'No catch from this fisher' : totalText(r.lines)}</Txt>
       <Txt>{r.lastSentAt || r.sentAt ? `Sent: ${dayLabel(r.lastSentAt || r.sentAt!)} ${timeLabel(r.lastSentAt || r.sentAt!)} to ${r.sentTo || 'recipient'}` : 'Not sent yet'}</Txt>
       {r.editedAt && r.lastSentAt && r.editedAt > r.lastSentAt ? <Txt small muted>Edited after sending</Txt> : null}
       {Object.entries(facts).map(([key, value]) => <View key={key}><Txt small muted>{key}</Txt><Txt>{value || 'No value recorded'}</Txt></View>)}</Card>
    {r.photo ? <><Image source={require('../../assets/images/demo-rabbitfish.jpg')} style={{ height: 180, width: '100%', borderRadius: 16 }} /><Txt>Photo · {r.photo.state}</Txt></> : null}
    <Heading>Catch</Heading>{r.lines.map(l => <Card key={l.id}><Txt bold>{speciesName(l.speciesId)}</Txt><Txt>Approximate number: {l.count || 'No number noted'}</Txt><Txt>Weight (kg): {l.weight || 'No weight yet'}</Txt><Txt>Price per kg (Ksh): {l.price || 'No price yet'}</Txt>
      {l.priceSource ? <Txt small muted>{l.priceSource === "today's price" ? `Today's price${l.priceSetAt ? `, ${timeLabel(l.priceSetAt)}` : ''}` : l.priceSource}</Txt> : null}
      <Txt>Remarks: {l.remarks || 'No note added'}</Txt></Card>)}
    <Heading>Notes</Heading><Txt>{r.notes || 'No note added'}</Txt>
    {moreOpen ? <Overlay title="Record options" onClose={() => setMoreOpen(false)}>
      <Btn label="History" kind="secondary" icon="clock" closeOnPress onPress={() => { setTimeout(onHistory, reduceMotion ? 100 : 210); return true; }} />
      <Btn label="Delete record" kind="danger" icon="trash-2" closeOnPress onPress={() => { setTimeout(() => setDeleteOpen(true), reduceMotion ? 100 : 210); return true; }} />
    </Overlay> : null}
    {deleteOpen ? <Overlay title="Delete this record?" size="medium" onClose={() => setDeleteOpen(false)}
      footer={<ActionBar variant="stacked" secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />}
        primary={<Btn label="Delete record" kind="danger" disabled={!deleteReason || (deleteReason === 'Other' && !deleteText.trim())}
          disabledReason={!deleteReason ? 'Choose a deletion reason.' : deleteReason === 'Other' && !deleteText.trim() ? 'Enter the other reason.' : undefined}
          closeOnPress onPress={deleteRecord} />} />}>
      <Choices label="Reason for deletion" rows options={['Duplicate', 'Entered by mistake', 'Other']} value={deleteReason} onChange={setDeleteReason} />
      {deleteReason === 'Other' ? <Field label="Other deletion reason" value={deleteText} onChange={setDeleteText} multiline /> : null}
    </Overlay> : null}
  </Shell>;
}
export function HistoryScreen({ r, onBack }: { r: CatchRecord; onBack: () => void }) {
  return <Shell title="History" back={onBack}><Heading>{r.boatName || 'Draft'}</Heading>
    {!r.history.length ? <Txt>No changes recorded yet.</Txt> : r.history.slice().reverse().map((h, i) => <Card key={i}>
      <Txt small muted>{dayLabel(h.at)} · {timeLabel(h.at)}</Txt><Txt bold>{h.field}</Txt><Txt>Was: {h.was}</Txt><Txt>Now: {h.now}</Txt><Txt>Reason: {h.reason}</Txt>
    </Card>)}
    {r.lines.filter(line => !!line.price).map(line => <Card key={`price-${line.id}`}>
      <Txt bold>{speciesName(line.speciesId)} · Price source</Txt>
      <Txt small muted>{line.priceSource === "today's price" ? `Today's price${line.priceSetAt ? `, ${timeLabel(line.priceSetAt)}` : ''}` : line.priceSource || 'Entered on this record'}</Txt>
    </Card>)}
  </Shell>;
}
function AccordionSection({ title, summary, changed, open, onPress, children }: {
  title: string; summary: string; changed: boolean; open: boolean; onPress: () => void; children: React.ReactNode;
}) {
  const scrollTo = useScrollTo(), y = useRef(0);
  const reduceMotion = useMotionPrefs(), rotation = useSharedValue(open ? 180 : 0);
  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: reduceMotion ? 100 : open ? 200 : 150 });
    if (!open) return;
    const timer = setTimeout(() => scrollTo(y.current), reduceMotion ? 100 : 210);
    return () => clearTimeout(timer);
  }, [open, reduceMotion, rotation, scrollTo]);
  const caretStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return <View onLayout={event => { y.current = event.nativeEvent.layout.y; }} style={s.accordionSection}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={s.accordionHeader}>
      <Text style={s.accordionTitle}>{title}</Text>
      {changed ? <Text style={s.changedBadge}>Changed</Text> : null}
      <Animated.View style={caretStyle}><Feather name="chevron-down" size={24} color={C.foreground} /></Animated.View>
    </Pressable>
    {!open ? <Text numberOfLines={1} style={s.accordionSummary}>{summary}</Text> : <View style={s.accordionContent}>{children}</View>}
  </View>;
}
export function EditRecord({ onDone, onHistory }: { onDone: () => void; onHistory: (r: CatchRecord) => void }) {
  const { data, change, saved, error } = usePrototype();
  const [cancel, setCancel] = useState(false), [reasonOpen, setReasonOpen] = useState(false), [deleting, setDeleting] = useState(false), [moreOpen, setMoreOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState(''), [deleteText, setDeleteText] = useState(''), [actionError, setActionError] = useState('');
  const reduceMotion = useMotionPrefs();
  if (!data?.edit) return null;
  const session = data.edit, r = session.working, original = data.records.find(r => r.id === session.recordId)!;
  const changed = differences(original, r);
  const reason = session.reason === 'Other' ? session.otherReason.trim() : session.reason;
  const patch = (patch: Partial<CatchRecord>) => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, working: { ...s.edit.working, ...patch } } : undefined })); };
  const setDailyPrice = (speciesId: string, price: string) => {
    void change(s => ({ ...s, dayPrices: setDayPrice(s, r.site || s.settings.site, r.date, speciesId, price) }));
  };
  const end = async () => {
    configureLayoutMotion(reduceMotion);
    const ok = await change(s => ({ ...s, edit: undefined }));
    if (ok) onDone();
  };
  const save = async () => {
    try {
      configureLayoutMotion(reduceMotion);
      const updated = saveEdit(original, r, reason);
      const ok = await change(s => {
        let dayPrices = s.dayPrices;
        for (const line of updated.lines) {
          const before = original.lines.find(old => old.id === line.id);
          if (!line.price || numberValue(line.price) === null || before?.price === line.price) continue;
          if (!dayPriceFor({ ...s, dayPrices }, line.speciesId, r.id)) {
            dayPrices = setDayPrice({ ...s, dayPrices }, r.site || s.settings.site, r.date, line.speciesId, line.price, line.priceSetAt ?? new Date().toISOString());
          }
        }
        return { ...s, dayPrices, boats: updateSavedBoat(s, r), records: s.records.map(old => old.id === r.id ? updated : old),
          undo: { kind: 'edit', before: original, afterRevision: updated.revision, expiresAt: Date.now() + 10000, label: 'Changes saved.' } };
      });
      if (ok && await change(s => ({ ...s, edit: undefined }))) onDone();
    } catch (e) { setActionError((e as Error).message); }
  };
  const summaries: Record<string, string> = {
    'Boat and fisher': `${r.boatName || 'No boat'} · ${data.fishers.find(f => f.id === r.fisherId)?.name || 'No fisher'}`,
    'Boat details': `${r.vesselType || 'No vessel type'} · ${r.length ? `${r.length} m` : 'No length yet'} · ${r.crew ? `${r.crew} crew` : 'No crew count'}`,
    'Gear and trip': `${r.gear || 'No gear recorded'} · ${r.area || 'No area recorded'}`, Catch: totalText(r.lines), Notes: r.notes || 'No note added',
  };
  const sectionChanged: Record<string, boolean> = {
    'Boat and fisher': changed.some(c => ['boatId', 'boatName', 'fisherId'].includes(c.field)),
    'Boat details': changed.some(c => ['vesselType', 'propulsion', 'horsepower', 'length', 'registration', 'crew'].includes(c.field)),
    'Gear and trip': changed.some(c => ['gear', 'gearCount', 'mesh', 'hookSize', 'hooks', 'area', 'timeOut', 'timeIn', 'fad', 'fadType'].includes(c.field)),
    Catch: changed.some(c => c.field === 'No catch' || c.field.startsWith('Catch ·') || / · (speciesId|count|weight|price|remarks|checked)$/.test(c.field)),
    Notes: changed.some(c => c.field === 'Notes changed'),
  };
  const removeLine = (lineId: string) => {
    const line = r.lines.find(l => l.id === lineId);
    if (!line) return;
    configureLayoutMotion(reduceMotion);
    void change(s => ({ ...s, edit: s.edit ? { ...s.edit, working: { ...s.edit.working, lines: s.edit.working.lines.filter(l => l.id !== lineId) } } : undefined,
      undo: { kind: 'line', target: 'edit', before: r, line, index: r.lines.indexOf(line), afterRevision: r.revision, expiresAt: Date.now() + 10000, label: `Removed ${speciesName(line.speciesId)}.` } }));
  };
  return <Shell title="Edit record" subtitle={`${r.boatName} · ${timeLabel(r.date)}`} saved={error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    offline={data.settings.offline} back={() => changed.length ? setCancel(true) : void end()}
    headerRight={<Pressable accessibilityRole="button" accessibilityLabel="Edit record options" onPress={() => setMoreOpen(true)} style={s.iconButton}><Feather name="more-horizontal" size={23} color={C.foreground} /></Pressable>}
    footer={<View style={{ gap: 8 }}>
      {changed.length ? <Txt small muted>{changed.length} {changed.length === 1 ? 'change' : 'changes'}</Txt> : null}
      <ActionBar primary={<Btn label="Save changes" disabled={!changed.length || !r.boatId || !validNumbers(r)}
        disabledReason={!changed.length ? 'Change a value to save.' : !r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => setReasonOpen(true)} />}
        secondary={<Btn label="Cancel" kind="secondary" onPress={() => changed.length ? setCancel(true) : void end()} />} />
    </View>}>
    <StatusChip status={displayStatus(original)} />
    {(original.status === 'Sent' || original.sentAt) ? <Notice warning>This record was already sent. Save, then send it again to share the change.</Notice> : null}
    {Object.entries(summaries).map(([section, summary]) => <AccordionSection key={section} title={section} summary={summary}
      changed={sectionChanged[section]} open={session.section === section}
      onPress={() => { configureLayoutMotion(reduceMotion, session.section === section ? 150 : 200); void change(s => ({ ...s, edit: s.edit ? { ...s.edit, section: session.section === section ? '' : section } : undefined })); }}>
      {section === 'Boat and fisher' ? <BoatFields r={r} onChange={patch} original={original} /> : section === 'Boat details' ? <BoatDetails r={r} original={original} onChange={patch} showTitle={false} />
        : section === 'Gear and trip' ? <GearTrip r={r} original={original} onChange={patch} showTitles={false} />
          : section === 'Catch' ? <CatchReview r={r} original={original} onChange={patch} onRemove={removeLine}
            onSetDailyPrice={setDailyPrice} setFirstPriceOnBlur={false} showNotes={false} />
            : <Field label="Notes" multiline value={r.notes} before={original.notes} onChange={notes => patch({ notes })} />}
    </AccordionSection>)}
    {actionError ? <Notice warning>{actionError}</Notice> : null}
    {moreOpen ? <Overlay title="Edit record options" onClose={() => setMoreOpen(false)}>
      <Btn label="History" kind="secondary" icon="clock" closeOnPress onPress={() => { onHistory(original); return true; }} />
      <Btn label="Delete record" kind="danger" icon="trash-2" closeOnPress onPress={() => { setDeleting(true); return true; }} />
    </Overlay> : null}
    {reasonOpen ? <Overlay title="Why are you changing this record?" size="medium" onClose={() => setReasonOpen(false)} footer={<ActionBar
      primary={<Btn label="Save changes" disabled={!reason || (session.reason === 'Other' && !session.otherReason.trim())}
        disabledReason={!reason ? 'Choose a reason.' : session.reason === 'Other' && !session.otherReason.trim() ? 'Add a short reason.' : undefined}
        closeOnPress onPress={save} />}
      secondary={<Btn label="Cancel" kind="secondary" closeOnPress onPress={() => {}} />} />}>
      {(original.status === 'Sent' || original.sentAt) ? <Notice warning>This record was already sent. Save, then send it again to share the change.</Notice> : null}
      <Choices label="Reason for change" rows options={['Wrong weight', 'Wrong species', 'Wrong price', 'Wrong boat or fisher', 'Missing information', 'Other']} value={session.reason} onChange={reason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, reason } : undefined })); }} />
      {session.reason === 'Other' ? <Field label="Other reason" value={session.otherReason} onChange={otherReason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, otherReason } : undefined })); }} multiline /> : null}
    </Overlay> : null}
    {cancel ? <Overlay title="Discard changes?" variant="dialog" onClose={() => setCancel(false)}>
      <Txt>You changed {changed.length} {changed.length === 1 ? 'value' : 'values'}. They will be lost.</Txt>
        <ActionBar variant="stacked" primary={<Btn label="Keep editing" closeOnPress onPress={() => {}} />}
        danger={<Btn label="Discard changes" kind="dangerText" closeOnPress onPress={() => {
          setTimeout(() => { void end(); }, reduceMotion ? 100 : 110);
          return true;
        }} />} />
    </Overlay> : null}
    {deleting ? <Overlay title="Delete this record?" size="medium" onClose={() => setDeleting(false)}>
      <Notice warning>This record will no longer show in Records or be sent. You can undo for 10 seconds.</Notice>
      <Choices label="Reason for deletion" rows options={['Duplicate', 'Entered by mistake', 'Other']} value={deleteReason} onChange={setDeleteReason} />
      {deleteReason === 'Other' ? <Field label="Other deletion reason" value={deleteText} onChange={setDeleteText} /> : null}
      <ActionBar variant="stacked" primary={<Btn label="Delete record" kind="danger" closeOnPress disabled={!deleteReason || (deleteReason === 'Other' && !deleteText.trim())}
        disabledReason={!deleteReason ? 'Choose a deletion reason.' : deleteReason === 'Other' && !deleteText.trim() ? 'Enter the other reason.' : undefined} onPress={async () => {
        configureLayoutMotion(reduceMotion);
        const reason = deleteReason === 'Other' ? deleteText.trim() : deleteReason;
        const ok = await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, deleted: true, revision: old.revision + 1, history: [...old.history, { at: new Date().toISOString(), field: 'Deleted', was: 'No', now: 'Yes', reason }] } : old),
          undo: { kind: 'delete', before: original, afterRevision: original.revision + 1, expiresAt: Date.now() + 10000, label: 'Record deleted.' } }));
        if (ok) setTimeout(() => { void change(s => ({ ...s, edit: undefined })); onDone(); }, reduceMotion ? 100 : 210);
        return ok;
      }} />}
        secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />} />
    </Overlay> : null}
  </Shell>;
}
