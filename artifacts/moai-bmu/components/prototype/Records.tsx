import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePrototype } from '@/lib/prototype/store';
import {
  dayKey, dayLabel, dayPriceFor, differences, displayStatus, emptyFilters, filterRecords, numberValue, recordCount, saveEdit, setDayPrice, speciesName, timeLabel, totalText, totals,
  validNumbers, validRange, type CatchRecord, type Filters,
} from '@/lib/prototype/model';
import { BoatDetails, BoatFields, GearTrip } from './RecordFields';
import { configureLayoutMotion, useMotionPrefs } from './motion';
import { updateSavedBoat } from './AddWizard';
import { CatchReview, SpeciesPicker } from './CatchReview';
import { ActionBar, Btn, C, Card, Choices, Field, Heading, Notice, Overlay, Select, Shell, StatusChip, Txt, s } from './ui';

export function RecordRow({ r, onOpen, onEdit }: { r: CatchRecord; onOpen: () => void; onEdit: () => void }) {
  const { data } = usePrototype();
  const action = r.status === 'Draft' ? 'Resume' : r.status === 'Needs review' ? 'Review' : 'Edit';
  const t = totals(r.lines);
  const measurements = t.weight !== null && t.value !== null
    ? `${t.weight.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg · Ksh ${t.value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
    : r.noCatch ? 'No catch from this fisher' : 'No weight or price yet';
  const title = `${r.boatName || 'Boat not chosen'} · ${timeLabel(r.date)}`;
  const fisher = data?.fishers.find(f => f.id === r.fisherId)?.name ?? 'No fisher';
  return <View style={[s.card, s.compactRecordCard]}>
    <Pressable testID={`record-${r.id}`} onPress={onOpen} accessibilityRole="button"
      accessibilityLabel={`Open ${title} record. ${fisher}. ${displayStatus(r)}. ${measurements}`}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }} />
    <View pointerEvents="none" style={{ gap: 4 }}>
      <View style={[s.row, { justifyContent: 'space-between', paddingRight: 88 }]}>
        <Text numberOfLines={1} style={s.compactRecordTitle}>{title}</Text>
      </View>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Txt small>{fisher}</Txt><StatusChip status={displayStatus(r)} />
      </View>
      <Text numberOfLines={1} style={s.daySummary}>{measurements}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${action} record, ${r.boatName} ${timeLabel(r.date)}`}
      testID={`edit-${r.id}`} onPress={onEdit}
      style={[s.compactEdit, { position: 'absolute', top: 6, right: 8, zIndex: 2 }]}>
      <Feather name={r.status === 'Draft' ? 'arrow-right' : 'edit-3'} size={20} color={C.primary} />
      <Text style={s.compactEditText}>{action}</Text>
    </Pressable>
  </View>;
}
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (!data) return null;
  const filters = data.filters, records = filterRecords(data);
  const patchFilters = (patch: Partial<Filters>) => { void change(s => ({ ...s, filters: { ...s.filters, ...patch } })); };
  const applied = [filters.days !== 'all' ? { label: filters.days === 'custom' ? `${filters.from} to ${filters.to}` : filters.days === '1' ? 'Today' : `Last ${filters.days} days`, clear: () => patchFilters({ days: 'all' }) } : null,
    filters.boatId ? { label: data.boats.find(b => b.id === filters.boatId)?.name ?? 'Boat', clear: () => patchFilters({ boatId: '' }) } : null,
    filters.fisherId ? { label: data.fishers.find(f => f.id === filters.fisherId)?.name ?? 'Fisher', clear: () => patchFilters({ fisherId: '' }) } : null,
    ...filters.statuses.map(status => ({ label: status, clear: () => patchFilters({ statuses: filters.statuses.filter(v => v !== status) }) })),
    ...filters.species.map(sp => ({ label: speciesName(sp), clear: () => patchFilters({ species: filters.species.filter(v => v !== sp) }) })),
  ].filter((v): v is { label: string; clear: () => void } => !!v);
  const nodes: React.ReactNode[] = [
    <View key="toolbar" style={{ gap: 12 }}>
      <Field label="Search boat or fisher" placeholder="Search boat or fisher" value={filters.search} onChange={search => patchFilters({ search })} />
      <Btn label={`Filters (${applied.length})`} icon="filter" kind="secondary" onPress={() => setFiltersOpen(true)} />
      {applied.map(v => <Btn key={v.label} label={`${v.label} ×`} kind="quiet" onPress={v.clear} />)}
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
  if (!records.length) nodes.push(<Card key="empty"><Txt>No records match these filters.</Txt><Btn label="Clear filters" kind="secondary" onPress={() => patchFilters({ ...emptyFilters(), days: 'all' })} /></Card>);
  if (filtersOpen) nodes.push(<FilterOverlay key="filters" onClose={() => setFiltersOpen(false)} />);
  return <Shell title="Records" tab="Records" onTab={onTab} offline={data.settings.offline} stickyIndices={sticky}>{nodes}</Shell>;
}
function FilterOverlay({ onClose }: { onClose: () => void }) {
  const { data, change } = usePrototype();
  const reduceMotion = useMotionPrefs();
  const [f, setF] = useState<Filters>(data!.filters);
  const [species, setSpecies] = useState(false);
  const patch = (p: Partial<Filters>) => setF(current => ({ ...current, ...p }));
  if (!data) return null;
  const rangeGood = f.days !== 'custom' || validRange(f.from, f.to);
  return <Overlay title="Filter records" onClose={onClose} footer={<ActionBar
    primary={<Btn label="Apply filters" disabled={!rangeGood} closeOnPress disabledReason={!rangeGood ? 'Enter a valid date range.' : undefined}
      onPress={async () => { configureLayoutMotion(reduceMotion); return await change(s => ({ ...s, filters: f })); }} />}
    secondary={<Btn label="Cancel" kind="secondary" closeOnPress onPress={() => {}} />} />}>
    <Choices label="Time" value={f.days === '1' ? 'Today' : f.days === 'custom' ? 'Custom range' : f.days === 'all' ? 'All time' : `Last ${f.days} days`}
      options={['Today', 'Last 2 days', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Custom range', 'All time']}
      onChange={v => patch({ days: v === 'Today' ? '1' : v === 'Custom range' ? 'custom' : v === 'All time' ? 'all' : v.split(' ')[1] })} />
    {f.days === 'custom' ? <><Field label="From date" hint="YYYY-MM-DD" value={f.from} onChange={from => patch({ from })} /><Field label="To date" hint="YYYY-MM-DD" value={f.to} onChange={to => patch({ to })} />{!rangeGood ? <Notice warning>Enter a valid date range, from first to last.</Notice> : null}</> : null}
    <Select label="Boat" emptyLabel="Any boat" value={f.boatId} options={data.boats.map(b => ({ value: b.id, label: b.name }))} onChange={boatId => patch({ boatId })} />
    <Select label="Fisher" emptyLabel="Any fisher" value={f.fisherId} options={data.fishers.map(b => ({ value: b.id, label: b.name }))} onChange={fisherId => patch({ fisherId })} />
    <Choices label="Status" multiple value={f.statuses} options={['Draft', 'Needs review', 'Saved', 'Waiting to send', 'Couldn’t send', 'Sent']} onChange={v => patch({ statuses: f.statuses.includes(v) ? f.statuses.filter(s => s !== v) : [...f.statuses, v] })} />
    <Heading>Species</Heading>
    {f.species.map(sp => <Btn key={sp} label={`${speciesName(sp)} ×`} kind="secondary" onPress={() => patch({ species: f.species.filter(s => s !== sp) })} />)}
    <Btn label="Choose species filter" kind="secondary" onPress={() => setSpecies(true)} />
    <Btn label="Clear all" kind="quiet" onPress={() => setF({ ...emptyFilters(), days: 'all' })} />
    {species ? <SpeciesPicker onClose={() => setSpecies(false)} onSelect={sp => patch({ species: [...new Set([...f.species, sp])] })} /> : null}
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
    headerRight={<View style={s.row}><StatusChip status={displayStatus(r)} />
      <Pressable accessibilityRole="button" accessibilityLabel="More record options" testID="record-more"
        onPress={() => setMoreOpen(true)} style={s.iconButton}><Feather name="more-horizontal" size={24} color={C.foreground} /></Pressable>
    </View>} footer={<Btn label="Edit record" onPress={onEdit} />}>
    <Card><Heading>Record summary</Heading><Txt bold>{r.noCatch ? 'No catch from this fisher' : totalText(r.lines)}</Txt>{Object.entries(facts).map(([key, value]) => <View key={key}><Txt small muted>{key}</Txt><Txt>{value || 'No value recorded'}</Txt></View>)}</Card>
    {r.photo ? <><Image source={require('../../assets/images/demo-rabbitfish.jpg')} style={{ height: 180, width: '100%', borderRadius: 16 }} /><Txt>Photo · {r.photo.state}</Txt></> : null}
    <Heading>Catch</Heading>{r.lines.map(l => <Card key={l.id}><Txt bold>{speciesName(l.speciesId)}</Txt><Txt>Approximate number: {l.count || 'No number noted'}</Txt><Txt>Weight (kg): {l.weight || 'No weight yet'}</Txt><Txt>Price per kg (Ksh): {l.price || 'No price yet'}</Txt>
      {l.priceSource ? <Txt small muted>{l.priceSource === "today's price" ? `Today's price${l.priceSetAt ? `, ${timeLabel(l.priceSetAt)}` : ''}` : l.priceSource}</Txt> : null}
      <Txt>Remarks: {l.remarks || 'No note added'}</Txt></Card>)}
    <Heading>Notes</Heading><Txt>{r.notes || 'No note added'}</Txt>
    {moreOpen ? <Overlay title="Record options" onClose={() => setMoreOpen(false)}>
      <Btn label="History" kind="secondary" icon="clock" closeOnPress onPress={() => { setTimeout(onHistory, reduceMotion ? 100 : 210); return true; }} />
      <Btn label="Delete record" kind="danger" icon="trash-2" closeOnPress onPress={() => { setTimeout(() => setDeleteOpen(true), reduceMotion ? 100 : 210); return true; }} />
    </Overlay> : null}
    {deleteOpen ? <Overlay title="Delete this record?" variant="dialog" onClose={() => setDeleteOpen(false)}
      footer={<ActionBar secondary={<Btn label="Cancel" kind="secondary" closeOnPress onPress={() => {}} />}
        primary={<Btn label="Delete record" kind="danger" disabled={!deleteReason || (deleteReason === 'Other' && !deleteText.trim())}
          disabledReason={!deleteReason ? 'Choose a deletion reason.' : deleteReason === 'Other' && !deleteText.trim() ? 'Enter the other reason.' : undefined}
          closeOnPress onPress={deleteRecord} />} />}>
      <Choices label="Reason for deletion" options={['Duplicate', 'Wrong record', 'Other']} value={deleteReason} onChange={setDeleteReason} />
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
export function EditRecord({ onDone, onHistory }: { onDone: () => void; onHistory: (r: CatchRecord) => void }) {
  const { data, change, saved, error } = usePrototype();
  const [cancel, setCancel] = useState(false), [reasonOpen, setReasonOpen] = useState(false), [deleting, setDeleting] = useState(false);
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
  const end = async (discard = false) => {
    if (discard) configureLayoutMotion(reduceMotion);
    const ok = await change(s => ({ ...s, edit: undefined,
      ...(discard ? { undo: { kind: 'discardEdit', editSession: session, before: r, afterRevision: r.revision, expiresAt: Date.now() + 10000, label: 'Changes discarded.' } as const } : {}) }));
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
    'Boat and fisher': `${r.boatName} · ${data.fishers.find(f => f.id === r.fisherId)?.name || 'Fisher not entered'}`,
    'Boat details': `${r.vesselType || 'Type not entered'} · ${r.length ? `${r.length} m` : 'Length not entered'} · ${r.crew || 'No'} crew entered`,
    'Gear and trip': `${r.gear || 'No gear recorded'} · ${r.area || 'No area recorded'}`, Catch: totalText(r.lines), Notes: r.notes || 'No note added',
  };
  const removeLine = (lineId: string) => {
    const line = r.lines.find(l => l.id === lineId);
    if (!line) return;
    configureLayoutMotion(reduceMotion);
    void change(s => ({ ...s, edit: s.edit ? { ...s.edit, working: { ...s.edit.working, lines: s.edit.working.lines.filter(l => l.id !== lineId) } } : undefined,
      undo: { kind: 'line', target: 'edit', before: r, line, index: r.lines.indexOf(line), afterRevision: r.revision, expiresAt: Date.now() + 10000, label: `Removed ${speciesName(line.speciesId)}.` } }));
  };
  return <Shell title="Edit record" subtitle={`${r.boatName} · ${timeLabel(r.date)}`} saved={error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    offline={data.settings.offline} back={() => changed.length ? setCancel(true) : void end()} footer={<>
      {changed.length ? <Btn label={reason ? `Reason: ${reason}` : 'Reason for change · required'} kind="secondary" onPress={() => setReasonOpen(true)} /> : null}
      <ActionBar primary={<Btn label="Save changes" disabled={!changed.length || !reason || !r.boatId || !validNumbers(r)}
        disabledReason={!changed.length ? 'Change a value to save.' : !reason ? 'Choose a reason for the change.' : !r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => { void save(); }} />}
        secondary={<Btn label="Cancel" kind="secondary" onPress={() => changed.length ? setCancel(true) : void end()} />} />
    </>}>
    <StatusChip status={displayStatus(original)} />
    {(original.status === 'Sent' || original.sentAt) ? <Notice warning>Saving will mark this record Needs review.</Notice> : null}
    <Btn label="History" kind="quiet" icon="clock" onPress={() => onHistory(original)} />
    {Object.entries(summaries).map(([section, summary]) => <Card key={section}>
      <Btn label={section} kind="quiet" icon={session.section === section ? 'chevron-up' : 'chevron-down'}
        onPress={() => { configureLayoutMotion(reduceMotion); void change(s => ({ ...s, edit: s.edit ? { ...s.edit, section: session.section === section ? '' : section } : undefined })); }} />
      <Txt>{summary}</Txt>
      {session.section === section ? <View style={{ gap: 16 }}>
        {section === 'Boat and fisher' ? <BoatFields r={r} onChange={patch} original={original} /> : section === 'Boat details' ? <BoatDetails r={r} original={original} onChange={patch} />
          : section === 'Gear and trip' ? <GearTrip r={r} original={original} onChange={patch} />
            : section === 'Catch' ? <CatchReview r={r} original={original} onChange={patch} onRemove={removeLine}
              onSetDailyPrice={setDailyPrice} setFirstPriceOnBlur={false} showNotes={false} />
              : <Field label="Notes" multiline value={r.notes} before={original.notes} onChange={notes => patch({ notes })} />}
      </View> : null}
    </Card>)}
    {changed.length ? <Card><Heading>{changed.length} changed fields</Heading>{changed.map((c, i) => <View key={i}><Txt bold>{c.field} · Changed</Txt><Txt small>Was: {c.was}</Txt><Txt small>Now: {c.now}</Txt></View>)}</Card> : null}
    {actionError ? <Notice warning>{actionError}</Notice> : null}
    <View style={{ marginTop: 24 }}><Btn label="Delete record" kind="danger" icon="trash-2" onPress={() => setDeleting(true)} /></View>
    {reasonOpen ? <Overlay title="Reason for change" onClose={() => setReasonOpen(false)} footer={<ActionBar
      primary={<Btn label="Use reason" disabled={!reason} closeOnPress disabledReason={!reason ? 'Choose a reason for the change.' : undefined} onPress={() => {}} />}
      secondary={<Btn label="Cancel" kind="secondary" closeOnPress onPress={() => {}} />} />}>
      <Choices label="Choose a reason" options={['Wrong weight', 'Wrong species', 'Wrong boat or fisher', 'Missing information', 'Other']} value={session.reason} onChange={reason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, reason } : undefined })); }} />
      {session.reason === 'Other' ? <Field label="Other reason" value={session.otherReason} onChange={otherReason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, otherReason } : undefined })); }} multiline /> : null}
    </Overlay> : null}
    {cancel ? <Overlay title="Discard changes?" variant="dialog" onClose={() => setCancel(false)}>
      <ActionBar variant="stacked" primary={<Btn label="Keep editing" closeOnPress onPress={() => {}} />}
        danger={<Btn label="Discard changes" kind="danger" closeOnPress onPress={() => {
          setTimeout(() => { void end(true); }, reduceMotion ? 100 : 110);
          return true;
        }} />} />
    </Overlay> : null}
    {deleting ? <Overlay title="Delete this record?" onClose={() => setDeleting(false)}>
      <Notice warning>Deleted records leave lists and sends. Their history is kept. Undo is available for 10 seconds.</Notice>
      <Choices label="Reason for deletion" options={['Duplicate', 'Entered by mistake', 'Other']} value={deleteReason} onChange={setDeleteReason} />
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
