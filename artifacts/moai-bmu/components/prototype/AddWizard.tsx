import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { usePrototype } from '@/lib/prototype/store';
import { blankRecord, canSave, needsCheck, setDayPrice, speciesName, totals, validNumbers, timeLabel, type CatchRecord } from '@/lib/prototype/model';
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
  const [exit, setExit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const reduceMotion = useMotionPrefs();
  const r = data?.records.find(r => r.id === recordId);
  if (!data || !r) return null;
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
    const text = `${status === 'Saved' ? 'Record saved' : 'Saved for review'}: ${r.boatName}, ${timeLabel(new Date().toISOString())}`;
    configureLayoutMotion(reduceMotion);
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
  const stepEntering = reduceMotion ? FadeIn.duration(100) : stepDirection === 'forward' ? FadeInRight.duration(220) : FadeInLeft.duration(180);
  const stepExiting = reduceMotion ? FadeOut.duration(100) : stepDirection === 'forward' ? FadeOutLeft.duration(180) : FadeOutRight.duration(180);
  const footer = step < 5 ? <ActionBar
    secondary={<Btn label={step === 1 ? 'Back' : 'Previous step'} kind="secondary" onPress={() => step === 1 ? setExit(true) : changeStep(step - 1)} />}
    primary={step < 4 ? <Btn label={`Next: ${['', 'Boat details', 'Gear and trip', 'Photo'][step]}`}
      disabled={(step === 1 && !r.boatId) || !validNumbers(r)}
      disabledReason={step === 1 && !r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
      onPress={() => { void moveNext(); }} /> : undefined} /> : (() => {
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
      {reviewHint ? <Txt small muted>{reviewHint}</Txt> : null}
      <Btn label={busy ? 'Saving…' : 'Save record'} disabled={!canSave(r) || busy}
        disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => { void save('save'); }} />
      <ActionBar secondary={<Btn label="Save for later" kind="secondary" disabled={!r.boatId || !validNumbers(r) || busy}
        disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
        onPress={() => { void save('later'); }} />}
        primary={<Btn label="Save and add next" disabled={!r.boatId || !validNumbers(r) || busy}
          disabledReason={!r.boatId ? 'Choose a boat to continue.' : !validNumbers(r) ? 'Check the numeric fields.' : undefined}
          onPress={() => { void save('next'); }} />} />
    </View>;
  })();
  return <Shell title={r.status === 'Needs review' ? 'Check catch' : 'Add record'} offline={data.settings.offline} scrollKey={`${r.id}-${step}`}
    saved={error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    back={() => step > 1 ? changeStep(step - 1) : setExit(true)} footer={footer}>
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
      <Heading>Add a photo</Heading><Txt>Lay the catch out so all fish are visible.</Txt>
      <Notice>Take a photo of the catch so the species and weights can be checked.</Notice>
      <Choices label="Next prepared photo" value={data.settings.nextPhoto} options={['A', 'B', 'C', 'Error']} onChange={v => { void change(s => ({ ...s, settings: { ...s.settings, nextPhoto: v as typeof s.settings.nextPhoto } })); }} />
      <Txt>A: 8 species · B: 30-second read · C: no results · Error: failed reading</Txt>
      <Btn label="Take photo" icon="camera" onPress={takePhoto} />
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
    {exit ? <Overlay title="Keep this draft?" variant="dialog" onClose={() => setExit(false)}>
      <Txt>Back never clears your entries. Keep the draft to resume from Records.</Txt>
      <ActionBar variant="stacked" primary={<Btn label="Keep draft" closeOnPress onPress={async () => {
        const ok = await change(s => ({ ...s }));
        if (ok) setTimeout(onHome, reduceMotion ? 100 : 110);
        return ok;
      }} />}
        danger={<Btn label="Discard draft" kind="danger" closeOnPress onPress={discardDraft} />} />
    </Overlay> : null}
  </Shell>;
}
