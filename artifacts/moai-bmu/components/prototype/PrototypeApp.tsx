import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PrototypeProvider, usePrototype } from '@/lib/prototype/store';
import { blankRecord, dayLabel, displayStatus, emptyFilters, filterRecords, readyToSend, recordCount, timeLabel, type CatchRecord, type TrendMetric } from '@/lib/prototype/model';
import AddWizard from './AddWizard';
import { EditRecord, HistoryScreen, RecordDetail, RecordList, RecordRow, resetReviewFilters } from './Records';
import { ScheduleScreen } from './ScheduleFlow';
import { SettingsPage, SettingsScreen } from './SettingsFlow';
import { SendWizard, makeSendDraft } from './SendFlow';
import { MotionFrame, MotionPrefsProvider, type MotionDirection } from './motion';
import { Btn, C, Heading, Notice, OverlayVisibilityProvider, Shell, Txt, s } from './ui';
import { AddFab, fabVisibleOn } from './AddFab';
import { resetTrendChartSession, TrendChartScreen, TrendsRoot } from './TrendsFlow';
import { FlagScreen, FlagsList } from './TrendFlags';
import { makeTrendSnapshot, patchFlag } from '@/lib/prototype/trends-model';

export default function PrototypeApp() {
  return <MotionPrefsProvider><PrototypeProvider><OverlayVisibilityProvider><PrototypeScreens /></OverlayVisibilityProvider></PrototypeProvider></MotionPrefsProvider>;
}
function PrototypeScreens() {
  const { data, change, saved, error, retry } = usePrototype();
  const insets = useSafeAreaInsets();
  const [screen, setScreenState] = useState('Home'), [selectedId, setSelectedId] = useState('');
  const [recordsView, setRecordsView] = useState<'All records' | 'Needs review' | 'Trends'>('All records');
  const [chartMetric, setChartMetric] = useState<TrendMetric>('total');
  const [customChart, setCustomChart] = useState(false), [plotTouched, setPlotTouched] = useState(false);
  const [chartReminderVisible, setChartReminderVisible] = useState(false);
  const [chartBackRoute, setChartBackRoute] = useState('Records'), [editingFlagId, setEditingFlagId] = useState('');
  const [settingsFabVisible, setSettingsFabVisible] = useState(true);
  const [flagNotice, setFlagNotice] = useState('');
  const [undoClock, setUndoClock] = useState(Date.now());
  const [flagSnapshot, setFlagSnapshot] = useState<ReturnType<typeof makeTrendSnapshot> | undefined>();
  const [flagId, setFlagId] = useState('');
  const [flagBack, setFlagBack] = useState('TrendChart'), [flagsBack, setFlagsBack] = useState('Settings');
  const [originRoute, setOriginRoute] = useState<'Home' | 'Records' | 'Settings' | 'TrendChart'>('Home');
  const [presentMode, setPresentMode] = useState(false);
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
  useEffect(() => {
    if (!data?.undo) return;
    const timer = setTimeout(() => setUndoClock(Date.now()), Math.max(0, data.undo.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [data?.undo?.expiresAt]);
  useEffect(() => {
    if (!flagNotice) return;
    const timer = setTimeout(() => setFlagNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [flagNotice]);
  const tabRoute = ['Home', 'Records', 'Settings', 'TrendChart'].includes(screen);
  const fabEligible = tabRoute && (fabVisibleOn as readonly string[]).includes(screen) && !plotTouched
    && !(screen === 'TrendChart' && chartReminderVisible)
    && (screen !== 'Settings' || settingsFabVisible)
    && !(screen === 'Records' && recordsView === 'All records' && data?.filters.statuses.length === 1 && data.filters.statuses[0] === 'Saved')
    && !(screen === 'Settings' && settingsPage !== '');
  const toastShowing = !!data?.banner && saved && screen !== 'Home' && ['Records', 'Settings'].includes(screen);
  const undoToastShowing = !!data?.undo && data.undo.expiresAt > undoClock && saved;
  const frame = (children: React.ReactNode) => <View style={{ flex: 1 }}>
    <MotionFrame key={motion.id} id={motion.id} direction={motion.direction}>{children}</MotionFrame>
    {toastShowing && data?.banner ? <View style={{ position: 'absolute', left: 16, right: 16,
      bottom: (Platform.OS === 'web' ? 84 : 56 + insets.bottom) + 8, zIndex: 18, backgroundColor: C.card, borderRadius: 14, borderColor: C.border, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Feather name="check-circle" size={20} color={C.primary} />
      <Text numberOfLines={2} style={{ flex: 1, color: C.foreground, fontSize: 14, fontWeight: '600' }}>{data.banner.text}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit saved record" onPress={() => {
        const record = data.records.find(item => item.id === data.banner?.recordId);
        if (record) record.status === 'Needs review' ? void resume(record) : void edit(record);
      }} style={s.iconButton}><Feather name="edit-3" size={20} color={C.primary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss saved message" onPress={() => { void change(state => ({ ...state, banner: undefined })); }} style={s.iconButton}>
        <Feather name="x" size={20} color={C.foreground} />
      </Pressable>
    </View> : null}
    {flagNotice ? <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16,
      bottom: (Platform.OS === 'web' ? 84 : 56 + insets.bottom) + 8, zIndex: 19, backgroundColor: C.card, borderRadius: 14, borderColor: C.border, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Feather name="check-circle" size={20} color={C.primary} /><Text style={{ flex: 1, color: C.foreground, fontSize: 15, fontWeight: '700' }}>{flagNotice}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss draft saved message" onPress={() => setFlagNotice('')} style={s.iconButton}><Feather name="x" size={20} color={C.foreground} /></Pressable>
    </View> : null}
    <AddFab visible={fabEligible && !presentMode} raised={toastShowing || undoToastShowing} onPress={() => {
      setOriginRoute(screen === 'Records' ? 'Records' : screen === 'Settings' ? 'Settings' : screen === 'TrendChart' ? 'TrendChart' : 'Home');
      void start();
    }} />
  </View>;
  if (!data) return <Shell title="MOAI BMU" contentGap={14}>
    <View accessibilityLabel="Loading local records" style={{ gap: 12 }}>
      <View style={{ height: 22, width: '46%', borderRadius: 8, backgroundColor: C.seaGlass }} />
      {[0, 1, 2].map(item => <View key={item} style={{ minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 14, gap: 12 }}>
        <View style={{ height: 16, width: `${55 + item * 8}%`, borderRadius: 8, backgroundColor: C.seaGlass }} />
        <View style={{ height: 14, width: '78%', borderRadius: 8, backgroundColor: C.seaGlass }} />
        <View style={{ height: 14, width: '42%', borderRadius: 8, backgroundColor: C.seaGlass }} />
      </View>)}
    </View>
    {error ? <Notice warning><View style={{ gap: 8 }}><Txt>{error} Nothing was overwritten.</Txt><Btn label="Try again" kind="secondary" onPress={() => { void retry(); }} /></View></Notice>
      : <Txt small muted>Opening local prototype…</Txt>}
  </Shell>;
  const selected = data.records.find(r => r.id === selectedId);
  const start = async () => {
    const draft = blankRecord(data.settings.site);
    if (await change(s => ({ ...s, banner: undefined, records: [draft, ...s.records] }))) { setSelectedId(draft.id); navigate('Wizard'); }
  };
  const wizardExit = async () => { navigate(originRoute); };
  const openTrends = () => { setRecordsView('Trends'); navigate('Records'); };
  const openChart = (metric: TrendMetric, custom = false) => { resetTrendChartSession(); setChartReminderVisible(false); setEditingFlagId(''); setChartMetric(metric); setCustomChart(custom); setChartBackRoute('Records'); setPresentMode(false); navigate('TrendChart'); };
  const openFlag = (snapshot: ReturnType<typeof makeTrendSnapshot>) => {
    if (editingFlagId) {
      const id = editingFlagId;
      void change(s => ({ ...s, flags: (s.flags ?? []).map(flag => flag.id === id ? patchFlag(flag, { snapshot }) : flag) }));
      setFlagId(id); setFlagSnapshot(undefined); setEditingFlagId(''); setFlagBack('TrendChart'); navigate('Flag');
    } else { setFlagSnapshot(snapshot); setFlagId(''); setFlagBack('TrendChart'); navigate('Flag'); }
  };
  const openFlagDetail = (id: string) => { setFlagId(id); setFlagSnapshot(undefined); navigate('FlagDetail'); };
  const openFlags = (back: string) => { setFlagsBack(back); navigate('Flags'); };
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
    if (!data.sendDraft) await change(s => ({ ...s, sendDraft: makeSendDraft(s.recipients.at(-1) ?? '') }));
    navigate('Send');
  };
  const openSetting = (name: string) => {
    if (name === 'Automatic sending') { setScheduleBack('Settings'); navigate('Schedule'); }
    else { setHistoryBack('Settings'); setSettingsPage(name); navigate('SettingsPage'); }
  };
  const home = () => navigate('Home');
  const reviewRecords = async () => {
    setRecordsView('Needs review');
    resetReviewFilters();
    navigate('Records');
  };
  if (screen === 'Wizard' && selected) return frame(<AddWizard recordId={selected.id} onHome={() => { void wizardExit(); }} onNextRecord={id => setSelectedId(id)} />);
  if (screen === 'Detail' && selected) return frame(<RecordDetail r={selected} onBack={() => navigate('Records')} onEdit={() => { void edit(selected); }} onHistory={() => history(selected, 'Detail')} />);
  if (screen === 'Edit' && data.edit) return frame(<EditRecord onDone={() => navigate('Records')} onHistory={r => history(r, 'Edit')} />);
  if (screen === 'History' && selected) return frame(<HistoryScreen r={selected} onBack={() => navigate(historyBack)} />);
  if (screen === 'Records' && recordsView === 'Trends') return frame(<TrendsRoot onChart={openChart} onFlags={() => openFlags('Records')} onTab={navigate} onNeedsReview={() => { void reviewRecords(); }}
    onView={view => { setRecordsView(view); setScreenState('Records'); }} />);
  if (screen === 'TrendChart') return frame(<TrendChartScreen metric={chartMetric} onBack={() => { setPresentMode(false); if (editingFlagId) setEditingFlagId(''); navigate(chartBackRoute); }} onFlag={openFlag} onTab={navigate}
     onPresentChange={setPresentMode} onPlotTouchChange={setPlotTouched} onReminderVisibilityChange={setChartReminderVisible} onNeedsReview={() => { void reviewRecords(); }} custom={customChart} />);
   if (screen === 'Flag' || screen === 'FlagDetail') return frame(<FlagScreen key={`${screen}-${flagId}`} flagId={flagId || undefined} snapshot={flagSnapshot} onBack={() => navigate(flagBack)} onDraftSaved={() => setFlagNotice('Draft saved in Flags')}
    onChartChange={id => {
      if (!id) return;
      const current = data.flags?.find(flag => flag.id === id);
      if (!current) return;
      resetTrendChartSession();
      setChartReminderVisible(false);
      setEditingFlagId(id); setChartMetric(current.snapshot.metric); setCustomChart(true); setChartBackRoute('Flag'); setPresentMode(false); navigate('TrendChart');
    }} onDetail={openFlagDetail} />);
   if (screen === 'Flags') return frame(<FlagsList tab={flagsBack === 'Records' ? 'Records' : 'Settings'} onBack={() => navigate(flagsBack)} onOpen={id => { setFlagBack('Flags'); openFlagDetail(id); }} onTab={navigate} />);
  if (screen === 'Records' || screen === 'Edit') return frame(<RecordList view={recordsView === 'Needs review' ? 'Needs review' : 'All records'} onView={view => {
      if (view === 'Trends') { setRecordsView('Trends'); return; }
      setRecordsView(view); setScreenState('Records');
    }} onTab={navigate} onOpen={open} onEdit={r => { void edit(r); }} onResume={r => { void resume(r); }} onResumeEdit={() => navigate('Edit')} />);
  if (screen === 'Settings') return frame(<SettingsScreen onTab={navigate} onOpen={openSetting} onFlags={() => openFlags('Settings')}
    onFabVisibilityChange={setSettingsFabVisible} />);
  if (screen === 'SettingsPage') return frame(<SettingsPage key={settingsPage} name={settingsPage} onBack={() => navigate(historyBack === 'Send' ? 'Send' : 'Settings')}
    onFlag={id => { setFlagBack('SettingsPage'); openFlagDetail(id); }} />);
  if (screen === 'Schedule') return frame(<ScheduleScreen onBack={() => navigate(scheduleBack)} />);
  if (screen === 'Send') return frame(<SendWizard onHome={home} onSchedule={() => { setScheduleBack('Send'); navigate('Schedule'); }}
    onHistory={() => { setSettingsPage('Send history'); setHistoryBack('Send'); navigate('SettingsPage'); }} onReview={async () => {
      setRecordsView('Needs review');
      resetReviewFilters();
      navigate('Records');
  }} />);
  const records = data.records.filter(r => !r.deleted).sort((a, b) => b.date.localeCompare(a.date));
  const reviewCount = filterRecords(data, { ...emptyFilters(), days: 'all', statuses: ['Needs review'] }).length;
  const readyCount = records.filter(readyToSend).length;
  const pendingFlags = (data.flags ?? []).filter(flag => ['Draft', 'Waiting to send', "Couldn't send"].includes(flag.status));
  const lastAttempt = data.attempts.find(a => a.state === 'Sent');
  const bannerRecord = data.banner ? data.records.find(r => r.id === data.banner?.recordId) : undefined;
  const dismissBanner = () => { void change(s => ({ ...s, banner: undefined })); };
  const addRecord = () => { setOriginRoute('Home'); void start(); };
  return frame(<Shell title="Home" subtitle={`${data.settings.site || 'Msambweni Landing Site'} · ${dayLabel(new Date().toISOString())}`}
    tab="Home" onTab={navigate} offline={data.settings.offline} offlineCompact>
    {!data.settings.introSeen ? <Notice>
      <View style={{ flex: 1, gap: 8 }}><Txt bold>Practice app with sample data. Nothing will be sent.</Txt>
        <Btn label="Continue" kind="secondary" onPress={() => { void change(s => ({ ...s, settings: { ...s.settings, introSeen: true } })); }} /></View>
    </Notice> : null}
    {!records.length ? <>
      <Txt>No records yet. Tap Add record to start.</Txt>
      {data.trends?.fabHomeButton ? <Btn label="Add record" icon="plus" large onPress={addRecord} /> : null}
    </> : <>
      {originRoute === 'Home' && data.banner && saved && bannerRecord ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={s.savedConfirmation}>
        <Feather name={bannerRecord.status === 'Needs review' ? 'alert-circle' : 'check-circle'}
          size={20} color={bannerRecord.status === 'Needs review' ? C.warning : C.primary} />
        <Text numberOfLines={1} style={[s.compactRecordTitle, s.savedConfirmationText, { fontSize: 14 }]}>
          {data.banner.text}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${bannerRecord.status === 'Needs review' ? 'Review' : 'Edit'} saved record`}
          onPress={() => bannerRecord.status === 'Needs review' ? void resume(bannerRecord) : void edit(bannerRecord)} style={s.confirmAction}>
          <Feather name="edit-3" size={18} color={C.primary} /><Text style={s.compactEditText}>{bannerRecord.status === 'Needs review' ? 'Review' : 'Edit'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" testID="dismiss-saved"
          onPress={dismissBanner} style={s.iconButton}><Feather name="x" size={22} color={C.foreground} /></Pressable>
      </Animated.View> : null}
      {data.trends?.fabHomeButton ? <Btn label="Add record" icon="plus" large onPress={addRecord} /> : null}
      <View style={s.sinceSendCard}>
        <View style={s.sinceSendTop}><Text style={s.sinceSendTitle}>Since last send</Text>
          <Text style={s.sinceSendMeta}>{lastAttempt ? `Last sent ${dayLabel(lastAttempt.at)}` : 'Not sent yet'}</Text></View>
        {reviewCount ? <Pressable accessibilityRole="button" accessibilityLabel={`${recordCount(reviewCount)} need review`}
          testID="home-review" onPress={() => { void reviewRecords(); }} style={s.sinceSendReview}>
          <Feather name="alert-circle" size={20} color={C.warning} /><Text style={[s.compactRecordTitle, { flex: 1 }]}>{recordCount(reviewCount)} need review</Text><Feather name="chevron-right" size={20} color={C.foreground} />
        </Pressable> : null}
        <View style={s.sinceSendReady}><View style={{ flex: 1 }}><Text style={s.sinceSendCount}>{readyCount ? `${recordCount(readyCount)} ready to send` : 'Nothing to send'}</Text>
          {!readyCount ? <Txt small muted>All records sent.</Txt> : null}</View>
          {readyCount ? <Btn label={`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`} kind="secondary" icon="send" onPress={() => { void send(); }} /> : null}
        </View>
        {data.schedule.enabled ? <Txt small muted>Sends automatically every {data.schedule.weeks} weeks. Next: {dayLabel(data.schedule.firstDate + 'T12:00:00')}</Txt> : null}
      {pendingFlags.length ? <Pressable accessibilityRole="button" onPress={() => {
        const pending = pendingFlags[0];
        setFlagId(pending.id); setFlagSnapshot(undefined); setFlagBack('Home'); navigate('FlagDetail');
      }} style={[s.settingRow, { minHeight: 60, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 }]}>
        <Text style={{ flex: 1, color: C.foreground, fontSize: 16, fontWeight: '700' }}>{pendingFlags.length} {pendingFlags.length === 1 ? 'flag needs' : 'flags need'} attention</Text><Feather name="chevron-right" size={20} color={C.foreground} />
      </Pressable> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={openTrends} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14 }}>
        <Feather name="trending-up" size={22} color={C.primary} />
        <View style={{ flex: 1 }}><Text style={{ color: C.foreground, fontSize: 16, fontWeight: '700' }}>Compare trends</Text><Text style={{ color: C.mutedForeground, fontSize: 14 }}>{data.trends?.history === 'None' ? 'No earlier records yet' : 'This year against earlier years'}</Text></View>
        <Feather name="chevron-right" size={20} color={C.foreground} />
      </Pressable>
      <Heading>Recent</Heading>
      <View style={{ gap: 8 }}>{records.slice(0, 3).map(r => <RecordRow key={r.id} r={r} onOpen={() => open(r)}
        onEdit={() => r.status === 'Needs review' ? void resume(r) : void edit(r)} />)}</View>
      <Btn label="See all records" kind="quiet" onPress={() => navigate('Records')} />
    </>}
  </Shell>);
}
