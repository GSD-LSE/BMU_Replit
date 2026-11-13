import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { usePrototype } from '@/lib/prototype/store';
import {
  dayKey, dayLabel, differences, displayStatus, emptyFilters, filterRecords, saveEdit, speciesName, timeLabel, totalText,
  validNumbers, validRange, type CatchRecord, type Filters,
} from '@/lib/prototype/model';
import { BoatDetails, BoatFields, GearTrip } from './RecordFields';
import { updateSavedBoat } from './AddWizard';
import { CatchReview, SpeciesPicker } from './CatchReview';
import { Badge, Btn, C, Card, Choices, Field, Heading, Notice, Overlay, Select, Shell, Txt, s } from './ui';

export function RecordRow({ r, onOpen, onEdit, onReview }: { r: CatchRecord; onOpen: () => void; onEdit: () => void; onReview?: () => void }) {
  const { data } = usePrototype();
  return <Card>
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${r.boatName || 'Unfinished draft'} record`} style={{ minHeight: 48, gap: 8 }}>
      <Txt bold>{r.boatName || 'Boat not chosen'} · {timeLabel(r.date)}</Txt>
      <Txt>{data?.fishers.find(f => f.id === r.fisherId)?.name ?? 'Fisher not entered'}</Txt>
      <Txt>{totalText(r.lines)}</Txt><Badge status={displayStatus(r)} />
      {r.editedAt && Date.now() - Date.parse(r.editedAt) < 60000 ? <Notice>Edited just now</Notice> : null}
    </Pressable>
    <Btn label={r.status === 'Draft' ? 'Resume' : 'Edit'} icon={r.status === 'Draft' ? 'arrow-right' : 'edit-3'} kind="secondary" testID={`edit-${r.id}`} onPress={onEdit} />
    {r.status === 'Needs review' && onReview ? <Btn label="Review record" kind="quiet" onPress={onReview} /> : null}
  </Card>;
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
      <Field label="Search boat or fisher" value={filters.search} onChange={search => patchFilters({ search })} />
      <Btn label={`Filters (${applied.length})`} icon="filter" kind="secondary" onPress={() => setFiltersOpen(true)} />
      {applied.map(v => <Btn key={v.label} label={`${v.label} ×`} kind="quiet" onPress={v.clear} />)}
      <Txt bold>{records.length} records</Txt>
      {data.edit ? <Btn label="Resume unsaved edit" kind="secondary" onPress={onResumeEdit} /> : null}
    </View>,
  ];
  const sticky: number[] = [];
  for (const day of [...new Set(records.map(r => dayKey(r.date)))]) {
    const group = records.filter(r => dayKey(r.date) === day);
    sticky.push(nodes.length);
    nodes.push(<View key={`day-${day}`} style={{ backgroundColor: C.background, paddingVertical: 12 }}><Txt bold>{dayLabel(group[0].date)} · {group.length} records</Txt><Txt>{totalText(group.flatMap(r => r.lines))}</Txt></View>);
    for (const r of group) nodes.push(<RecordRow key={r.id} r={r} onOpen={() => onOpen(r)} onEdit={() => r.status === 'Draft' ? onResume(r) : onEdit(r)} onReview={() => onResume(r)} />);
  }
  if (!records.length) nodes.push(<Card key="empty"><Txt>No records match these filters.</Txt><Btn label="Clear filters" kind="secondary" onPress={() => patchFilters({ ...emptyFilters(), days: 'all' })} /></Card>);
  if (filtersOpen) nodes.push(<FilterOverlay key="filters" onClose={() => setFiltersOpen(false)} />);
  return <Shell title="Records" tab="Records" onTab={onTab} offline={data.settings.offline} stickyIndices={sticky}>{nodes}</Shell>;
}
function FilterOverlay({ onClose }: { onClose: () => void }) {
  const { data, change } = usePrototype();
  const [f, setF] = useState<Filters>(data!.filters);
  const [species, setSpecies] = useState(false);
  const patch = (p: Partial<Filters>) => setF(current => ({ ...current, ...p }));
  if (!data) return null;
  const rangeGood = f.days !== 'custom' || validRange(f.from, f.to);
  return <Overlay title="Filter records" onClose={onClose} footer={<><Btn label="Apply filters" disabled={!rangeGood} onPress={async () => { if (await change(s => ({ ...s, filters: f }))) onClose(); }} /><Btn label="Cancel" kind="quiet" onPress={onClose} /></>}>
    <Choices label="Time" value={f.days === '1' ? 'Today' : f.days === 'custom' ? 'Custom range' : f.days === 'all' ? 'All time' : `Last ${f.days} days`}
      options={['Today', 'Last 2 days', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Custom range', 'All time']}
      onChange={v => patch({ days: v === 'Today' ? '1' : v === 'Custom range' ? 'custom' : v === 'All time' ? 'all' : v.split(' ')[1] })} />
    {f.days === 'custom' ? <><Field label="From date" hint="YYYY-MM-DD" value={f.from} onChange={from => patch({ from })} /><Field label="To date" hint="YYYY-MM-DD" value={f.to} onChange={to => patch({ to })} />{!rangeGood ? <Notice warning>Enter a valid date range, from first to last.</Notice> : null}</> : null}
    <Select label="Boat" value={f.boatId} options={data.boats.map(b => ({ value: b.id, label: b.name }))} onChange={boatId => patch({ boatId })} />
    <Select label="Fisher" value={f.fisherId} options={data.fishers.map(b => ({ value: b.id, label: b.name }))} onChange={fisherId => patch({ fisherId })} />
    <Choices label="Status" multiple value={f.statuses} options={['Draft', 'Needs review', 'Saved', 'Approved', 'Sent']} onChange={v => patch({ statuses: f.statuses.includes(v) ? f.statuses.filter(s => s !== v) : [...f.statuses, v] })} />
    <Heading>Records that include</Heading>
    {f.species.map(sp => <Btn key={sp} label={`${speciesName(sp)} ×`} kind="secondary" onPress={() => patch({ species: f.species.filter(s => s !== sp) })} />)}
    <Btn label="Choose species filter" kind="secondary" onPress={() => setSpecies(true)} />
    <Btn label="Clear all" kind="quiet" onPress={() => setF({ ...emptyFilters(), days: 'all' })} />
    {species ? <SpeciesPicker onClose={() => setSpecies(false)} onSelect={sp => { patch({ species: [...new Set([...f.species, sp])] }); setSpecies(false); }} /> : null}
  </Overlay>;
}
export function RecordDetail({ r, onBack, onEdit, onHistory }: { r: CatchRecord; onBack: () => void; onEdit: () => void; onHistory: () => void }) {
  const { data } = usePrototype();
  const facts = {
    Boat: r.boatName, Fisher: data?.fishers.find(f => f.id === r.fisherId)?.name, 'Vessel type': r.vesselType, Propulsion: r.propulsion,
    Horsepower: r.horsepower, 'Vessel length (m)': r.length, 'Registration or origin': r.registration, 'Number of crew': r.crew,
    'Gear type': r.gear, 'Total number of gears': r.gearCount, 'Mesh size (inches)': r.mesh, 'Hook size': r.hookSize, 'Hooks per line': r.hooks,
    'Area fished': r.area, 'Date and time out': r.timeOut, 'Date and time in': r.timeIn, 'FAD fishing': r.fad, 'FAD type': r.fadType,
  };
  return <Shell title="Record details" subtitle={`${dayLabel(r.date)} · ${timeLabel(r.date)}`} back={onBack} footer={<><Btn label={r.status === 'Draft' ? 'Resume draft' : 'Edit record'} onPress={onEdit} /><Btn label="History" kind="quiet" onPress={onHistory} /></>}>
    <Badge status={displayStatus(r)} /><Notice>Read only. Choose Edit record to make changes.</Notice>
    <Card><Heading>Record summary</Heading><Txt bold>{totalText(r.lines)}</Txt>{Object.entries(facts).map(([key, value]) => <View key={key}><Txt small muted>{key}</Txt><Txt>{value || 'Not entered'}</Txt></View>)}</Card>
    {r.photo ? <><Image source={require('../../assets/images/demo-rabbitfish.jpg')} style={{ height: 180, width: '100%', borderRadius: 16 }} /><Txt>Prepared photo {r.photo.scenario} · {r.photo.state}</Txt></> : null}
    <Heading>Catch</Heading>{r.lines.map(l => <Card key={l.id}><Txt bold>{speciesName(l.speciesId)}</Txt><Txt>Approximate number: {l.count || 'Not entered'}</Txt><Txt>Weight (kg): {l.weight || 'Not entered'}</Txt><Txt>Price per kg (Ksh): {l.price || 'Not entered'}</Txt><Txt>Remarks: {l.remarks || 'Not entered'}</Txt></Card>)}
    <Heading>Notes</Heading><Txt>{r.notes || 'Not entered'}</Txt>
  </Shell>;
}
export function HistoryScreen({ r, onBack }: { r: CatchRecord; onBack: () => void }) {
  return <Shell title="History" back={onBack}><Heading>{r.boatName || 'Draft'}</Heading>
    {!r.history.length ? <Txt>No changes recorded yet.</Txt> : r.history.slice().reverse().map((h, i) => <Card key={i}>
      <Txt small muted>{dayLabel(h.at)} · {timeLabel(h.at)}</Txt><Txt bold>{h.field}</Txt><Txt>Was: {h.was}</Txt><Txt>Now: {h.now}</Txt><Txt>Reason: {h.reason}</Txt>
    </Card>)}
  </Shell>;
}
export function EditRecord({ onDone, onHistory }: { onDone: () => void; onHistory: (r: CatchRecord) => void }) {
  const { data, change, saved, error } = usePrototype();
  const [cancel, setCancel] = useState(false), [reasonOpen, setReasonOpen] = useState(false), [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState(''), [deleteText, setDeleteText] = useState(''), [actionError, setActionError] = useState('');
  if (!data?.edit) return null;
  const session = data.edit, r = session.working, original = data.records.find(r => r.id === session.recordId)!;
  const changed = differences(original, r);
  const reason = session.reason === 'Other' ? session.otherReason.trim() : session.reason;
  const patch = (patch: Partial<CatchRecord>) => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, working: { ...s.edit.working, ...patch } } : undefined })); };
  const end = async (discard = false) => {
    const ok = await change(s => ({ ...s, edit: undefined,
      ...(discard ? { undo: { kind: 'discardEdit', editSession: session, before: r, afterRevision: r.revision, expiresAt: Date.now() + 10000, label: 'Changes discarded.' } as const } : {}) }));
    if (ok) onDone();
  };
  const save = async () => {
    try {
      const updated = saveEdit(original, r, reason);
      const ok = await change(s => ({ ...s, boats: updateSavedBoat(s, r), records: s.records.map(old => old.id === r.id ? updated : old),
        undo: { kind: 'edit', before: original, afterRevision: updated.revision, expiresAt: Date.now() + 10000, label: 'Changes saved.' } }));
      if (ok && await change(s => ({ ...s, edit: undefined }))) onDone();
    } catch (e) { setActionError((e as Error).message); }
  };
  const summaries: Record<string, string> = {
    'Boat and fisher': `${r.boatName} · ${data.fishers.find(f => f.id === r.fisherId)?.name || 'Fisher not entered'}`,
    'Boat details': `${r.vesselType || 'Type not entered'} · ${r.length ? `${r.length} m` : 'Length not entered'} · ${r.crew || 'No'} crew entered`,
    'Gear and trip': `${r.gear || 'Gear not entered'} · ${r.area || 'Area not entered'}`, Catch: totalText(r.lines), Notes: r.notes || 'Not entered',
  };
  const removeLine = (lineId: string) => {
    const line = r.lines.find(l => l.id === lineId);
    if (!line) return;
    void change(s => ({ ...s, edit: s.edit ? { ...s.edit, working: { ...s.edit.working, lines: s.edit.working.lines.filter(l => l.id !== lineId) } } : undefined,
      undo: { kind: 'line', target: 'edit', before: r, line, index: r.lines.indexOf(line), afterRevision: r.revision, expiresAt: Date.now() + 10000, label: `Removed ${speciesName(line.speciesId)}.` } }));
  };
  return <Shell title="Edit record" subtitle={`${r.boatName} · ${timeLabel(r.date)}`} saved={error ? 'Not saved' : saved ? 'Edit kept locally' : 'Saving…'}
    offline={data.settings.offline} back={() => changed.length ? setCancel(true) : void end()} footer={<>
      {changed.length ? <Btn label={reason ? `Reason: ${reason}` : 'Reason for change · required'} kind="secondary" onPress={() => setReasonOpen(true)} /> : null}
      <View style={s.row}><View style={s.flex}><Btn label="Save changes" disabled={!changed.length || !reason || !r.boatId || !validNumbers(r)} onPress={() => { void save(); }} /></View>
        <View style={s.flex}><Btn label="Cancel" kind="quiet" onPress={() => changed.length ? setCancel(true) : void end()} /></View></View>
    </>}>
    <Badge status={displayStatus(original)} />
    {(original.status === 'Approved' || original.sentAt) ? <Notice warning>Saving will mark this record Needs review.</Notice> : null}
    <Btn label="History" kind="quiet" icon="clock" onPress={() => onHistory(original)} />
    {Object.entries(summaries).map(([section, summary]) => <Card key={section}>
      <Btn label={`${section} · ${session.section === section ? 'collapse' : 'expand'}`} kind="quiet" icon={session.section === section ? 'chevron-up' : 'chevron-down'}
        onPress={() => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, section: session.section === section ? '' : section } : undefined })); }} />
      <Txt>{summary}</Txt>
      {session.section === section ? <View style={{ gap: 16 }}>
        {section === 'Boat and fisher' ? <BoatFields r={r} onChange={patch} original={original} /> : section === 'Boat details' ? <BoatDetails r={r} original={original} onChange={patch} />
          : section === 'Gear and trip' ? <GearTrip r={r} original={original} onChange={patch} />
            : section === 'Catch' ? <CatchReview r={r} original={original} onChange={patch} onRemove={removeLine} showNotes={false} />
              : <Field label="Notes" multiline value={r.notes} before={original.notes} onChange={notes => patch({ notes })} />}
      </View> : null}
    </Card>)}
    {changed.length ? <Card><Heading>{changed.length} changed fields</Heading>{changed.map((c, i) => <View key={i}><Txt bold>{c.field} · Changed</Txt><Txt small>Was: {c.was}</Txt><Txt small>Now: {c.now}</Txt></View>)}</Card> : null}
    {actionError ? <Notice warning>{actionError}</Notice> : null}
    <View style={{ marginTop: 24 }}><Btn label="Delete record" kind="danger" icon="trash-2" onPress={() => setDeleting(true)} /></View>
    {reasonOpen ? <Overlay title="Reason for change" onClose={() => setReasonOpen(false)} footer={<Btn label="Use reason" disabled={!reason} onPress={() => setReasonOpen(false)} />}>
      <Choices label="Choose a reason" options={['Wrong weight', 'Wrong species', 'Wrong boat or fisher', 'Missing information', 'Other']} value={session.reason} onChange={reason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, reason } : undefined })); }} />
      {session.reason === 'Other' ? <Field label="Other reason" value={session.otherReason} onChange={otherReason => { void change(s => ({ ...s, edit: s.edit ? { ...s.edit, otherReason } : undefined })); }} multiline /> : null}
    </Overlay> : null}
    {cancel ? <Overlay title="Discard changes?" onClose={() => setCancel(false)}>
      <Btn label="Keep editing" onPress={() => setCancel(false)} /><Btn label="Discard" kind="danger" onPress={() => { void end(true); }} />
    </Overlay> : null}
    {deleting ? <Overlay title="Delete this record?" onClose={() => setDeleting(false)}>
      <Notice warning>Deleted records leave lists and sends. Their history is kept. Undo is available for 10 seconds.</Notice>
      <Choices label="Reason for deletion" options={['Duplicate', 'Entered by mistake', 'Other']} value={deleteReason} onChange={setDeleteReason} />
      {deleteReason === 'Other' ? <Field label="Other deletion reason" value={deleteText} onChange={setDeleteText} /> : null}
      <Btn label="Confirm delete record" kind="danger" disabled={!deleteReason || (deleteReason === 'Other' && !deleteText.trim())} onPress={async () => {
        const reason = deleteReason === 'Other' ? deleteText.trim() : deleteReason;
        const ok = await change(s => ({ ...s, edit: undefined, records: s.records.map(old => old.id === r.id ? { ...old, deleted: true, revision: old.revision + 1, history: [...old.history, { at: new Date().toISOString(), field: 'Deleted', was: 'No', now: 'Yes', reason }] } : old),
          undo: { kind: 'delete', before: original, afterRevision: original.revision + 1, expiresAt: Date.now() + 10000, label: 'Record deleted.' } }));
        if (ok) onDone();
      }} />
      <Btn label="Cancel" kind="secondary" onPress={() => setDeleting(false)} />
    </Overlay> : null}
  </Shell>;
}
