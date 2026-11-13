import React, { useState } from 'react';
import { View } from 'react-native';
import { usePrototype } from '@/lib/prototype/store';
import {
  PROPULSIONS, VESSELS, canSave, dateRange, dayKey, dayLabel, id, makeFixtures, sendPreview, simulateSend, timeLabel, validEmail, validRange,
  type Attempt, type Boat, type Schedule, type SendDraft,
} from '@/lib/prototype/model';
import { Badge, Btn, Card, Choices, Field, Heading, Notice, Overlay, Select, Shell, Txt, s } from './ui';

export const PrototypeBanner = () => <Notice>Prototype: nothing is actually sent.</Notice>;
export const initialSend = (): SendDraft => ({ step: 1, period: 'Last 2 weeks', from: '', to: '', email: '', saveEmail: true, message: '' });
export function SendWizard({ onHome, onReview, onSchedule }: { onHome: () => void; onReview: () => void; onSchedule: () => void }) {
  const { data, change } = usePrototype();
  const [resultId, setResultId] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const draft = data?.sendDraft;
  const result = data?.attempts.find(a => a.id === resultId);
  if (!data) return null;
  if (result) return <SendResult attempt={result} onHome={onHome} onSchedule={onSchedule} />;
  if (!draft) return <Shell title="Send data" back={onHome}><PrototypeBanner /><Txt>Sending setup is kept locally.</Txt><Btn label="Start send setup" onPress={() => { void change(s => ({ ...s, sendDraft: initialSend() })); }} /></Shell>;
  const patch = (patch: Partial<SendDraft>) => { void change(s => ({ ...s, sendDraft: { ...s.sendDraft!, ...patch } })); };
  const [from, to] = dateRange(draft.period, draft.from, draft.to);
  const rangeGood = validRange(from, to), preview = sendPreview(data, from, to);
  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let attemptId = '';
      const ok = await change(s => {
        const result = simulateSend(s, s.sendDraft!);
        attemptId = result.attempt.id;
        // Keep setup until the local result is confirmed written.
        return { ...result.state, sendDraft: s.sendDraft };
      });
      if (ok) { setResultId(attemptId); void change(s => ({ ...s, sendDraft: undefined })); }
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return <Shell title="Send data" subtitle={`Step ${draft.step} of 3 · ${['Period', 'Recipient', 'Review'][draft.step - 1]}`}
    offline={data.settings.offline} back={() => draft.step === 1 ? onHome() : patch({ step: draft.step - 1 })}
    footer={<>
      {draft.step > 1 ? <Btn label="Previous step" kind="secondary" onPress={() => patch({ step: draft.step - 1 })} /> : null}
      {draft.step < 3 ? <Btn label={draft.step === 1 ? 'Next: Recipient' : 'Next: Review'}
        disabled={draft.step === 1 ? !rangeGood || !preview.eligible.length : !validEmail(draft.email)}
        onPress={() => patch({ step: draft.step + 1 })} />
        : <Btn label={busy ? 'Saving simulated result…' : data.settings.offline ? 'Send when online' : 'Send'}
          disabled={busy || !rangeGood || !validEmail(draft.email) || !preview.eligible.length} onPress={() => { void send(); }} />}
    </>}>
    <PrototypeBanner />
    {draft.step === 1 ? <>
      <Choices label="Period" value={draft.period} options={['Last 2 weeks', 'Last 4 weeks', 'Last month', 'Custom range']} onChange={period => patch({ period })} />
      {draft.period === 'Custom range' ? <><Field label="From date" hint="YYYY-MM-DD" value={draft.from} onChange={from => patch({ from })} /><Field label="To date" hint="YYYY-MM-DD" value={draft.to} onChange={to => patch({ to })} /></> : null}
      {!rangeGood ? <Notice warning>Enter a valid date range.</Notice> : <Card>
        <Txt bold>{preview.eligible.length} records ready to send</Txt><Txt>{preview.excluded.length} not included (Draft or Needs review)</Txt>
        <Txt>{from} to {to}</Txt>
        {preview.excluded.length ? <Btn label="Review them" kind="quiet" onPress={onReview} /> : null}
        {!preview.eligible.length ? <Txt>No records to send in this period.</Txt> : null}
      </Card>}
      <Txt>Saved and Approved records are eligible. Prior simulated sends do not remove them from a chosen period.</Txt>
    </> : draft.step === 2 ? <>
      <Select label="Send to" value={data.recipients.includes(draft.email) ? draft.email : ''} options={data.recipients.map(email => ({ value: email, label: email }))} onChange={email => patch({ email })} />
      <Heading>Add new email</Heading>
      <Field label="Email address" keyboardType="email-address" value={draft.email} onChange={email => patch({ email })} />
      {draft.email && !validEmail(draft.email) ? <Notice warning>Enter an email like name@example.com</Notice> : null}
      <Choices label="Recipient preference" multiple options={['Save this email for next time']}
        value={draft.saveEmail ? ['Save this email for next time'] : []} onChange={() => patch({ saveEmail: !draft.saveEmail })} />
      <Field label="Message (optional)" hint="Add a note for the recipient" value={draft.message} onChange={message => patch({ message })} multiline />
    </> : <Card>
      <Heading>Review and send</Heading>
      {Object.entries({ Period: `${from} to ${to}`, Records: String(preview.eligible.length), Recipient: draft.email, Message: draft.message || 'Not entered', File: 'Spreadsheet (CSV)' }).map(([label, value]) => <View key={label}><Txt small muted>{label}</Txt><Txt>{value}</Txt></View>)}
      <Txt>No file is generated or shared. This only records a simulated attempt on this phone.</Txt>
    </Card>}
    {error ? <Notice warning>{error}</Notice> : null}
  </Shell>;
}
export function SendResult({ attempt, onHome, onSchedule }: { attempt: Attempt; onHome: () => void; onSchedule: () => void }) {
  const { data, change } = usePrototype();
  return <Shell title={attempt.state === 'Sent' ? 'Data sent' : attempt.state} back={onHome} offline={data?.settings.offline} footer={<><Btn label="Done" onPress={onHome} /><Btn label="Set up automatic sending" kind="secondary" onPress={onSchedule} /></>}>
    <PrototypeBanner /><Badge status={attempt.state} />
    {attempt.state === 'Sent' ? <Txt>Simulated: sent from this phone to {attempt.email} on {dayLabel(attempt.at)}, {timeLabel(attempt.at)}. We can’t confirm that it has been received. No email actually left this phone.</Txt>
      : attempt.state === 'Cancelled' ? <Txt>The simulated queued send was cancelled. The records were not deleted.</Txt>
        : <><Txt>A real send would wait until this phone is online. In this prototype, nothing dispatches automatically.</Txt>
          <Btn label="Cancel sending" kind="secondary" onPress={() => { void change(s => ({ ...s, attempts: s.attempts.map(a => a.id === attempt.id ? { ...a, state: 'Cancelled' } : a) })); }} /></>}
    <Txt>{attempt.recordIds.length} records · {attempt.from} to {attempt.to}</Txt><Txt>Recipient: {attempt.email}</Txt>
  </Shell>;
}
export function ScheduleScreen({ onBack }: { onBack: () => void }) {
  const { data, change } = usePrototype();
  const [draft, setDraft] = useState<Schedule>(data!.schedule), [notice, setNotice] = useState('');
  const patch = (p: Partial<Schedule>) => setDraft(s => ({ ...s, ...p }));
  if (!data) return null;
  const days = draft.frequency === 'Every 2 weeks' ? 14 : draft.frequency === 'Every 4 weeks' ? 28 : draft.frequency === 'Every month' ? 30 : Number(draft.weeks) * 7;
  const monthLater = new Date(); monthLater.setMonth(monthLater.getMonth() + 1);
  const nextDate = draft.frequency === 'Every month' ? dayKey(monthLater) : dayKey(Date.now() + days * 86400000);
  return <Shell title="Automatic sending" back={onBack} offline={data.settings.offline} footer={<>
    <Btn label="Save schedule" disabled={draft.enabled && (!validEmail(draft.email) || (draft.frequency === 'Every N weeks' && !(Number(draft.weeks) >= 1 && Number(draft.weeks) <= 8)))}
      onPress={async () => {
        if (await change(s => ({ ...s, schedule: { ...draft, firstDate: nextDate } }))) setNotice(draft.enabled ? `Automatic sending is on: ${draft.frequency === 'Every N weeks' ? `every ${draft.weeks} weeks` : draft.frequency.toLowerCase()}. Prototype schedule saved only.` : 'Automatic sending is off.');
      }} />
    <Btn label="Cancel" kind="quiet" onPress={onBack} />
  </>}>
    <PrototypeBanner />
    <Choices label="Send automatically" options={['Off', 'On']} value={draft.enabled ? 'On' : 'Off'} onChange={v => patch({ enabled: v === 'On' })} />
    {draft.enabled ? <>
      <Choices label="Frequency" options={['Every 2 weeks', 'Every 4 weeks', 'Every month', 'Every N weeks']} value={draft.frequency} onChange={frequency => patch({ frequency })} />
      {draft.frequency === 'Every N weeks' ? <Select label="Number of weeks" value={draft.weeks} options={Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} onChange={weeks => patch({ weeks })} allowEmpty={false} /> : null}
      <Select label="Send to" value={draft.email} options={data.recipients.map(email => ({ value: email, label: email }))} onChange={email => patch({ email })} />
      <Txt>First send: {dayLabel(`${nextDate}T12:00:00+03:00`)}</Txt>
      <Txt>Includes records saved since the last send. Real schedules would wait until the phone is online.</Txt>
    </> : null}
    <Notice>No background task, notification, email or upload is created. Saving a schedule never sends data.</Notice>
    {notice ? <Notice>{notice}</Notice> : null}
  </Shell>;
}
export function SettingsScreen({ onTab, onOpen }: { onTab: (tab: string) => void; onOpen: (name: string) => void }) {
  const { data } = usePrototype();
  return <Shell title="Settings" tab="Settings" onTab={onTab} offline={data?.settings.offline}>
    <Heading>MOAI BMU</Heading><Txt muted>Local-only scenario prototype</Txt>
    {['Collector and site', 'Boats', 'Fishers', 'Recipients', 'Automatic sending', 'Send history', 'About this prototype'].map(name =>
      <Btn key={name} label={name} icon="chevron-right" kind="secondary" onPress={() => onOpen(name)} />)}
  </Shell>;
}
export function SettingsPage({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, change } = usePrototype();
  const [selected, setSelected] = useState(''), [newName, setNewName] = useState(''), [newEmail, setNewEmail] = useState('');
  const [confirm, setConfirm] = useState(''), [message, setMessage] = useState('');
  if (!data) return null;
  const boat = data.boats.find(b => b.id === selected), fisher = data.fishers.find(f => f.id === selected);
  const patchBoat = (patch: Partial<Boat>) => { void change(s => ({ ...s, boats: s.boats.map(b => b.id === selected ? { ...b, ...patch } : b) })); };
  return <Shell title={name} back={onBack} offline={data.settings.offline}>
    {name === 'Collector and site' ? <>
      {(['collector', 'county', 'site'] as const).map(key => <Field key={key} label={key === 'collector' ? 'Collector name' : key === 'site' ? 'Landing site' : 'County'} value={data.settings[key]} onChange={v => { void change(s => ({ ...s, settings: { ...s.settings, [key]: v } })); }} />)}
      <Txt>Changes are saved on this phone immediately.</Txt>
    </> : null}
    {name === 'Boats' ? <>
      <Select label="Boat to update" value={selected} options={data.boats.map(b => ({ value: b.id, label: b.name }))} onChange={setSelected} />
      {boat ? <>
        <Field label="Boat name" value={boat.name} onChange={name => patchBoat({ name })} />
        <Select label="Vessel type" value={boat.vesselType} options={VESSELS.map(v => ({ value: v, label: v }))} onChange={vesselType => patchBoat({ vesselType })} />
        <Select label="Propulsion" value={boat.propulsion} options={PROPULSIONS.map(v => ({ value: v, label: v }))} onChange={propulsion => patchBoat({ propulsion, horsepower: propulsion.includes('engine') ? boat.horsepower : '' })} />
        {boat.propulsion.includes('engine') ? <Field label="Horsepower" numeric value={boat.horsepower} onChange={horsepower => patchBoat({ horsepower })} /> : null}
        <Field label="Length (m)" numeric value={boat.length} onChange={length => patchBoat({ length })} />
        <Field label="Usual crew count" numeric value={boat.crew} onChange={crew => patchBoat({ crew })} />
        <Field label="Registration or origin" value={boat.registration} onChange={registration => patchBoat({ registration })} />
        <Notice>Registry changes affect future prefills. Existing record snapshots are not changed.</Notice>
      </> : null}
      <Heading>Add boat</Heading><Field label="New boat name" value={newName} onChange={setNewName} />
      <Btn label="Create boat" disabled={!newName.trim()} onPress={async () => {
        const b: Boat = { id: id('boat'), name: newName.trim(), vesselType: '', propulsion: '', horsepower: '', length: '', registration: '', crew: '' };
        if (await change(s => ({ ...s, boats: [...s.boats, b] }))) { setSelected(b.id); setNewName(''); }
      }} />
    </> : null}
    {name === 'Fishers' ? <>
      <Select label="Fisher to update" value={selected} options={data.fishers.map(f => ({ value: f.id, label: f.name }))} onChange={setSelected} />
      {fisher ? <><Field label="Fisher name" value={fisher.name} onChange={name => { void change(s => ({ ...s, fishers: s.fishers.map(f => f.id === selected ? { ...f, name } : f) })); }} />
        <Choices label="Linked boats" multiple value={fisher.boatIds.map(id => data.boats.find(b => b.id === id)?.name ?? '')} options={data.boats.map(b => b.name)} onChange={name => {
          const boatId = data.boats.find(b => b.name === name)!.id;
          void change(s => ({ ...s, fishers: s.fishers.map(f => f.id === selected ? { ...f, boatIds: f.boatIds.includes(boatId) ? f.boatIds.filter(b => b !== boatId) : [...f.boatIds, boatId] } : f) }));
        }} />
      </> : null}
      <Heading>Add fisher</Heading><Field label="New fisher name" value={newName} onChange={setNewName} />
      <Btn label="Create fisher" disabled={!newName.trim()} onPress={async () => {
        const f = { id: id('fisher'), name: newName.trim(), boatIds: [] };
        if (await change(s => ({ ...s, fishers: [...s.fishers, f] }))) { setSelected(f.id); setNewName(''); }
      }} />
    </> : null}
    {name === 'Recipients' ? <>
      {data.recipients.map(email => <Card key={email}><Txt>{email}</Txt>
        <Btn label={`Edit ${email}`} kind="secondary" onPress={() => { setSelected(email); setNewEmail(email); }} />
        <Btn label={`Remove ${email}`} kind="quiet" onPress={() => { setSelected(email); setConfirm('recipient'); }} />
      </Card>)}
      <Heading>{selected && data.recipients.includes(selected) ? 'Edit email' : 'Add new email'}</Heading>
      <Field label="Email address" keyboardType="email-address" value={newEmail} onChange={setNewEmail} />
      {newEmail && !validEmail(newEmail) ? <Notice warning>Enter an email like name@example.com</Notice> : null}
      <Btn label="Save recipient" disabled={!validEmail(newEmail)} onPress={async () => {
        const email = newEmail.trim();
        if (await change(s => ({ ...s, recipients: [...new Set([...s.recipients.filter(e => e !== selected), email])],
          schedule: s.schedule.email === selected ? { ...s.schedule, email } : s.schedule }))) { setSelected(''); setNewEmail(''); setMessage('Recipient saved on this phone.'); }
      }} />
    </> : null}
    {name === 'Send history' ? <>
      <PrototypeBanner />
      {!data.attempts.length ? <Txt>No simulated sends yet.</Txt> : data.attempts.map(a => <Card key={a.id}>
        <Badge status={a.state} /><Txt bold>Simulated send · {dayLabel(a.at)}, {timeLabel(a.at)}</Txt><Txt>{a.email}</Txt>
        <Txt>{a.recordIds.length} records · {a.from} to {a.to}</Txt><Txt>{a.message || 'No message'}</Txt>
        {a.state === 'Waiting to send' ? <>
          <Btn label="Cancel sending" kind="secondary" onPress={() => { void change(s => ({ ...s, attempts: s.attempts.map(old => old.id === a.id ? { ...old, state: 'Cancelled' } : old) })); }} />
          <Btn label="Simulate waiting send now" disabled={data.settings.offline} kind="secondary" onPress={() => {
            void change(s => {
              // Recheck review eligibility before a queued simulation; edits/deletions cannot leak into sends.
              const eligible = s.records.filter(r => a.recordIds.includes(r.id) && !r.deleted && ['Saved', 'Approved'].includes(r.status) && canSave(r));
              if (!eligible.length) { setMessage('No queued records are still eligible. Cancel this attempt.'); return s; }
              const at = new Date().toISOString();
              return { ...s, attempts: s.attempts.map(old => old.id === a.id ? { ...old, state: 'Sent', recordIds: eligible.map(r => r.id), at } : old),
                records: s.records.map(r => eligible.some(e => e.id === r.id) ? { ...r, sentAt: at } : r) };
            });
          }} />
        </> : null}
      </Card>)}
      <Txt>History is simulated. No automatic dispatch happens when connectivity changes.</Txt>
    </> : null}
    {name === 'About this prototype' ? <>
      <Heading>Synthetic, local and offline-first</Heading>
      <Txt>Add, Edit, and Send scenarios only. No live photo model, voice capture, approval flow, analytics, email, upload, server sync or background job is used.</Txt>
      <Choices label="Simulated connection" value={data.settings.offline ? 'Offline' : 'Online'} options={['Offline', 'Online']} onChange={v => { void change(s => ({ ...s, settings: { ...s.settings, offline: v === 'Offline' } })); }} />
      <Choices label="Next prepared photo" value={data.settings.nextPhoto} options={['A', 'B', 'C', 'Error']} onChange={v => { void change(s => ({ ...s, settings: { ...s.settings, nextPhoto: v as typeof s.settings.nextPhoto } })); }} />
      <Txt>A: eight species, two uncertain. B: same results after 30 seconds. C: no fish. Error: failed reading.</Txt>
      <Btn label={data.settings.failSaves ? 'Disable simulated save failure' : 'Simulate local-save failure'} kind="secondary" onPress={() => { void change(s => ({ ...s, settings: { ...s.settings, failSaves: !s.settings.failSaves } })); }} />
      <Notice>Sample records include Saved, Approved, Sent, Draft, Needs review and missing measurements. Only a boat is required. No Approve action is provided.</Notice>
      <Btn label="Use empty sample records" kind="danger" onPress={() => setConfirm('empty')} />
      <Btn label="Reset sample data" kind="danger" onPress={() => setConfirm('reset')} />
      <Txt>Reset affects only this prototype’s new storage. Legacy demo records and backend work stay untouched.</Txt>
      {data.records.some(r => r.deleted) ? <><Heading>Deleted record history</Heading>
        {data.records.filter(r => r.deleted).map(r => <Card key={r.id}><Txt bold>{r.boatName || 'Unfinished draft'} · Deleted</Txt>
          {r.history.map((h, i) => <Txt key={i} small>{timeLabel(h.at)} · {h.field}: {h.was} → {h.now} · {h.reason}</Txt>)}
        </Card>)}
      </> : null}
    </> : null}
    {message ? <Notice>{message}</Notice> : null}
    {confirm ? <Overlay title={confirm === 'recipient' ? 'Remove recipient?' : confirm === 'empty' ? 'Clear prototype records?' : 'Reset sample data?'} onClose={() => setConfirm('')}>
      <Txt>{confirm === 'recipient' ? 'Remove this saved recipient? Existing simulated send history stays.' : 'This replaces synthetic prototype data on this phone only. The older demo storage is not touched.'}</Txt>
      <Btn label="Confirm" kind="danger" onPress={async () => {
        const ok = await change(s => confirm === 'recipient' ? { ...s, recipients: s.recipients.filter(e => e !== selected), schedule: s.schedule.email === selected ? { ...s.schedule, enabled: false, email: '' } : s.schedule }
          : confirm === 'empty' ? { ...s, records: [], attempts: [], edit: undefined, undo: undefined, banner: undefined } : makeFixtures());
        if (ok) { setConfirm(''); setSelected(''); setMessage(confirm === 'recipient' ? 'Recipient removed.' : 'Prototype sample data updated. Legacy data was not changed.'); }
      }} /><Btn label="Cancel" kind="secondary" onPress={() => setConfirm('')} />
    </Overlay> : null}
  </Shell>;
}
