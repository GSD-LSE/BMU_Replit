import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { usePrototype } from '@/lib/prototype/store';
import { dateRange, dayKey, dayLabel, shortDayLabel, recordCount, resolveSendAttempt, sendPreview, simulateSend, timeLabel, totals, validEmail, type Attempt, type SendDraft } from '@/lib/prototype/model';
import { ActionBar, Btn, Card, Choices, Field, Heading, Notice, Shell, StatusChip, Txt } from './ui';
import { useMotionPrefs } from './motion';

export const makeSendDraft = (email = ''): SendDraft => ({
  step: 1, period: 'All time', from: '', to: '', email, saveEmail: true, message: '', includeSent: false, noteOpen: false, periodOpen: false,
});

function periodBounds(period: string, records: { date: string; deleted?: boolean }[]): [string, string] {
  if (period === 'Today') return [dayKey(), dayKey()];
  if (period === 'Yesterday') {
    const yesterday = dayKey(Date.now() - 86400000);
    return [yesterday, yesterday];
  }
  if (period === 'All time') return [records.filter(r => !r.deleted).map(r => dayKey(r.date)).sort()[0] ?? dayKey(), dayKey()];
  if (period === 'Last 7 days') return [dayKey(Date.now() - 6 * 86400000), dayKey()];
  if (period === 'Last 14 days') return [dayKey(Date.now() - 13 * 86400000), dayKey()];
  if (period === 'Last 4 weeks') return [dayKey(Date.now() - 27 * 86400000), dayKey()];
  if (period === 'Last month') return dateRange(period);
  return dateRange('Last 2 weeks');
}

