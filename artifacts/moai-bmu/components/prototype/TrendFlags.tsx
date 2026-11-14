import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { usePrototype } from '@/lib/prototype/store';
import { type CountyFlag, validEmail } from '@/lib/prototype/model';
import { addFlagFollowup, createFlag, DEMO_YEAR, makeTrendSnapshot, patchFlag, queueFlag, resolveFlag, setFlagClosed } from '@/lib/prototype/trends-model';
import { ActionBar, Btn, C, Card, Choices, Field, Heading, Notice, Overlay, Shell, StatusChip, Txt, s } from './ui';

const COLORS = ['#4B35C4', '#34495A', '#49606F', '#62788B', '#80949A', '#A6B4B0'];
const colorForYear = (year: number) => year === DEMO_YEAR ? COLORS[0] : COLORS[((DEMO_YEAR - year - 1) % (COLORS.length - 1)) + 1];
const dashForYear = (year: number) => year === DEMO_YEAR ? '' : ['10 5', '5 5', '2 4', '7 3 2 3', '3 3'][((DEMO_YEAR - year - 1) % 5)];

function validFollowupDate(value: string) {
  if (value === 'Not known') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function FlagScreen({ flagId, snapshot, onBack, onChartChange, onDetail, onDraftSaved }: {
  flagId?: string; snapshot?: ReturnType<typeof makeTrendSnapshot>; onBack: () => void; onChartChange: (id?: string) => void; onDetail: (id: string) => void; onDraftSaved: () => void;
}) {
  const { data, change, saved } = usePrototype();
  const initial = data?.flags?.find(f => f.id === flagId);
  const [localId, setLocalId] = useState(initial?.id ?? '');
  const flag = data?.flags?.find(f => f.id === localId) ?? initial;
  const lastRecipient = data?.flags?.find(item => item.sentTo || item.recipient)?.sentTo ?? data?.flags?.find(item => item.recipient)?.recipient ?? '';
  const [note, setNote] = useState(flag?.note ?? ''), [recipient, setRecipient] = useState(flag?.recipient ?? lastRecipient), [picture, setPicture] = useState(flag?.includePicture ?? true);
  const [weeks, setWeeks] = useState<number[] | null>(flag?.markedWeeks ?? null), [followupOpen, setFollowupOpen] = useState(false);
  const [followup, setFollowup] = useState({ agreed: '', owner: '', when: 'Not known', evidence: '', outcome: 'Not sure yet' });
  const [recipientPicker, setRecipientPicker] = useState(false), [actionError, setActionError] = useState('');
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const creationRef = useRef<Promise<string> | null>(null);
  const createdDraftRef = useRef<CountyFlag | null>(null);
  const readOnly = flag?.status === 'Sent';
  if (!data) return null;
  const newFlag = async () => {
    if (creationRef.current) return creationRef.current;
    if (!snapshot) return '';
    creationRef.current = (async () => {
      try {
        const made = patchFlag(createFlagForScreen(data, snapshot), { recipient: lastRecipient });
        createdDraftRef.current = made;
        setLocalId(made.id);
        try {
          const ok = await change(s => ({ ...s, flags: s.flags?.some(item => item.id === made.id) ? s.flags : [made, ...(s.flags ?? [])] }));
          setDraftSaveFailed(!ok);
          if (!ok) setActionError('Could not save this flag draft. Nothing was discarded; try again.');
        } catch {
          setDraftSaveFailed(true);
          setActionError('Could not save this flag draft. Nothing was discarded; try again.');
        }
        return made.id;
      } catch {
        creationRef.current = null;
        setActionError('Could not save this flag draft. Nothing was discarded; try again.');
        return '';
      }
    })();
    return creationRef.current;
  };
  useEffect(() => {
    if (!flagId && snapshot && !localId) void newFlag();
  }, [flagId, localId, snapshot]);
  const persist = (patch: Partial<CountyFlag>) => {
    if (readOnly) return;
    if (!flag) { void newFlag().then(async id => {
      if (!id) return;
      try {
        const fallback = createdDraftRef.current ? patchFlag(createdDraftRef.current, patch) : null;
        const ok = await change(s => {
          const current = s.flags?.find(item => item.id === id);
          const updated = current ? patchFlag(current, patch) : fallback;
          if (!updated) return s;
          return { ...s, flags: current
            ? s.flags!.map(item => item.id === id ? updated : item)
            : [updated, ...(s.flags ?? [])] };
        });
        if (fallback) createdDraftRef.current = fallback;
        setDraftSaveFailed(!ok);
        if (!ok) setActionError('Could not save the latest edits. They are still visible here; try again.');
      } catch { setDraftSaveFailed(true); setActionError('Could not save the latest edits. They are still visible here; try again.'); }
    }).catch(() => setActionError('Could not save the latest edits. They are still visible here; try again.')); return; }
    void change(s => ({ ...s, flags: s.flags!.map(f => f.id === flag.id ? patchFlag(f, patch) : f) })).then(ok => {
      setDraftSaveFailed(!ok);
      if (!ok) setActionError('Could not save the latest edits. They are still visible here; try again.');
    }).catch(() => { setDraftSaveFailed(true); setActionError('Could not save the latest edits. They are still visible here; try again.'); });
  };
  const memberStatements = ['Fewer trips than usual', 'Rough seas', 'Fishers landed elsewhere', 'Different fish targeted', 'Fuel costs more', 'Some records may be missing'];
  const append = (value: string) => { const next = `${note}${note ? '\n' : ''}${value}`.slice(0, 300); setNote(next); persist({ note: next }); };
  const activeSnapshot = readOnly ? flag?.sentSnapshot ?? flag?.snapshot : flag?.snapshot ?? snapshot;
  const starterSpecies = activeSnapshot?.species && activeSnapshot.species !== 'All species' ? activeSnapshot.species : '';
  const starters = ['Catch looks lower than earlier years for these weeks.', 'Catch looks higher than earlier years.',
    ...(starterSpecies ? [`${starterSpecies} looks lower than earlier years.`] : []), 'Prices look different.', 'Trips look longer.', 'Something else.'];
  const saveLater = async () => {
    if (readOnly) { onBack(); return; }
    setActionError('');
    const id = flag?.id ?? await newFlag();
    if (!id) { setDraftSaveFailed(true); setActionError('Draft was not saved. Keep this screen open and try again.'); return; }
    try {
      const fallback = createdDraftRef.current ?? flag;
      const ok = await change(s => {
        const current = s.flags?.find(item => item.id === id) ?? fallback;
        if (!current) return s;
        const updated = patchFlag(current, { note, recipient, includePicture: picture, markedWeeks: weeks });
        return { ...s, flags: s.flags?.some(item => item.id === id)
          ? s.flags.map(item => item.id === id ? updated : item)
          : [updated, ...(s.flags ?? [])] };
      });
      if (!ok) {
        setDraftSaveFailed(true);
        setActionError('Draft was not saved. Your edits are still here; try again.');
        return;
      }
      setDraftSaveFailed(false);
      setActionError('');
      createdDraftRef.current = null;
      if (note.trim() || weeks !== null || recipient) onDraftSaved();
      onBack();
    } catch {
      setDraftSaveFailed(true);
      setActionError('Draft was not saved. Your edits are still here; try again.');
    }
  };
  const chooseWeek = (week: number) => {
    if (readOnly) return;
    const next = !weeks || weeks.length !== 1 ? [week] : weeks[0] === week ? [week] : Array.from({ length: Math.abs(week - weeks[0]) + 1 }, (_, index) => Math.min(week, weeks[0]) + index);
    setWeeks(next); persist({ markedWeeks: next });
  };
  const sendFlag = async () => {
    setActionError('');
    try {
      if (!flag && snapshot) {
        const id = await newFlag();
        const made = createdDraftRef.current ?? data.flags?.find(item => item.id === id);
        if (!made) throw new Error('Could not save this flag draft. Try again.');
        const next = queueFlag({ ...made, note, recipient, includePicture: picture, markedWeeks: weeks }, { ...data, flags: [made, ...(data.flags ?? [])] });
        const ok = await change(s => ({ ...s, recipients: [...new Set([...s.recipients, recipient.trim()])],
          flags: s.flags?.some(item => item.id === made.id) ? s.flags.map(item => item.id === made.id ? next : item) : [next, ...(s.flags ?? [])] }));
        if (ok) onDetail(next.id); else setActionError('Could not save this flag. It is still here on screen; try again.');
      } else if (flag) {
        const next = queueFlag({ ...flag, note, recipient, includePicture: picture, markedWeeks: weeks }, data);
        const failedUsed = data.trends?.nextFlagFails;
        const ok = await change(s => ({ ...s, recipients: [...new Set([...s.recipients, recipient.trim()])],
          trends: { ...s.trends!, nextFlagFails: failedUsed ? false : s.trends!.nextFlagFails }, flags: s.flags!.map(f => f.id === flag.id ? next : f) }));
        if (ok) onDetail(flag.id); else setActionError('Could not save this flag. It is still here on screen; try again.');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not send this flag. It is still saved on this phone.');
    }
  };
  const title = activeSnapshot?.title ?? 'Chart';
  const sticky = <View style={{ gap: 6, padding: 12 }}>
    {data.settings.offline ? <Txt small muted>Offline: Send flag saves it on this phone and queues it for later.</Txt> : null}
    <ActionBar variant="stacked" secondary={<Btn label="Save for later" kind="quiet" onPress={saveLater} />}
      primary={<Btn label="Send flag" disabled={!validEmail(recipient) || readOnly}
        disabledReason={!validEmail(recipient) ? 'Choose a valid email address.' : undefined} onPress={() => { void sendFlag(); }} />} />
  </View>;
  return <Shell title={readOnly ? 'Flag details' : 'Flag to county'} back={() => { void saveLater(); }} backLabel="Back" saved={draftSaveFailed ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'} footer={!readOnly && (!flag || flag.status === 'Draft') ? sticky : undefined} contentGap={14}>
    {flag ? <StatusChip status={flag.status} /> : <Text style={{ color: C.mutedForeground, fontSize: 14 }}>
      Draft · {draftSaveFailed ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    </Text>}
    {flag && ['Waiting to send', "Couldn't send"].includes(flag.status) ? <Card>
      {flag.status === "Couldn't send" ? <Txt>Could not send this flag. It is saved on this phone.</Txt> : <Txt>Flag is waiting on this phone. Sending is simulated in this prototype.</Txt>}
      {flag.status === "Couldn't send" ? <Btn label="Try again" kind="secondary" onPress={() => { void change(s => resolveFlag(s, flag.id, 'retry')); }} /> : null}
      <Btn label="Cancel sending" kind="quiet" onPress={() => { void change(s => resolveFlag(s, flag.id, 'cancel')); }} />
    </Card> : null}
    {actionError ? <Notice warning><Txt>{actionError}</Txt></Notice> : null}
    {!readOnly ? <><Card><Heading>What you are flagging</Heading><Txt bold>{title} · {activeSnapshot?.species ?? 'All species'}</Txt>
      <Txt>{activeSnapshot?.years.join(', ')} · {activeSnapshot?.range} · Synthetic sample</Txt><Txt>Demo data, not real catches</Txt>
      <Txt>Source: {activeSnapshot ? Object.values(activeSnapshot.sources).join(' · ') : 'Synthetic sample'}</Txt>
      <Btn label="Change chart" kind="quiet" disabled={readOnly} onPress={() => onChartChange(flag?.id)} />
      <Txt bold>Mark a week range you are worried about</Txt>
      <Txt small muted>{weeks === null ? 'Choose a start week, then an end week.' : weeks.length === 1 ? `Start: week ${weeks[0]}. Choose an end week.` : `Weeks ${Math.min(...weeks)}–${Math.max(...weeks)} selected.`}</Txt>
      <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 8 }} accessibilityLabel="Weeks to mark"><Pressable disabled={readOnly} onPress={() => { setWeeks(null); persist({ markedWeeks: null }); }} style={[s.quickChip, weeks === null && s.quickChipSelected]}><Text style={s.chipLabel}>Whole chart</Text></Pressable>
        {(activeSnapshot?.series[String(DEMO_YEAR)] ?? []).filter(point => point.week <= 46).map(({ week }) => <Pressable key={week} disabled={readOnly} accessibilityRole="button" accessibilityLabel={`Week ${week}`} onPress={() => chooseWeek(week)}
          style={[s.quickChip, weeks?.includes(week) && s.quickChipSelected, { minWidth: 48, minHeight: 48 }]}><Text style={s.chipLabel}>{week}</Text></Pressable>)}
      </ScrollView>
    </Card>
    <View style={{ gap: 8 }}><Text style={s.label}>What did you notice?</Text>
      <Field label="Your note" value={readOnly ? flag?.sentNote ?? '' : note} multiline disabled={readOnly} onChange={v => { const next = v.slice(0, 300); setNote(next); persist({ note: next }); }}
        hint="Write one or two sentences. You do not need to say why." />
      <Txt small muted>{300 - (readOnly ? flag?.sentNote?.length ?? 0 : note.length)} left · Do not write names or phone numbers.</Txt>
      <Txt bold>Sentence starters</Txt><View style={s.wrap}>{starters.map(text => <Pressable key={text} disabled={readOnly} onPress={() => append(text)} style={[s.quickChip, { minHeight: 48 }]}><Text style={s.chipLabel}>{text}</Text></Pressable>)}</View>
      <Txt bold>What members say (not checked)</Txt><View style={s.wrap}>{memberStatements.map(text => <Pressable key={text} disabled={readOnly} onPress={() => append(`Members say: ${text.toLowerCase()}`)} style={[s.quickChip, { minHeight: 48 }]}><Text style={s.chipLabel}>{text}</Text></Pressable>)}</View>
    </View>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: picture }} disabled={readOnly} onPress={() => { const next = !picture; setPicture(next); persist({ includePicture: next }); }}
      style={[s.settingRow, { minHeight: 48 }]}><Text style={{ flex: 1, color: C.foreground }}>Include a picture of the chart</Text><Feather name={picture ? 'check-square' : 'square'} size={21} color={C.primary} /></Pressable>
    <Txt small muted>The numbers behind the chart are always included. No file leaves this phone.</Txt>
    <Heading>To</Heading>
    <Pressable accessibilityRole="button" disabled={readOnly} onPress={() => setRecipientPicker(true)} style={s.pickerRow}><Text style={s.pickerRowText}>{readOnly ? flag?.sentRecipient ?? flag?.sentTo : recipient || 'Choose who to send to'}</Text>{!readOnly ? <Feather name="chevron-down" size={20} color={C.foreground} /> : null}</Pressable>
    <Btn label="Add new email" kind="quiet" onPress={() => setRecipientPicker(true)} />
    </> : null}
    <View style={{ gap: 8 }}><Heading>{readOnly ? 'Flag as sent' : 'What the county will see'}</Heading>
      {!readOnly ? <Txt>This will leave your phone. The county will see: the chart numbers, the weeks you marked, your note, your name and site.</Txt> : null}
      <Txt bold>This is a practice send. No real recipient will receive this.</Txt>
      {activeSnapshot ? <FlagCard snapshot={activeSnapshot} site={readOnly ? flag?.sentCard?.site ?? data.settings.site
        : activeSnapshot.site && activeSnapshot.site !== 'All sites' ? activeSnapshot.site : data.settings.site}
        collector={readOnly ? flag?.sentCard?.collector ?? data.settings.collector : data.settings.collector}
        at={flag?.sentAt ?? flag?.createdAt ?? new Date().toISOString()} number={readOnly ? flag?.sentCard?.number ?? flag?.number ?? 1 : flag?.number ?? 1}
        note={readOnly ? flag?.sentNote ?? '' : note} weeks={readOnly ? flag?.sentWeeks ?? null : weeks}
        includePicture={readOnly ? flag?.sentPicture ?? true : picture} /> : null}
    </View>
    {readOnly ? <>
      <Txt>Flag sent from this phone, {flag?.sentAt ? `${new Date(flag.sentAt).toLocaleDateString('en-GB')} ${new Date(flag.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}, to {flag?.sentTo ?? flag?.sentRecipient}. We can&apos;t confirm it has been received.</Txt>
      <Heading>History</Heading>{flag?.history.map((item, index) => <Txt key={index}>{item.label} · {item.at}</Txt>)}
      {data.trends?.countyReplies ? <Txt>Reply from county, 5 Dec (written in by BMU)</Txt> : null}
      {flag?.followup ? <Card><Heading>Follow-up (written by you)</Heading><Txt>{flag.followup.agreed}</Txt><Txt>{flag.followup.owner}</Txt><Txt>{flag.followup.when || 'Not known'} · {flag.followup.outcome}</Txt></Card>
        : <Card><Heading>Follow-up (written by you)</Heading><Txt>No follow-up recorded.</Txt><Btn label="Record follow-up" kind="secondary" onPress={() => setFollowupOpen(true)} /></Card>}
      {flag?.closedAt ? <Txt>Closed {flag.closedAt}</Txt> : null}
      {flag?.followup ? <Btn label={flag.closedAt ? 'Reopen' : 'Close flag'} kind="quiet" onPress={() => {
        void change(s => ({ ...s, flags: s.flags!.map(item => item.id === flag.id ? setFlagClosed(item, !item.closedAt) : item) }));
      }} /> : null}
      <Btn label="Send a follow-up flag" kind="secondary" onPress={() => {
        if (!flag) return;
        const next = patchFlag(createFlagForScreen(data, flag.snapshot, flag.id), { recipient: lastRecipient });
        void change(s => ({ ...s, flags: [next, ...(s.flags ?? [])] })).then(ok => {
          if (ok) onDetail(next.id); else setActionError('Could not save the follow-up flag. Try again.');
        }).catch(() => setActionError('Could not save the follow-up flag. Try again.'));
      }} />
    </> : null}
    {recipientPicker ? <Overlay title="Choose who to send to" onClose={() => setRecipientPicker(false)}>
      {data.recipients.map(email => <Pressable key={email} onPress={() => { setRecipient(email); persist({ recipient: email }); setRecipientPicker(false); }} style={s.pickerRow}>
        <Text style={s.pickerRowText}>{email}</Text><Feather name={email === recipient ? 'check-circle' : 'circle'} size={20} color={C.primary} /></Pressable>)}
      <Field label="New email address" value={recipient} onChange={value => { setRecipient(value); persist({ recipient: value }); }} keyboardType="email-address" />
      <Btn label="Save recipient" disabled={!validEmail(recipient)} disabledReason={!validEmail(recipient) ? 'Enter a valid email address.' : undefined} onPress={async () => {
        try {
          if (validEmail(recipient)) {
            const ok = await change(s => ({ ...s, recipients: [...new Set([...s.recipients, recipient.trim()])] }));
            if (!ok) { setActionError('Recipient was not saved. Try again.'); return; }
          }
          setRecipientPicker(false);
        } catch { setActionError('Recipient was not saved. Try again.'); }
      }} />
      {actionError ? <Notice warning><Txt>{actionError}</Txt></Notice> : null}
    </Overlay> : null}
    {followupOpen ? <Overlay title="Record follow-up" onClose={() => setFollowupOpen(false)} footer={<ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={() => setFollowupOpen(false)} />}
      primary={<Btn label="Save" disabled={!validFollowupDate(followup.when)} disabledReason={!validFollowupDate(followup.when) ? 'Use YYYY-MM-DD or Not known.' : undefined}
        onPress={async () => { if (flag && validFollowupDate(followup.when)) {
          try {
            const ok = await change(s => ({ ...s, flags: s.flags!.map(f => f.id === flag.id ? addFlagFollowup(f, followup) : f) }));
            if (ok) setFollowupOpen(false); else setActionError('Follow-up was not saved. Try again.');
          } catch { setActionError('Follow-up was not saved. Try again.'); }
        } }} />} />}>
      <Field label="What was agreed" value={followup.agreed} onChange={v => setFollowup({ ...followup, agreed: v })} />
      <Field label="Who owns the next step" value={followup.owner} onChange={v => setFollowup({ ...followup, owner: v })} />
      <Field label="When will members hear back" value={followup.when === 'Not known' ? '' : followup.when} onChange={v => setFollowup({ ...followup, when: v })} hint="Use YYYY-MM-DD, or choose Not known." />
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: followup.when === 'Not known' }} onPress={() => setFollowup({ ...followup, when: 'Not known' })}
        style={[s.quickChip, followup.when === 'Not known' && s.quickChipSelected]}><Text style={s.chipLabel}>Not known</Text></Pressable>
      {followup.when !== 'Not known' && followup.when && !validFollowupDate(followup.when) ? <Text style={{ color: C.destructive, fontSize: 14 }}>Enter a real date as YYYY-MM-DD, or choose Not known.</Text> : null}
      <Field label="Evidence that mattered" value={followup.evidence} onChange={v => setFollowup({ ...followup, evidence: v })} />
      <Choices label="Outcome" options={['County will analyse', 'More records needed', 'No action needed', 'Not sure yet']} value={followup.outcome} onChange={v => setFollowup({ ...followup, outcome: v })} rows />
      {actionError ? <Notice warning><Txt>{actionError}</Txt></Notice> : null}
    </Overlay> : null}
  </Shell>;
}

function createFlagForScreen(state: NonNullable<ReturnType<typeof usePrototype>['data']>, snap: ReturnType<typeof makeTrendSnapshot>, follows?: string): CountyFlag {
  return createFlag(state, snap, follows);
}
function FlagCard({ snapshot, site, collector, at, number, note, weeks, includePicture }: {
  snapshot: NonNullable<CountyFlag['sentSnapshot']>; site: string; collector: string; at: string; number: number;
  note: string; weeks: number[] | null; includePicture: boolean;
}) {
  const plotted = snapshot.years.map((year, index) => {
    const points = snapshot.series[String(year)] ?? [];
    const values = points.map(point => point.value).filter((value): value is number => value !== null);
    const max = Math.max(1, ...values);
    let segment = '';
    const paths: string[] = [];
    points.forEach(point => {
      if (point.value === null) { if (segment) paths.push(segment); segment = ''; return; }
      segment += `${segment ? ' L' : 'M'} ${5 + (point.week - 1) / 51 * 260} ${66 - (point.value / max) * 54}`;
    });
    if (segment) paths.push(segment);
    return { year, index, d: paths.join(' '), tripCount: snapshot.trips[String(year)] };
  });
  return <Card>
    <Heading>Data of concern</Heading>
    <Txt bold>{snapshot.title}, {snapshot.species}</Txt><Txt>{site} · BMU · Site-level data only</Txt>
    <Heading>Raised by</Heading><Txt>{collector}, {new Date(at).toLocaleDateString('en-GB')} {new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · Flag {number} from this phone</Txt>
    <Heading>What the chart shows</Heading><Txt>{snapshot.years.join(', ')} · {snapshot.range} · {weeks?.length ? `Weeks ${Math.min(...weeks)}–${Math.max(...weeks)}` : 'Whole chart'}</Txt>
    {plotted.map(item => <Txt key={item.year}>{item.year} {snapshot.sources[String(item.year)]} · based on {item.tripCount ?? 'trips not given'} trips</Txt>)}
    {includePicture ? <View style={{ height: 82, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width="100%" height={80} viewBox="0 0 270 80">
        {weeks?.map(week => <Rect key={`week-${week}`} x={5 + (week - 1) / 51 * 260 - 2} y={5} width={5} height={70} fill="#EEEFF0" />)}
        {[0, 1, 2].map(index => <Line key={index} x1="5" x2="265" y1={15 + index * 24} y2={15 + index * 24} stroke="#C9D3CF" />)}
        {plotted.slice(0, 4).map(item => <Path key={item.year} d={item.d} fill="none" stroke={colorForYear(item.year)} strokeWidth={item.year === DEMO_YEAR ? 3 : 2} strokeDasharray={dashForYear(item.year)} />)}
      </Svg>
    </View> : null}
    <Text style={{ color: C.mutedForeground, fontSize: 14 }}>Demo data, not real catches</Text>
    <Txt>Records needing a check are not included.</Txt>
    <Heading>Members&apos; note (not checked)</Heading><Txt>{note}</Txt>
    <Txt>Please analyse this data and tell the BMU what you think is happening and whether any follow-up is needed. We are not saying what caused this.</Txt>
    <Txt>Sent from a BMU phone. This is not a final report.</Txt>
  </Card>;
}

export function FlagsList({ onBack, onOpen, onTab, tab = 'Settings' }: { onBack: () => void; onOpen: (id: string) => void; onTab: (tab: string) => void; tab?: 'Records' | 'Settings' }) {
  const { data } = usePrototype();
  if (!data) return null;
  return <Shell title="Flags" back={onBack} tab={tab} onTab={onTab} offline={data.settings.offline} offlineCompact contentGap={10}>
    {!data.flags?.length ? <Card><Heading>No flags yet</Heading><Txt>Flags saved on this phone will appear here.</Txt></Card> :
      data.flags.map((flag, index) => {
        const markedWeeks = flag.status === 'Sent' ? flag.sentWeeks : flag.markedWeeks;
        return <Pressable key={flag.id} accessibilityRole="button" onPress={() => onOpen(flag.id)} style={[s.card, { gap: 6 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ flex: 1, color: C.foreground, fontWeight: '700', fontSize: 16 }}>Flag {flag.number ?? index + 1} · {flag.snapshot.title}, {flag.snapshot.species}</Text><StatusChip status={flag.status} /></View>
          <Txt>Weeks {markedWeeks?.length ? `${Math.min(...markedWeeks)} to ${Math.max(...markedWeeks)}` : 'Whole chart'} · {flag.snapshot.years.join(' vs ')}</Txt>
          <Txt small muted>To {flag.sentTo ?? (flag.recipient || 'no recipient')} · {flag.sentAt ? `Sent ${flag.sentAt.slice(0, 10)}` : 'Not sent yet'}</Txt>
          {flag.followup ? <Txt small muted>Follow-up recorded {flag.followup.recordedAt.slice(0, 10)}</Txt> : <Txt small muted>No follow-up recorded</Txt>}
          {flag.closedAt ? <Txt small muted>Closed {flag.closedAt}</Txt> : null}
        </Pressable>;
      })}
  </Shell>;
}
