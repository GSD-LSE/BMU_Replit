import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePrototype } from '@/lib/prototype/store';
import { PROPULSIONS, VESSELS, canSend, dayKey, dayLabel, id, makeFixtures, recordCount, resolveSendAttempt, timeLabel, validEmail, type Boat, type Fisher, type Schedule } from '@/lib/prototype/model';
import { ActionBar, Btn, C, Choices, Field, Heading, Notice, Overlay, Select, Shell, Txt, s } from './ui';

function Row({ title, value, open = false, expandable = false, onPress, onLongPress }: { title: string; value?: string; open?: boolean; expandable?: boolean; onPress: () => void; onLongPress?: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} style={s.settingRow}>
    <Text style={s.settingRowTitle}>{title}</Text>
    {value ? <Text numberOfLines={1} style={s.settingRowValue}>{value}</Text> : null}
    <View style={expandable ? { transform: [{ rotate: open ? '180deg' : '0deg' }] } : undefined}>
      <Feather name={expandable ? 'chevron-down' : 'chevron-right'} size={20} color={C.foreground} />
    </View>
  </Pressable>;
}
function Group({ children }: { children: React.ReactNode }) { return <Text style={s.settingGroup}>{children}</Text>; }

export function SettingsScreen({ onTab, onOpen }: { onTab: (tab: string) => void; onOpen: (name: string) => void }) {
  const { data, change, saved, error } = usePrototype();
  const [expanded, setExpanded] = useState(''), [facilitator, setFacilitator] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null), [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState('');
  if (!data) return null;
  const toggle = (key: string) => {
    setExpanded(expanded === key ? '' : key);
    if (key === 'Automatic sending' && expanded !== key) setSchedule({ ...data.schedule });
  };
  const saveSchedule = async () => {
    if (!schedule) return;
    const ok = await change(state => ({ ...state, schedule: { ...schedule, firstDate: dayKey(Date.now() + Number(schedule.weeks) * 7 * 86400000) } }));
    if (ok) setMessage('Schedule saved');
  };
  const simulateWaiting = async () => {
    const attempt = data.attempts.find(a => a.state === 'Waiting to send');
    if (!attempt || data.settings.offline) return;
    const eligible = data.records.filter(r => attempt.recordIds.includes(r.id) && !r.deleted && r.status === 'Waiting to send' && canSend(r));
    const at = new Date().toISOString();
    await change(state => ({ ...state,
      attempts: state.attempts.map(a => a.id === attempt.id ? { ...a, state: 'Sent', at, automatic: true, recordIds: eligible.map(r => r.id) } : a),
      records: state.records.map(r => eligible.some(item => item.id === r.id) ? { ...r, status: 'Sent', sentAt: at, lastSentAt: at, sentTo: attempt.email } : r),
    }));
    setMessage(`Sent automatically ${dayLabel(at)}: ${recordCount(eligible.length)}.`);
  };
  const reset = async () => {
    const fresh = makeFixtures();
    await change(() => fresh);
    setConfirm('');
    setMessage('Sample data reset.');
  };
  const clearRecords = async () => {
    await change(state => ({ ...state, records: [], attempts: [], edit: undefined, undo: undefined, banner: undefined }));
    setConfirm('');
    setMessage('Sample records cleared.');
  };
  return <Shell title={data.settings.site || 'Msambweni Landing Site'} subtitle="Settings" tab="Settings" onTab={onTab} offline={data.settings.offline}
    offlineCompact saved={expanded === 'Profile' ? error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…' : undefined}>
    <Group>Profile</Group>
    <Row title="Collector and site" expandable open={expanded === 'Profile'} onPress={() => toggle('Profile')} />
    {expanded === 'Profile' ? <View style={s.settingInline}>
      <Field label="Collector name" value={data.settings.collector} onChange={collector => { void change(state => ({ ...state, settings: { ...state.settings, collector } })); }} />
      <Field label="County" value={data.settings.county} onChange={county => { void change(state => ({ ...state, settings: { ...state.settings, county } })); }} />
      <Field label="Landing site" value={data.settings.site} onChange={site => { void change(state => ({ ...state, settings: { ...state.settings, site } })); }} />
      <Txt small muted>Changes save on this phone as you type.</Txt>
    </View> : null}
    <Group>Data lists</Group>
    <Row title="Boats" value={`${data.boats.filter(item => !item.archived).length}`} onPress={() => onOpen('Boats')} />
    <Row title="Fishers" value={`${data.fishers.filter(item => !item.archived).length}`} onPress={() => onOpen('Fishers')} />
    <Group>Sending</Group>
    <Row title="Recipients" value={`${data.recipients.length}`} onPress={() => onOpen('Recipients')} />
    <Row title="Automatic sending" expandable value={data.schedule.enabled ? `Every ${data.schedule.weeks} weeks` : 'Off'} open={expanded === 'Automatic sending'} onPress={() => toggle('Automatic sending')} />
    {expanded === 'Automatic sending' && schedule ? <View style={s.settingInline}>
      <Choices label="Automatic sending" options={['Off', 'On']} value={schedule.enabled ? 'On' : 'Off'} onChange={value => setSchedule(current => current ? { ...current, enabled: value === 'On' } : current)} />
      {schedule.enabled ? <>
        <Text style={s.label}>Frequency</Text>
        <View style={s.choiceWrap}>{['2', '3', '4', '6', '8'].map(weeks => <Pressable key={weeks} onPress={() => setSchedule(current => current ? { ...current, weeks, frequency: `Every ${weeks} weeks` } : current)}
          style={[s.quickChip, schedule.weeks === weeks && s.quickChipSelected]}>{schedule.weeks === weeks ? <Feather name="check" size={16} color={C.primary} /> : null}<Text style={s.chipLabel}>{weeks} weeks</Text></Pressable>)}</View>
        <Select label="Send to" emptyLabel="Choose a recipient" allowEmpty={false} value={schedule.email} options={data.recipients.map(email => ({ value: email, label: email }))} onChange={email => setSchedule(current => current ? { ...current, email } : current)} />
      </> : null}
      <ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={() => { setExpanded(''); setSchedule(null); }} />}
        primary={<Btn label="Save schedule" disabled={schedule.enabled && !validEmail(schedule.email)}
          disabledReason={schedule.enabled && !validEmail(schedule.email) ? 'Choose a valid recipient.' : undefined}
          onPress={() => { void saveSchedule(); }} />} />
      {message ? <Txt>{message}</Txt> : null}
    </View> : null}
    <Row title="Send history" onPress={() => onOpen('Send history')} />
    <Group>About</Group>
    <Row title="About this app" value="Practice" onPress={() => onOpen('About this app')} />
    <Row title="Facilitator controls" expandable open={facilitator} onPress={() => setFacilitator(value => !value)} />
    {facilitator ? <View style={s.settingInline}>
      <Choices label="Connection" value={data.settings.offline ? 'Offline' : 'Online'} options={['Offline', 'Online']} onChange={value => { void change(state => ({ ...state, settings: { ...state.settings, offline: value === 'Offline' } })); }} />
      <Choices label="Next photo scenario" value={data.settings.nextPhoto} options={['A', 'B', 'C', 'Error']} onChange={value => { void change(state => ({ ...state, settings: { ...state.settings, nextPhoto: value as typeof state.settings.nextPhoto } })); }} />
      <Btn label={data.settings.failSaves ? 'Disable simulated save failure' : 'Simulate local-save failure'} kind="secondary" onPress={() => { void change(state => ({ ...state, settings: { ...state.settings, failSaves: !state.settings.failSaves } })); }} />
      <Btn label={data.settings.nextSendFails ? 'Clear next send failure' : 'Next send fails'} kind="secondary" onPress={() => { void change(state => ({ ...state, settings: { ...state.settings, nextSendFails: !state.settings.nextSendFails } })); }} />
      <Btn label="Simulate waiting send now" kind="secondary" disabled={data.settings.offline || !data.attempts.some(a => a.state === 'Waiting to send')}
        disabledReason={data.settings.offline ? 'Set the connection to Online first.' : undefined} onPress={() => { void simulateWaiting(); }} />
      <Btn label="Use empty sample records" kind="secondary" onPress={() => setConfirm('empty')} />
      <Btn label="Reset sample data" kind="danger" onPress={() => setConfirm('reset')} />
    </View> : null}
    <Txt small muted>Practice</Txt>
    {message ? <Notice>{message}</Notice> : null}
    {confirm ? <Overlay title={confirm === 'empty' ? 'Use empty sample records?' : 'Reset sample data?'} variant="dialog" onClose={() => setConfirm('')}>
      <Txt>{confirm === 'empty' ? 'This removes the sample catch records from this prototype.' : 'This restores the local practice records, lists and send history.'}</Txt>
      <ActionBar variant="stacked" primary={<Btn label={confirm === 'empty' ? 'Use empty sample records' : 'Reset sample data'} kind="danger" closeOnPress onPress={confirm === 'empty' ? clearRecords : reset} />}
        secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />} />
    </Overlay> : null}
  </Shell>;
}

