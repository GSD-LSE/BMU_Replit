import React, { useState } from 'react';
import { usePrototype } from '@/lib/prototype/store';
import { dayKey, dayLabel, validEmail, type Schedule } from '@/lib/prototype/model';
import { ActionBar, Btn, Choices, Select, Shell, Txt } from './ui';

export function ScheduleScreen({ onBack }: { onBack: () => void }) {
  const { data, change, saved, error } = usePrototype();
  const [draft, setDraft] = useState<Schedule>(data!.schedule), [notice, setNotice] = useState('');
  if (!data) return null;
  const nextDate = dayKey(Date.now() + Number(draft.weeks) * 7 * 86400000);
  const changed = JSON.stringify(draft) !== JSON.stringify(data.schedule);
  return <Shell title="Automatic sending" back={onBack} offline={data.settings.offline}
    saved={error ? 'Not saved' : saved ? 'Saved on this phone' : undefined}
    footer={<ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={onBack} />}
      primary={<Btn label="Save schedule" disabled={!changed || (draft.enabled && (!validEmail(draft.email) || !data.recipients.includes(draft.email)))}
        disabledReason={!changed ? 'Change a value to save.' : draft.enabled && !validEmail(draft.email) ? 'Choose a valid recipient.' : undefined}
        onPress={async () => {
          const ok = await change(state => ({ ...state, schedule: { ...draft, frequency: `Every ${draft.weeks} weeks`, firstDate: nextDate } }));
          if (ok) setNotice('Schedule saved');
        }} />} />}>
    <Choices label="Automatic sending" options={['Off', 'On']} value={draft.enabled ? 'On' : 'Off'} onChange={value => setDraft(current => ({ ...current, enabled: value === 'On' }))} />
    {draft.enabled ? <>
      <Txt bold>Frequency</Txt>
      <Choices label="Repeat every" options={['2 weeks', '3 weeks', '4 weeks', '6 weeks', '8 weeks']}
        value={`${draft.weeks} weeks`} onChange={value => setDraft(current => ({ ...current, weeks: value.split(' ')[0], frequency: `Every ${value}` }))} />
      <Select label="Recipient" emptyLabel="Choose a recipient" allowEmpty={false} value={draft.email}
        options={data.recipients.map(email => ({ value: email, label: email }))} onChange={email => setDraft(current => ({ ...current, email }))} />
      <Txt>Next: {dayLabel(`${nextDate}T12:00:00`)}</Txt>
    </> : null}
    {notice ? <Txt>{notice}</Txt> : null}
  </Shell>;
}
