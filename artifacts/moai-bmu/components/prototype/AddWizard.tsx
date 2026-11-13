import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { usePrototype } from '@/lib/prototype/store';
import { blankRecord, canSave, needsCheck, speciesName, totalText, validNumbers, timeLabel, type CatchRecord } from '@/lib/prototype/model';
import { BoatDetails, BoatFields, GearTrip, BOAT_DETAIL_FIELDS } from './RecordFields';
import { CatchReview } from './CatchReview';
import { Btn, C, Choices, Heading, Notice, Overlay, Shell, Txt, s } from './ui';

export function updateSavedBoat(state: NonNullable<ReturnType<typeof usePrototype>['data']>, r: CatchRecord) {
  return r.updateBoat ? state.boats.map(b => {
    if (b.id !== r.boatId) return b;
    const next = { ...b };
    for (const key of BOAT_DETAIL_FIELDS) next[key] = r[key];
    return next;
  }) : state.boats;
}
export default function AddWizard({ recordId, onHome, onNextRecord }: { recordId: string; onHome: () => void; onNextRecord: (id: string) => void }) {
  const { data, change, saved, error } = usePrototype();
  const [exit, setExit] = useState(false), [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = data?.records.find(r => r.id === recordId);
  if (!data || !r) return null;
  const patch = (patch: Partial<CatchRecord>) => { void change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, ...patch, revision: old.revision + 1 } : old) })); };
  const step = r.step;
  const moveNext = async () => {
    if (step === 1 && !r.boatId) return;
    await change(s => ({ ...s, boats: step === 2 ? updateSavedBoat(s, r) : s.boats,
      records: s.records.map(old => old.id === r.id ? { ...old, step: Math.min(5, step + 1) } : old) }));
  };
  const save = async (mode: 'save' | 'next' | 'later') => {
    if (!r.boatId || !validNumbers(r) || busy || (mode === 'save' && !canSave(r))) return;
    setBusy(true);
    const status = mode === 'later' || !canSave(r) ? 'Needs review' : 'Saved';
    const fresh = mode === 'next' ? blankRecord() : null;
    const text = `${status === 'Saved' ? 'Record saved' : 'Saved for review'}: ${r.boatName}, ${timeLabel(new Date().toISOString())}`;
    const ok = await change(s => ({ ...s, boats: updateSavedBoat(s, r), records: [
      ...(fresh ? [fresh] : []), ...s.records.map(old => old.id === r.id ? { ...old, status, step: 5, revision: old.revision + 1 } as CatchRecord : old)],
      banner: { text, recordId: r.id } }));
    setBusy(false);
    if (ok) { if (fresh) onNextRecord(fresh.id); else onHome(); }
  };
  const takePhoto = () => {
    const scenario = data.settings.nextPhoto;
    void change(s => ({ ...s, settings: { ...s.settings, nextPhoto: scenario === 'A' ? 'B' : scenario === 'B' ? 'C' : 'A' },
      records: s.records.map(old => old.id === r.id ? { ...old, photo: { scenario, state: 'preview' } } : old) }));
  };
  const removeLine = (lineId: string) => {
    const line = r.lines.find(l => l.id === lineId);
    if (!line) return;
    void change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, lines: old.lines.filter(l => l.id !== lineId), revision: old.revision + 1 } : old),
      undo: { kind: 'line', before: r, line, index: r.lines.indexOf(line), afterRevision: r.revision + 1, expiresAt: Date.now() + 10000, label: `Removed ${speciesName(line.speciesId)}.` } }));
  };
  const footer = step < 5 ? <>
    <Btn label={step === 1 ? 'Back' : 'Previous step'} kind="secondary" onPress={() => step === 1 ? setExit(true) : patch({ step: step - 1 })} />
    {step < 4 ? <Btn label={`Next: ${['', 'Boat details', 'Gear and trip', 'Photo'][step]}`} disabled={(step === 1 && !r.boatId) || !validNumbers(r)} onPress={() => { void moveNext(); }} /> : null}
  </> : <>
    <Txt bold>{totalText(r.lines)}</Txt>
    {!canSave(r) ? <Txt small>{r.photo?.state === 'processing' ? 'Wait for the photo, or choose Review later.' : needsCheck(r) ? `Check ${needsCheck(r)} species first, or choose Review later.` : 'Choose a boat and check numeric entries.'}</Txt> : null}
    <Btn label={busy ? 'Saving…' : 'Save record'} disabled={!canSave(r) || busy} onPress={() => { void save('save'); }} />
    <View style={s.row}><View style={s.flex}><Btn label="Save and add next" kind="secondary" disabled={!r.boatId || !validNumbers(r) || busy} onPress={() => { void save('next'); }} /></View>
      <View style={s.flex}><Btn label="Review later" kind="quiet" disabled={!r.boatId || !validNumbers(r) || busy} onPress={() => { void save('later'); }} /></View></View>
  </>;
  return <Shell title={r.status === 'Needs review' ? 'Review record' : 'Add record'} offline={data.settings.offline} scrollKey={`${r.id}-${step}`}
    saved={error ? 'Not saved' : saved ? r.status === 'Draft' ? 'Draft saved' : 'Saved on phone' : 'Saving…'}
    back={() => step > 1 ? patch({ step: step - 1 }) : setExit(true)} footer={footer}>
    <Txt bold>Step {step} of 5 · {['Boat', 'Boat details', 'Gear and trip', 'Photo', 'Review catch'][step - 1]}</Txt>
    {step === 1 && data.banner && saved ? <Notice>{data.banner.text}</Notice> : null}
    <View style={s.row}>{[1, 2, 3, 4, 5].map(n => <View key={n} style={[s.segment, n <= step && { backgroundColor: C.primary }]} />)}</View>
    {step === 1 ? <BoatFields r={r} onChange={patch} /> : null}
    {step === 2 ? <BoatDetails r={r} onChange={patch} /> : null}
    {step === 3 ? <GearTrip r={r} onChange={patch} /> : null}
    {step === 4 ? <>
      <Heading>Add a photo</Heading><Txt>Lay the catch out so all fish are visible.</Txt>
      <Notice>Prototype: Take photo cycles through prepared photos. No camera or model is used.</Notice>
      <Choices label="Next prepared photo" value={data.settings.nextPhoto} options={['A', 'B', 'C', 'Error']} onChange={v => { void change(s => ({ ...s, settings: { ...s.settings, nextPhoto: v as typeof s.settings.nextPhoto } })); }} />
      <Txt>A: 8 species · B: 30-second read · C: no results · Error: failed reading</Txt>
      <Btn label="Take photo" icon="camera" onPress={takePhoto} />
      {r.photo?.state === 'preview' ? <>
        <Image source={require('../../assets/images/demo-rabbitfish.jpg')} style={{ width: '100%', height: 210, borderRadius: 16 }} resizeMode="cover" />
        <Txt>Prepared photo {r.photo.scenario}</Txt>
        <Btn label="Use photo" onPress={() => patch({ step: 5, photo: { ...r.photo!, state: 'processing', startedAt: Date.now(), dueAt: Date.now() + (r.photo!.scenario === 'B' ? 30000 : 1800) } })} />
        <Btn label="Retake" kind="secondary" onPress={takePhoto} />
      </> : null}
      <Btn label="Skip photo" kind="quiet" onPress={() => patch({ photo: undefined, step: 5 })} />
    </> : null}
    {step === 5 ? <CatchReview key={r.id} r={r} onChange={patch} onRemove={removeLine} /> : null}
    {exit ? <Overlay title="Keep this draft?" onClose={() => setExit(false)}>
      <Txt>Back never clears your entries. Keep the draft to resume from Records.</Txt>
      <Btn label="Keep draft" onPress={async () => { if (await change(s => ({ ...s }))) onHome(); }} />
      <Btn label="Discard draft" kind="danger" onPress={() => setDiscard(true)} />
      {discard ? <><Notice warning>Discard this draft? You can Undo for 10 seconds.</Notice><Btn label="Confirm discard" kind="danger" onPress={async () => {
        const ok = await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, deleted: true, revision: old.revision + 1 } : old),
          undo: { kind: 'discard', before: r, afterRevision: r.revision + 1, expiresAt: Date.now() + 10000, label: 'Draft discarded.' } }));
        if (ok) onHome();
      }} /></> : null}
    </Overlay> : null}
  </Shell>;
}