export function SettingsPage({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, change, saved, error } = usePrototype();
  const [selected, setSelected] = useState(''), [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [boatDraft, setBoatDraft] = useState<Boat | null>(null), [fisherDraft, setFisherDraft] = useState<Fisher | null>(null);
  const [recipient, setRecipient] = useState(''), [recipientOriginal, setRecipientOriginal] = useState(''), [confirm, setConfirm] = useState('');
  const [recipientEditing, setRecipientEditing] = useState(false);
  const [recipientMenu, setRecipientMenu] = useState(false);
  const [message, setMessage] = useState('');
  if (!data) return null;
  const visibleBoats = data.boats.filter(item => !!item.archived === showArchived && item.name.toLowerCase().includes(search.toLowerCase()));
  const visibleFishers = data.fishers.filter(item => !!item.archived === showArchived && item.name.toLowerCase().includes(search.toLowerCase()));
  const back = () => { if (boatDraft || fisherDraft || recipientEditing) { setBoatDraft(null); setFisherDraft(null); setRecipient(''); setRecipientEditing(false); setConfirm(''); setSelected(''); } else onBack(); };
  const saveBoat = async () => {
    if (!boatDraft?.name.trim()) return false;
    const exists = data.boats.some(item => item.id === boatDraft.id);
    const ok = await change(state => ({ ...state, boats: exists ? state.boats.map(item => item.id === boatDraft.id ? boatDraft : item) : [...state.boats, boatDraft] }));
    if (ok) { setBoatDraft(null); setSelected(''); setMessage('Boat saved.'); }
    return ok;
  };
  const saveFisher = async () => {
    if (!fisherDraft?.name.trim()) return false;
    const exists = data.fishers.some(item => item.id === fisherDraft.id);
    const ok = await change(state => ({ ...state, fishers: exists ? state.fishers.map(item => item.id === fisherDraft.id ? fisherDraft : item) : [...state.fishers, fisherDraft] }));
    if (ok) { setFisherDraft(null); setSelected(''); setMessage('Fisher saved.'); }
    return ok;
  };
  const restoreBoat = async () => {
    if (!boatDraft) return;
    if (!boatDraft.archived) { setConfirm('boat'); return; }
    const ok = await change(state => ({ ...state, boats: state.boats.map(item => item.id === boatDraft.id ? { ...item, archived: false } : item) }));
    if (ok) { setBoatDraft(null); setSelected(''); setMessage('Boat restored.'); }
  };
  const restoreFisher = async () => {
    if (!fisherDraft) return;
    if (!fisherDraft.archived) { setConfirm('fisher'); return; }
    const ok = await change(state => ({ ...state, fishers: state.fishers.map(item => item.id === fisherDraft.id ? { ...item, archived: false } : item) }));
    if (ok) { setFisherDraft(null); setSelected(''); setMessage('Fisher restored.'); }
  };
  const saveRecipient = async () => {
    if (!validEmail(recipient)) return false;
    const next = recipient.trim();
    const ok = await change(state => ({ ...state, recipients: [...new Set(state.recipients.filter(email => email !== recipientOriginal).concat(next))],
      schedule: state.schedule.email === recipientOriginal ? { ...state.schedule, email: next } : state.schedule }));
    if (ok) { setRecipient(''); setRecipientOriginal(''); setRecipientEditing(false); setMessage('Recipient saved.'); }
    return ok;
  };
  const saveFooter = boatDraft ? <ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={back} />} primary={<Btn label="Save" disabled={!boatDraft.name.trim()} onPress={() => { void saveBoat(); }} />} />
    : fisherDraft ? <ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={back} />} primary={<Btn label="Save" disabled={!fisherDraft.name.trim()} onPress={() => { void saveFisher(); }} />}
      />
      : recipientEditing ? <ActionBar secondary={<Btn label="Cancel" kind="secondary" onPress={back} />} primary={<Btn label="Save" disabled={!validEmail(recipient)} disabledReason={!validEmail(recipient) ? 'Enter a valid email address.' : undefined} onPress={() => { void saveRecipient(); }} />} /> : undefined;
  return <Shell title={boatDraft ? boatDraft.id.startsWith('new-') ? 'Add boat' : boatDraft.name : fisherDraft ? fisherDraft.id.startsWith('new-') ? 'Add fisher' : fisherDraft.name
    : recipientEditing ? recipientOriginal ? 'Edit recipient' : 'Add recipient' : name} back={back} footer={saveFooter} saved={error ? 'Not saved' : saved ? 'Saved on this phone' : undefined}>
    {name === 'About this app' ? <><Heading>MOAI BMU</Heading><Txt>Version 1.0 · Practice build</Txt>
      <Txt>© 2025 MOAI BMU</Txt><Txt>Practice data stays on this phone. This build does not send email, fish data, or photos.</Txt></> : null}
    {boatDraft ? <>
      <Field label="Boat name" value={boatDraft.name} onChange={value => setBoatDraft({ ...boatDraft, name: value })} />
      <Select label="Vessel type" value={boatDraft.vesselType} options={VESSELS.map(value => ({ value, label: value }))} onChange={vesselType => setBoatDraft({ ...boatDraft, vesselType })} />
      <Select label="Propulsion" value={boatDraft.propulsion} options={PROPULSIONS.map(value => ({ value, label: value }))} onChange={propulsion => setBoatDraft({ ...boatDraft, propulsion })} />
      {boatDraft.propulsion.includes('engine') ? <Field label="Horsepower" numeric value={boatDraft.horsepower} onChange={horsepower => setBoatDraft({ ...boatDraft, horsepower })} /> : null}
      <Field label="Length (m)" numeric value={boatDraft.length} onChange={length => setBoatDraft({ ...boatDraft, length })} />
      <Field label="Usual crew count" numeric value={boatDraft.crew} onChange={crew => setBoatDraft({ ...boatDraft, crew })} />
      <Field label="Registration or origin" value={boatDraft.registration} onChange={registration => setBoatDraft({ ...boatDraft, registration })} />
       {!boatDraft.id.startsWith('new-') ? <Btn label={boatDraft.archived ? 'Restore boat' : 'Archive boat'} kind={boatDraft.archived ? 'secondary' : 'danger'}
         onPress={() => { void restoreBoat(); }} /> : null}
       {confirm === 'boat' ? <Overlay title="Archive boat?" variant="dialog" onClose={() => setConfirm('')}>
         <ActionBar variant="stacked" primary={<Btn label="Archive boat" kind="danger" closeOnPress onPress={async () => {
           const ok = await change(state => ({ ...state, boats: state.boats.map(item => item.id === boatDraft.id ? { ...item, archived: true } : item) }));
           if (!ok) return false;
          setBoatDraft(null); setConfirm(''); return true;
        }} />} secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />} />
      </Overlay> : null}
    </> : null}
    {fisherDraft ? <>
      <Field label="Fisher name" value={fisherDraft.name} onChange={value => setFisherDraft({ ...fisherDraft, name: value })} />
      <Text style={s.label}>Linked boats</Text><View style={s.choiceWrap}>{data.boats.map(item => {
        const checked = fisherDraft.boatIds.includes(item.id);
        return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setFisherDraft(current => current
          ? { ...current, boatIds: checked ? current.boatIds.filter(idValue => idValue !== item.id) : [...current.boatIds, item.id] } : current)}
          style={[s.quickChip, checked && s.quickChipSelected]}><Text style={s.chipLabel}>{item.name}</Text>{checked ? <Feather name="check" size={16} color={C.primary} /> : null}</Pressable>;
      })}</View>
       {!fisherDraft.id.startsWith('new-') ? <Btn label={fisherDraft.archived ? 'Restore fisher' : 'Archive fisher'} kind={fisherDraft.archived ? 'secondary' : 'danger'}
         onPress={() => { void restoreFisher(); }} /> : null}
       {confirm === 'fisher' ? <Overlay title="Archive fisher?" variant="dialog" onClose={() => setConfirm('')}>
         <ActionBar variant="stacked" primary={<Btn label="Archive fisher" kind="danger" closeOnPress onPress={async () => {
           const ok = await change(state => ({ ...state, fishers: state.fishers.map(item => item.id === fisherDraft.id ? { ...item, archived: true } : item) }));
           if (!ok) return false;
          setFisherDraft(null); setConfirm(''); return true;
        }} />} secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />} />
      </Overlay> : null}
    </> : null}
    {recipientEditing ? <>
      <Field label="Email address" keyboardType="email-address" value={recipient} onChange={setRecipient} />
      {recipient && !validEmail(recipient) ? <Notice warning>Enter a valid email address.</Notice> : null}
    </> : null}
    {name === 'Boats' && !boatDraft ? <>
      {data.boats.filter(item => !item.archived).length > 10 ? <Field label="Search boats" value={search} onChange={setSearch} /> : null}
      {visibleBoats.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setSelected(item.id); setBoatDraft({ ...item }); }} style={s.settingRow}>
        <View style={{ flex: 1 }}><Text style={s.settingRowTitle}>{item.name}</Text><Text style={s.settingRowValueLeft}>{item.vesselType}{item.length ? ` · ${item.length} m` : ''} · Usual crew {item.crew || 'not recorded'}</Text></View><Feather name="chevron-right" size={20} color={C.foreground} /></Pressable>)}
      {!visibleBoats.length ? <Txt>No boats match{search ? ` "${search}"` : showArchived ? ' this archived view' : ' this list'}.</Txt> : null}
      {data.boats.some(item => item.archived) ? <Btn label={showArchived ? 'Hide archived boats' : `Archived boats · ${data.boats.filter(item => item.archived).length}`} kind="quiet" onPress={() => setShowArchived(value => !value)} /> : null}
      <Btn label="Add boat" icon="plus" onPress={() => { setBoatDraft({ id: `new-${id('boat')}`, name: '', vesselType: '', propulsion: '', horsepower: '', length: '', registration: '', crew: '' }); }} />
    </> : null}
    {name === 'Fishers' && !fisherDraft ? <>
      {data.fishers.filter(item => !item.archived).length > 10 ? <Field label="Search fishers" value={search} onChange={setSearch} /> : null}
      {visibleFishers.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setSelected(item.id); setFisherDraft({ ...item }); }} style={s.settingRow}>
        <View style={{ flex: 1 }}><Text style={s.settingRowTitle}>{item.name}</Text><Text style={s.settingRowValueLeft}>{item.boatIds.map(boatId => data.boats.find(b => b.id === boatId)?.name).filter(Boolean).join(', ') || 'No linked boats'}</Text></View><Feather name="chevron-right" size={20} color={C.foreground} /></Pressable>)}
      {!visibleFishers.length ? <Txt>No fishers match{search ? ` "${search}"` : showArchived ? ' this archived view' : ' this list'}.</Txt> : null}
      {data.fishers.some(item => item.archived) ? <Btn label={showArchived ? 'Hide archived fishers' : `Archived fishers · ${data.fishers.filter(item => item.archived).length}`} kind="quiet" onPress={() => setShowArchived(value => !value)} /> : null}
      <Btn label="Add fisher" icon="plus" onPress={() => setFisherDraft({ id: `new-${id('fisher')}`, name: '', boatIds: [] })} />
    </> : null}
    {name === 'Recipients' && !recipientEditing ? <>
      {data.recipients.map(email => <View key={email} style={s.recipientRow}><Text numberOfLines={1} style={s.settingRowTitle}>{email}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit recipient" onPress={() => { setRecipient(email); setRecipientOriginal(email); setRecipientEditing(true); }} style={s.iconButton}><Feather name="edit-3" size={19} color={C.primary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Recipient options" onPress={() => { setSelected(email); setRecipientMenu(true); }} style={s.iconButton}><Feather name="more-horizontal" size={20} color={C.foreground} /></Pressable>
      </View>)}
      <Btn label="Add recipient" icon="plus" onPress={() => { setRecipient(''); setRecipientOriginal(''); setRecipientEditing(true); }} />
      {recipientMenu ? <Overlay title="Recipient options" onClose={() => setRecipientMenu(false)}>
        <Btn label="Remove recipient" kind="dangerText" icon="trash-2" closeOnPress onPress={() => { setTimeout(() => setConfirm('recipient'), 210); return true; }} />
      </Overlay> : null}
      {confirm === 'recipient' ? <Overlay title="Remove recipient?" variant="dialog" onClose={() => setConfirm('')}>
        <Txt>Remove {selected}? Existing send history stays on this phone.</Txt>
        <ActionBar variant="stacked" primary={<Btn label="Remove recipient" kind="danger" closeOnPress onPress={async () => {
          await change(state => ({ ...state, recipients: state.recipients.filter(email => email !== selected),
            schedule: state.schedule.email === selected ? { ...state.schedule, enabled: false, email: '' } : state.schedule }));
          setConfirm(''); return true;
        }} />} secondary={<Btn label="Cancel" kind="quiet" closeOnPress onPress={() => {}} />} />
      </Overlay> : null}
    </> : null}
    {name === 'Send history' ? <>
      {!data.attempts.length ? <Txt>No send history yet.</Txt> : data.attempts.map(attempt => <View key={attempt.id} style={s.historyRow}>
        <Txt small muted>{dayLabel(attempt.at)} · {timeLabel(attempt.at)}</Txt><Text style={s.settingRowTitle}>{attempt.automatic ? `Sent automatically ${dayLabel(attempt.at)}: ${recordCount(attempt.recordIds.length)}` : attempt.state === 'Sent' ? 'Sent' : attempt.state}</Text>
        <Txt>{attempt.email} · {recordCount(attempt.recordIds.length)}</Txt>
        <Txt small muted>{dayLabel(attempt.from)} to {dayLabel(attempt.to)}</Txt>
        {['Waiting to send', "Couldn't send"].includes(attempt.state) ? <View style={{ gap: 8 }}>
          {attempt.state === "Couldn't send" ? <Btn label="Try again" kind="secondary" onPress={async () => {
            try { await change(state => resolveSendAttempt(state, attempt.id, 'retry')); } catch (error) { setMessage((error as Error).message); }
          }} /> : null}
          <Btn label="Cancel sending" kind="quiet" onPress={async () => {
            try { await change(state => resolveSendAttempt(state, attempt.id, 'cancel')); } catch (error) { setMessage((error as Error).message); }
          }} />
        </View> : null}
      </View>)}
    </> : null}
    {message ? <Notice>{message}</Notice> : null}
  </Shell>;
}
