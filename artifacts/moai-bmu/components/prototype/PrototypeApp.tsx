import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PrototypeProvider, usePrototype } from '@/lib/prototype/store';
import { blankRecord, dateRange, dayLabel, displayStatus, emptyFilters, type CatchRecord } from '@/lib/prototype/model';
import AddWizard from './AddWizard';
import { EditRecord, HistoryScreen, RecordDetail, RecordList, RecordRow } from './Records';
import { ScheduleScreen, SendWizard, SettingsPage, SettingsScreen, initialSend } from './SendSettings';
import { Badge, Btn, C, Card, Heading, Notice, Shell, Txt } from './ui';

export default function PrototypeApp() {
  return <PrototypeProvider><PrototypeScreens /></PrototypeProvider>;
}
function PrototypeScreens() {
  const { data, change, saved, error } = usePrototype();
  const [screen, setScreen] = useState('Home'), [selectedId, setSelectedId] = useState('');
  const [settingsPage, setSettingsPage] = useState(''), [historyBack, setHistoryBack] = useState('Detail');
  const [scheduleBack, setScheduleBack] = useState('Settings');
  if (!data) return <Shell title="MOAI BMU"><ActivityIndicator color={C.primary} /><Txt>{error ? 'Local data could not be loaded. Nothing was overwritten.' : 'Opening local prototype…'}</Txt></Shell>;
  const selected = data.records.find(r => r.id === selectedId);
  const start = async () => {
    const draft = blankRecord();
    if (await change(s => ({ ...s, records: [draft, ...s.records] }))) { setSelectedId(draft.id); setScreen('Wizard'); }
  };
  const resume = async (r: CatchRecord) => {
    if (r.status === 'Needs review') await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, step: 5 } : old) }));
    setSelectedId(r.id); setScreen('Wizard');
  };
  const open = (r: CatchRecord) => { setSelectedId(r.id); setScreen('Detail'); };
  const edit = async (r: CatchRecord) => {
    if (r.status === 'Draft') { void resume(r); return; }
    if (!data.edit) {
      await change(s => ({ ...s, edit: { recordId: r.id, working: { ...JSON.parse(JSON.stringify(r)) as CatchRecord, updateBoat: false }, reason: '', otherReason: '', section: '' } }));
    }
    setScreen('Edit');
  };
  const history = (r: CatchRecord, back: string) => { setSelectedId(r.id); setHistoryBack(back); setScreen('History'); };
  const send = async () => {
    if (!data.sendDraft) await change(s => ({ ...s, sendDraft: { ...initialSend(), email: s.recipients[0] ?? '' } }));
    setScreen('Send');
  };
  const openSetting = (name: string) => {
    if (name === 'Automatic sending') { setScheduleBack('Settings'); setScreen('Schedule'); }
    else { setSettingsPage(name); setScreen('SettingsPage'); }
  };
  const home = () => setScreen('Home');
  if (screen === 'Wizard' && selected) return <AddWizard recordId={selected.id} onHome={home} onNextRecord={id => setSelectedId(id)} />;
  if (screen === 'Detail' && selected) return <RecordDetail r={selected} onBack={() => setScreen('Records')} onEdit={() => { void edit(selected); }} onHistory={() => history(selected, 'Detail')} />;
  if (screen === 'Edit' && data.edit) return <EditRecord onDone={() => setScreen('Records')} onHistory={r => history(r, 'Edit')} />;
  if (screen === 'History' && selected) return <HistoryScreen r={selected} onBack={() => setScreen(historyBack)} />;
  if (screen === 'Records' || screen === 'Edit') return <RecordList onTab={setScreen} onOpen={open} onEdit={r => { void edit(r); }} onResume={r => { void resume(r); }} onResumeEdit={() => setScreen('Edit')} />;
  if (screen === 'Settings') return <SettingsScreen onTab={setScreen} onOpen={openSetting} />;
  if (screen === 'SettingsPage') return <SettingsPage key={settingsPage} name={settingsPage} onBack={() => setScreen('Settings')} />;
  if (screen === 'Schedule') return <ScheduleScreen onBack={() => setScreen(scheduleBack)} />;
  if (screen === 'Send') return <SendWizard onHome={home} onSchedule={() => { setScheduleBack('Home'); setScreen('Schedule'); }} onReview={async () => {
    const draft = data.sendDraft ?? initialSend();
    const [from, to] = dateRange(draft.period, draft.from, draft.to);
    await change(s => ({ ...s, filters: { ...emptyFilters(), days: 'custom', from, to, statuses: ['Needs review'] } }));
    setScreen('Records');
  }} />;
  const records = data.records.filter(r => !r.deleted).sort((a, b) => b.date.localeCompare(a.date));
  const review = records.filter(r => r.status === 'Needs review');
  return <Shell title="Home" subtitle={`${data.settings.site || 'Demo landing site'} · ${dayLabel(new Date().toISOString())}`} tab="Home" onTab={setScreen} offline={data.settings.offline}>
    {data.banner && saved ? <Card><Badge status={data.records.find(r => r.id === data.banner?.recordId)?.status ?? 'Saved'} /><Txt bold>{data.banner.text}</Txt>
      <Btn label="Edit saved record" kind="secondary" onPress={() => { const r = data.records.find(r => r.id === data.banner?.recordId); if (r) void edit(r); }} />
      <Btn label="Add another" kind="secondary" onPress={() => { void start(); }} />
      <Btn label="Dismiss saved banner" kind="quiet" onPress={() => { void change(s => ({ ...s, banner: undefined })); }} />
    </Card> : null}
    <Btn label="Add record" icon="plus" onPress={() => { void start(); }} />
    <Card><Heading>To review</Heading><Txt>{review.length ? `${review.length} records need review` : 'Nothing to review'}</Txt>
      <Btn label="Open records to review" kind="secondary" onPress={async () => {
        await change(s => ({ ...s, filters: { ...emptyFilters(), days: 'all', statuses: ['Needs review'] } })); setScreen('Records');
      }} />
    </Card>
    <Btn label="Send data" kind="secondary" icon="send" onPress={() => { void send(); }} />
    {data.edit ? <Notice><Txt>An unsaved edit is kept on this phone.</Txt><Btn label="Resume unsaved edit" kind="secondary" onPress={() => setScreen('Edit')} /></Notice> : null}
    {data.sendDraft ? <Btn label="Resume sending setup" kind="quiet" onPress={() => setScreen('Send')} /> : null}
    <Heading>Recently added</Heading>
    {!records.length ? <Txt>No records yet. Tap Add record to start.</Txt> : records.slice(0, 5).map(r =>
      <RecordRow key={r.id} r={r} onOpen={() => open(r)} onEdit={() => { void edit(r); }} onReview={() => { void resume(r); }} />)}
    <Btn label="See all records" kind="quiet" onPress={() => setScreen('Records')} />
    <Txt small muted>Synthetic prototype · {records.some(r => displayStatus(r) === 'Sent') ? 'Sent states are simulated.' : 'Records stay on this phone.'}</Txt>
  </Shell>;
}