export function SendWizard({ onHome, onReview, onSchedule, onHistory }: { onHome: () => void; onReview: () => void; onSchedule: () => void; onHistory?: () => void }) {
  const { data, change, saved, error: localError } = usePrototype();
  const [resultId, setResultId] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [recipientEditing, setRecipientEditing] = useState(!data?.recipients.some(email => email === data.sendDraft?.email));
  const reduceMotion = useMotionPrefs();
  if (!data) return null;
  const draft = data.sendDraft ?? makeSendDraft(data.recipients.at(-1) ?? '');
  const result = data.attempts.find(a => a.id === resultId);
  if (result) return <Animated.View entering={FadeIn.duration(reduceMotion ? 100 : 200)} exiting={FadeOut.duration(100)} style={{ flex: 1 }}>
    <SendResult attempt={result} onHome={onHome} onSchedule={onSchedule} />
  </Animated.View>;
  const [from, to] = periodBounds(draft.period, data.records);
  const preview = sendPreview(data, from, to, !!draft.includeSent);
  const lineTotals = preview.eligible.map(record => totals(record.lines));
  const weightTotal = lineTotals.reduce((sum, value) => sum + (value.weight ?? 0), 0);
  const valueTotal = lineTotals.reduce((sum, value) => sum + (value.value ?? 0), 0);
  const hasWeight = lineTotals.some(value => value.weight !== null);
  const hasValue = lineTotals.some(value => value.value !== null);
  const missingWeights = preview.eligible.filter(record => totals(record.lines).weight === null).length;
  const editedPreviouslySent = preview.eligible.filter(record => !!record.lastSentAt && record.status === 'Saved').length;
  const patch = (next: Partial<SendDraft>) => { void change(state => ({ ...state, sendDraft: { ...draft, ...next } })); };
  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let attemptId = '';
      const normalized = { ...draft, period: 'Custom range', from, to };
      const ok = await change(state => {
        const outcome = simulateSend(state, state.sendDraft ? { ...state.sendDraft, period: 'Custom range', from, to } : normalized);
        attemptId = outcome.attempt.id;
        return { ...outcome.state, sendDraft: undefined };
      });
      if (ok) setResultId(attemptId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const emailOptions = data.recipients.map(email => ({ value: email, label: email }));
  return <Shell title="Send data" saved={localError ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
    offline={data.settings.offline} offlineCompact back={onHome} footer={<View style={{ gap: 8 }}>
      {data.settings.offline ? <Notice warning>No connection. Records stay on this phone and send when it is online.</Notice> : null}
      <Btn label={`Send ${recordCount(preview.eligible.length).replace('No records', '0 records')}`} disabled={busy || !preview.eligible.length || !validEmail(draft.email)}
        disabledReason={!preview.eligible.length ? 'Nothing is ready to send in this period.' : !validEmail(draft.email) ? 'Choose a recipient to continue.' : undefined}
        onPress={() => { void send(); }} />
    </View>}>
    <Card>
      <Heading>What</Heading>
      <Txt>{recordCount(preview.eligible.length)} not sent yet · {preview.excluded.length} not included (need review or already sent)</Txt>
      <Btn label="Check records" kind="secondary" onPress={onReview} />
      <Btn label={`Change period · ${draft.period}`} kind="quiet" icon={draft.periodOpen ? 'chevron-up' : 'chevron-down'} onPress={() => patch({ periodOpen: !draft.periodOpen })} />
      {draft.periodOpen ? <Choices label="Period" value={draft.period} options={['Today', 'Yesterday', 'Last 7 days', 'Last 14 days', 'Last 4 weeks', 'Last month', 'All time']} onChange={period => patch({ period })} /> : null}
      {editedPreviouslySent ? <Txt small muted>{editedPreviouslySent} of these were edited after an earlier send</Txt> : null}
    </Card>
    <Card>
      <Heading>To</Heading>
      {!recipientEditing && draft.email ? <View style={{ gap: 8 }}>
        <Txt>{draft.email}</Txt><Btn label="Change" kind="quiet" icon="chevron-down" onPress={() => setRecipientEditing(true)} />
      </View> : <>
        {emailOptions.length ? <Choices label="Recipient" rows value={draft.email} options={data.recipients} onChange={email => { patch({ email }); setRecipientEditing(false); }} /> : null}
        {emailOptions.length ? <Btn label="Add new email" kind="quiet" onPress={() => patch({ email: '' })} /> : null}
        <Field label="Email address" keyboardType="email-address" placeholder="name@example.com" value={draft.email} onChange={email => patch({ email })} />
        {draft.email && !validEmail(draft.email) ? <Notice warning>Enter a valid email address.</Notice> : null}
        {draft.email && !data.recipients.includes(draft.email) && validEmail(draft.email)
          ? <Choices label="Recipient preference" multiple options={['Save this email for next time']} value={draft.saveEmail ? ['Save this email for next time'] : []} onChange={() => patch({ saveEmail: !draft.saveEmail })} /> : null}
      </>}
    </Card>
    <Btn label={draft.message || draft.noteOpen ? 'Hide note' : 'Add a note'} kind="quiet" icon={draft.message || draft.noteOpen ? 'chevron-up' : 'chevron-down'} onPress={() => patch({ noteOpen: !draft.noteOpen })} />
    {draft.noteOpen ? <Field label="Note" value={draft.message} onChange={message => patch({ message })} multiline placeholder="Optional note" /> : null}
    <Card>
      <Heading>Summary</Heading>
      <Txt bold>{recordCount(preview.eligible.length)}{hasWeight ? ` · ${weightTotal.toLocaleString('en-KE', { maximumFractionDigits: 2 })} kg` : ''}{hasValue ? ` · Ksh ${valueTotal.toLocaleString('en-KE', { maximumFractionDigits: 2 })}` : ''}</Txt>
      {missingWeights ? <Txt small muted>{missingWeights} {missingWeights === 1 ? 'has' : 'have'} no weight entered (sent blank, not 0)</Txt> : null}
    </Card>
    <Choices label="Include records already sent" options={['Off', 'On']} value={draft.includeSent ? 'On' : 'Off'} onChange={value => patch({ includeSent: value === 'On' })} />
    <Notice>This is a practice send.</Notice>
    <View style={{ gap: 4 }}>
      <Btn label="Send history" kind="quiet" onPress={onHistory ?? onSchedule} />
      <Btn label={`Automatic sending: ${data.schedule.enabled ? `Every ${data.schedule.weeks} weeks` : 'Off. Set up'}`} kind="quiet" onPress={onSchedule} />
    </View>
    {error ? <Notice warning>{error}</Notice> : null}
  </Shell>;
}

export function SendResult({ attempt, onHome, onSchedule }: { attempt: Attempt; onHome: () => void; onSchedule: () => void }) {
  const { data, change } = usePrototype();
  const [error, setError] = useState('');
  const waiting = attempt.state === 'Waiting to send', failed = attempt.state === "Couldn't send";
  const resolveBatch = async (retry: boolean) => {
    try { await change(state => resolveSendAttempt(state, attempt.id, retry ? 'retry' : 'cancel')); }
    catch (error) { setError((error as Error).message); }
  };
  return <Shell title={attempt.state === 'Sent' ? 'Sent from this phone' : waiting ? 'Waiting to send' : failed ? "Couldn't send" : 'Cancelled'}
    back={onHome} offline={data?.settings.offline} footer={failed ? <ActionBar
      primary={<Btn label="Try again" disabled={!!data?.settings.offline} disabledReason={data?.settings.offline ? 'Set the connection to Online first.' : undefined} onPress={() => { void resolveBatch(true); }} />}
      secondary={<Btn label="Cancel" kind="secondary" onPress={() => { void resolveBatch(false); }} />} />
      : <ActionBar primary={<Btn label="Done" onPress={onHome} />}
        secondary={waiting ? <Btn label="Cancel sending" kind="secondary" onPress={() => { void resolveBatch(false); }} />
          : <Btn label="Automatic sending" kind="secondary" onPress={onSchedule} />} />}>
    <StatusChip status={attempt.state === 'Sent' ? `Sent ${shortDayLabel(attempt.at)}` : attempt.state} />
    {attempt.state === 'Sent' ? <Txt>{recordCount(attempt.recordIds.length)} to {attempt.email}, {dayLabel(attempt.at)} {timeLabel(attempt.at)}. We can't confirm it has been received.</Txt>
      : waiting ? <Txt>{recordCount(attempt.recordIds.length)} are waiting. They send when this phone is online. You can keep adding records.</Txt>
        : failed ? <Txt>Couldn't send. Check the connection and try again.</Txt> : <Txt>Sending was cancelled. The records are ready to send again.</Txt>}
    <Txt>{dayLabel(attempt.from)} to {dayLabel(attempt.to)} · {attempt.email}</Txt>
    <Notice>This is a practice send.</Notice>
    {error ? <Notice warning>{error}</Notice> : null}
  </Shell>;
}
