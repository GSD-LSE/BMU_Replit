import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { usePrototype } from '@/lib/prototype/store';
import { blankRecord, canSave, needsCheck, readyToSend, recordCount, setDayPrice, speciesName, totals, validNumbers, timeLabel, type CatchRecord } from '@/lib/prototype/model';
import { BoatDetails, BoatFields, GearTrip, BOAT_DETAIL_FIELDS } from './RecordFields';
import { CatchReview } from './CatchReview';
import { configureLayoutMotion, useMotionPrefs } from './motion';
import { ActionBar, Btn, C, Choices, Heading, Notice, Overlay, Shell, Txt, s } from './ui';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const reduceMotion = useMotionPrefs();
  const previousRecordId = useRef(recordId);
  const freshRecord = previousRecordId.current !== recordId;
  useEffect(() => { previousRecordId.current = recordId; }, [recordId]);
  const r = data?.records.find(r => r.id === recordId);
  if (!data || !r) return null;
  const hasDraftContent = !!(r.boatId || r.fisherId || r.vesselType || r.gear || r.lines.length || r.photo || r.notes || r.area || r.timeOut || r.fad);
  const patch = (patch: Partial<CatchRecord>) => { void change(s => ({
    ...s, records: s.records.map(old => old.id === r.id ? { ...old, ...patch, revision: old.revision + 1 } : old),
  })); };
  const setDailyPrice = (speciesId: string, price: string) => {
    void change(s => ({ ...s, dayPrices: setDayPrice(s, r.site || s.settings.site, r.date, speciesId, price) }));
  };
  const step = r.step;
  const changeStep = (nextStep: number) => {
    if (nextStep === step) return;
    setStepDirection(nextStep > step ? 'forward' : 'back');
    patch({ step: nextStep });
  };
  const moveNext = async () => {
    if (step === 1 && !r.boatId) return;
    setStepDirection('forward');
    await change(s => ({ ...s, boats: step === 2 ? updateSavedBoat(s, r) : s.boats,
      records: s.records.map(old => old.id === r.id ? { ...old, step: Math.min(5, step + 1) } : old) }));
  };
  const save = async (mode: 'save' | 'next' | 'later') => {
    if (!r.boatId || !validNumbers(r) || busy || (mode === 'save' && !canSave(r))) return;
    setBusy(true);
    const status = mode === 'later' || needsCheck(r) > 0 || r.photo?.state === 'processing' ? 'Needs review' : 'Saved';
    const fresh = mode === 'next' ? blankRecord(data.settings.site) : null;
    const readyCount = data.records.filter(record => record.id !== r.id && readyToSend(record)).length + (status === 'Saved' ? 1 : 0);
    const text = status === 'Saved' ? `Saved: ${r.boatName}, ${timeLabel(r.date)}. ${recordCount(readyCount)} ready to send.`
      : `Saved: ${r.boatName}, ${timeLabel(r.date)}. Needs a check.`;
    configureLayoutMotion(reduceMotion);
    const ok = await change(s => ({ ...s, boats: updateSavedBoat(s, r), records: [
      ...(fresh ? [fresh] : []), ...s.records.map(old => old.id === r.id ? { ...old, status, step: 5, revision: old.revision + 1 } as CatchRecord : old)],
      banner: { text, recordId: r.id } }));
    setBusy(false);
    if (ok) { if (fresh) onNextRecord(fresh.id); else onHome(); }
  };
  const takePhoto = () => {
    const scenario = data.settings.nextPhoto;
    void change(s => ({ ...s,
      records: s.records.map(old => old.id === r.id ? { ...old, photo: { scenario, state: 'preview' } } : old) }));
  };
  const retakePhoto = () => {
    setStepDirection('back');
    patch({ step: 4, photo: undefined });
  };
  const removeLine = (lineId: string) => {
    const line = r.lines.find(l => l.id === lineId);
    if (!line) return;
    configureLayoutMotion(reduceMotion);
    void change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, lines: old.lines.filter(l => l.id !== lineId), revision: old.revision + 1 } : old),
      undo: { kind: 'line', before: r, line, index: r.lines.indexOf(line), afterRevision: r.revision + 1, expiresAt: Date.now() + 10000, label: `Removed ${speciesName(line.speciesId)}.` } }));
  };
  const discardDraft = async () => {
    configureLayoutMotion(reduceMotion);
    const ok = await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, deleted: true, revision: old.revision + 1 } : old),
      undo: { kind: 'discard', before: r, afterRevision: r.revision + 1, expiresAt: Date.now() + 10000, label: 'Draft discarded.' } }));
    if (ok) setTimeout(onHome, reduceMotion ? 100 : 110);
    return ok;
  };
  const backFromWizard = async () => {
    if (step > 1) { changeStep(step - 1); return; }
    configureLayoutMotion(reduceMotion);
    if (hasDraftContent) await change(s => ({ ...s, banner: { text: 'Draft saved in Records', recordId: r.id } }));
    else await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, deleted: true, revision: old.revision + 1 } : old) }));
    onHome();
  };
  const stepEntering = reduceMotion ? FadeIn.duration(100) : freshRecord ? FadeIn.duration(150) : stepDirection === 'forward' ? FadeInRight.duration(220) : FadeInLeft.duration(180);
  const stepExiting = reduceMotion ? FadeOut.duration(100) : freshRecord ? FadeOut.duration(150) : stepDirection === 'forward' ? FadeOutLeft.duration(180) : FadeOutRight.duration(180);
  const footer = step === 4 ? undefined : step < 5 ? <Btn label={`Next: ${['', 'Boat details', 'Gear and trip', 'Photo', 'Check catch'][step]}`}
      disabled={(step === 1 && !r.boatId) || !validNumbers(r)}
      disabledReason={step === 1 && !r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
      onPress={() => { void moveNext(); }} /> : (() => {
    const t = totals(r.lines);
    const speciesCount = new Set(r.lines.map(line => line.speciesId)).size;
    const summary = [
      speciesCount ? `${speciesCount} species` : '',
      t.weight !== null ? `${t.weight.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg` : '',
      t.value !== null ? `Ksh ${t.value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}` : '',
      t.missingWeights ? `${t.missingWeights} without weight` : '',
    ].filter(Boolean).join(' · ');
    const reviewHint = needsCheck(r) ? `Saved as Needs review: ${needsCheck(r)} species not checked`
      : r.photo?.state === 'processing' ? 'Saved as Needs review: photo still being read' : '';
    return <View style={{ gap: 8 }}>
      {summary ? <Txt bold>{summary}</Txt> : null}
      {reviewHint ? <Txt small muted>{reviewHint}</Txt> : <Txt small muted>Saves as Saved</Txt>}
      <Btn label={busy ? 'Saving…' : 'Save record'} disabled={!canSave(r) || busy}
        disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => { void save('save'); }} />
      <ActionBar secondary={<Btn label="Save for later" kind="secondary" disabled={!r.boatId || !validNumbers(r) || busy}
        disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => { void save('later'); }} />}
        primary={<Btn label="Save and add next" kind="secondary" disabled={!r.boatId || !validNumbers(r) || busy}
          disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
           onPress={() => { void save('next'); }} />} />
      <Txt small muted>Save for later saves as Needs review.</Txt>
    </View>;
  })();
  return <Shell title={r.status === 'Needs review' ? 'Check catch' : 'Add record'} offline={data.settings.offline} offlineCompact scrollKey={`${r.id}-${step}`}
    saved={error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    back={() => { void backFromWizard(); }} footer={footer}
    headerRight={<Pressable accessibilityRole="button" accessibilityLabel="Record options" onPress={() => setMenuOpen(true)} style={s.iconButton}><Feather name="more-horizontal" size={23} color={C.foreground} /></Pressable>}>
    <Txt bold>Step {step} of 5 · {['Boat', 'Boat details', 'Gear and trip', 'Photo', 'Check catch'][step - 1]}</Txt>
    {step === 1 && data.banner && saved ? <Notice>{data.banner.text}</Notice> : null}
    <View style={s.row}>{[1, 2, 3, 4, 5].map(n => <View key={n} style={[s.segment, { overflow: 'hidden' }]}>
      {n <= step ? <Animated.View entering={FadeIn.duration(reduceMotion ? 100 : 150)} exiting={FadeOut.duration(reduceMotion ? 100 : 100)}
        style={[StyleSheet.absoluteFill, { borderRadius: 3, backgroundColor: C.primary }]} /> : null}
    </View>)}</View>
    <Animated.View key={`${r.id}-step-${step}`} entering={stepEntering} exiting={stepExiting} style={{ gap: 16 }}>
    {step === 1 ? <BoatFields r={r} onChange={patch} /> : null}
    {step === 2 ? <BoatDetails r={r} onChange={patch} /> : null}
    {step === 3 ? <GearTrip r={r} onChange={patch} /> : null}
    {step === 4 ? <>
      <Txt>Lay the catch out so all fish are visible.</Txt>
      {!r.photo || r.photo.state === 'cancelled' ? <Btn label="Take photo" icon="camera" onPress={takePhoto} /> : null}
      {r.photo?.state === 'preview' ? <>
        <Image source={require('../../assets/images/demo-rabbitfish.jpg')} style={{ width: '100%', height: 210, borderRadius: 16 }} resizeMode="cover" />
        <Txt>Photo added</Txt>
        <ActionBar primary={<Btn label="Use photo" onPress={() => { setStepDirection('forward'); patch({ step: 5, photo: { ...r.photo!, state: 'processing', startedAt: Date.now(), dueAt: Date.now() + (r.photo!.scenario === 'B' ? 30000 : 1800) } }); }} />}
          secondary={<Btn label="Retake" kind="secondary" onPress={takePhoto} />} />
      </> : null}
      <Btn label="Skip photo" kind="quiet" onPress={() => { setStepDirection('forward'); patch({ photo: undefined, step: 5 }); }} />
    </> : null}
    {step === 5 ? <CatchReview key={r.id} r={r} onChange={patch} onRemove={removeLine} onSetDailyPrice={setDailyPrice}
      onRetakePhoto={retakePhoto} /> : null}
    </Animated.View>
    {menuOpen ? <Overlay title="Record options" onClose={() => setMenuOpen(false)}>
      <Btn label="Discard draft" kind="danger" closeOnPress onPress={discardDraft} />
    </Overlay> : null}
  </Shell>;
}
