import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PrototypeProvider, usePrototype } from '@/lib/prototype/store';
import { blankRecord, dateRange, dayLabel, displayStatus, emptyFilters, filterRecords, recordCount, timeLabel, type CatchRecord } from '@/lib/prototype/model';
import AddWizard from './AddWizard';
import { EditRecord, HistoryScreen, RecordDetail, RecordList, RecordRow } from './Records';
import { ScheduleScreen, SendWizard, SettingsPage, SettingsScreen, initialSend } from './SendSettings';
import { MotionFrame, MotionPrefsProvider, type MotionDirection } from './motion';
import { Btn, C, Heading, Notice, Shell, Txt, s } from './ui';

export default function PrototypeApp() {
  return <MotionPrefsProvider><PrototypeProvider><PrototypeScreens /></PrototypeProvider></MotionPrefsProvider>;
}
function PrototypeScreens() {
  const { data, change, saved, error } = usePrototype();
  const [screen, setScreenState] = useState('Home'), [selectedId, setSelectedId] = useState('');
  const [motion, setMotion] = useState<{ id: number; direction: MotionDirection }>({ id: 0, direction: 'fade' });
  const [settingsPage, setSettingsPage] = useState(''), [historyBack, setHistoryBack] = useState('Detail');
  const [scheduleBack, setScheduleBack] = useState('Settings');
  const navigate = (next: string) => {
    if (next === screen) return;
    if (screen === 'Home' && next !== 'Home' && data?.banner) void change(s => ({ ...s, banner: undefined }));
    const tabs = ['Home', 'Records', 'Settings'];
    const tasks = ['Wizard', 'Edit', 'Schedule'];
    const depth: Record<string, number> = { Home: 0, Records: 0, Settings: 0, Wizard: 1, Detail: 1, Edit: 1, Send: 1, Schedule: 1, SettingsPage: 1, History: 2 };
    const direction: MotionDirection = tabs.includes(screen) && tabs.includes(next) ? 'tab'
      : tasks.includes(next) ? 'taskIn'
        : tasks.includes(screen) ? 'taskOut'
          : (depth[next] ?? 0) >= (depth[screen] ?? 0) ? 'forward' : 'back';
    setMotion(current => ({ id: current.id + 1, direction }));
    setScreenState(next);
  };
  const frame = (children: React.ReactNode) => <MotionFrame key={motion.id} id={motion.id} direction={motion.direction}>{children}</MotionFrame>;
  if (!data) return <Shell title="MOAI BMU"><ActivityIndicator color={C.primary} /><Txt>{error ? 'Local data could not be loaded. Nothing was overwritten.' : 'Opening local prototype…'}</Txt></Shell>;
  const selected = data.records.find(r => r.id === selectedId);
  const start = async () => {
    const draft = blankRecord(data.settings.site);
    if (await change(s => ({ ...s, records: [draft, ...s.records] }))) { setSelectedId(draft.id); navigate('Wizard'); }
  };
  const resume = async (r: CatchRecord) => {
    if (r.status === 'Needs review') await change(s => ({ ...s, records: s.records.map(old => old.id === r.id ? { ...old, step: 5 } : old) }));
    setSelectedId(r.id); navigate('Wizard');
  };
  const open = (r: CatchRecord) => { setSelectedId(r.id); navigate('Detail'); };
  const edit = async (r: CatchRecord) => {
    if (r.status === 'Draft') { void resume(r); return; }
    if (!data.edit) {
      await change(s => ({ ...s, edit: { recordId: r.id, working: { ...JSON.parse(JSON.stringify(r)) as CatchRecord, updateBoat: false }, reason: '', otherReason: '', section: '' } }));
    }
    navigate('Edit');
  };
  const history = (r: CatchRecord, back: string) => { setSelectedId(r.id); setHistoryBack(back); navigate('History'); };
  const send = async () => {
    if (!data.sendDraft) await change(s => ({ ...s, sendDraft: { ...initialSend(), email: s.recipients[0] ?? '' } }));
    navigate('Send');
  };
  const openSetting = (name: string) => {
    if (name === 'Automatic sending') { setScheduleBack('Settings'); navigate('Schedule'); }
    else { setSettingsPage(name); navigate('SettingsPage'); }
  };
  const home = () => navigate('Home');
  if (screen === 'Wizard' && selected) return frame(<AddWizard recordId={selected.id} onHome={home} onNextRecord={id => setSelectedId(id)} />);
  if (screen === 'Detail' && selected) return frame(<RecordDetail r={selected} onBack={() => navigate('Records')} onEdit={() => { void edit(selected); }} onHistory={() => history(selected, 'Detail')} />);
  if (screen === 'Edit' && data.edit) return frame(<EditRecord onDone={() => navigate('Records')} onHistory={r => history(r, 'Edit')} />);
  if (screen === 'History' && selected) return frame(<HistoryScreen r={selected} onBack={() => navigate(historyBack)} />);
  if (screen === 'Records' || screen === 'Edit') return frame(<RecordList onTab={navigate} onOpen={open} onEdit={r => { void edit(r); }} onResume={r => { void resume(r); }} onResumeEdit={() => navigate('Edit')} />);
  if (screen === 'Settings') return frame(<SettingsScreen onTab={navigate} onOpen={openSetting} />);
  if (screen === 'SettingsPage') return frame(<SettingsPage key={settingsPage} name={settingsPage} onBack={() => navigate('Settings')} />);
  if (screen === 'Schedule') return frame(<ScheduleScreen onBack={() => navigate(scheduleBack)} />);
  if (screen === 'Send') return frame(<SendWizard onHome={home} onSchedule={() => { setScheduleBack('Home'); navigate('Schedule'); }} onReview={async () => {
    const draft = data.sendDraft ?? initialSend();
    const [from, to] = dateRange(draft.period, draft.from, draft.to);
    await change(s => ({ ...s, filters: { ...emptyFilters(), days: 'custom', from, to, statuses: ['Needs review'] } }));
    navigate('Records');
  }} />);
  const records = data.records.filter(r => !r.deleted).sort((a, b) => b.date.localeCompare(a.date));
  const reviewCount = filterRecords(data, { ...emptyFilters(), days: 'all', statuses: ['Needs review'] }).length;
  const bannerRecord = data.banner ? data.records.find(r => r.id === data.banner?.recordId) : undefined;
  const dismissBanner = () => { void change(s => ({ ...s, banner: undefined })); };
  const addRecord = () => { void start(); };
  const reviewRecords = async () => {
    await change(s => ({ ...s, filters: { ...emptyFilters(), days: 'all', statuses: ['Needs review'] } }));
    navigate('Records');
  };
  return frame(<Shell title="Home" subtitle={`${data.settings.site || 'Demo landing site'} · ${dayLabel(new Date().toISOString())}`}
    tab="Home" onTab={navigate} offline={data.settings.offline} offlineCompact>
    {!records.length ? <>
      <Btn label="Add record" icon="plus" large onPress={addRecord} />
      <Txt>No records yet. Add the first record.</Txt>
    </> : <>
      {data.banner && saved && bannerRecord ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={s.savedConfirmation}>
        <Feather name={bannerRecord.status === 'Needs review' ? 'alert-circle' : 'check-circle'}
          size={20} color={bannerRecord.status === 'Needs review' ? C.warning : C.primary} />
        <Text numberOfLines={1} style={[s.compactRecordTitle, s.savedConfirmationText]}>
          {bannerRecord.status === 'Needs review' ? 'Saved as Needs review' : 'Saved'}: {bannerRecord.boatName}, {timeLabel(bannerRecord.date)}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${bannerRecord.status === 'Needs review' ? 'Review' : 'Edit'} saved record`}
          onPress={() => bannerRecord.status === 'Needs review' ? void resume(bannerRecord) : void edit(bannerRecord)} style={s.confirmAction}>
          <Feather name="edit-3" size={18} color={C.primary} /><Text style={s.compactEditText}>{bannerRecord.status === 'Needs review' ? 'Review' : 'Edit'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" testID="dismiss-saved"
          onPress={dismissBanner} style={s.iconButton}><Feather name="x" size={22} color={C.foreground} /></Pressable>
      </Animated.View> : null}
      <Btn label="Add record" icon="plus" large onPress={addRecord} />
      {reviewCount ? <Pressable accessibilityRole="button" accessibilityLabel={`${recordCount(reviewCount)} need review`}
        testID="home-review" onPress={() => { void reviewRecords(); }} style={s.reviewRow}>
        <Feather name="alert-circle" size={21} color={C.warning} />
        <Text style={[s.compactRecordTitle, { flex: 1 }]}>{recordCount(reviewCount)} need review</Text>
        <Feather name="chevron-right" size={21} color={C.foreground} />
      </Pressable> : null}
      <Btn label="Send data" kind="secondary" icon="send" large onPress={() => { void send(); }} />
      <Heading>Recent</Heading>
      {records.slice(0, 3).map(r => <RecordRow key={r.id} r={r} onOpen={() => open(r)}
        onEdit={() => r.status === 'Needs review' ? void resume(r) : void edit(r)} />)}
      <Btn label="See all records" kind="quiet" onPress={() => navigate('Records')} />
    </>}
  </Shell>);
}
