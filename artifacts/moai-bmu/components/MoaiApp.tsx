import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { makeDemoData } from '@/lib/demo-data';
import { aiService } from '@/lib/ai-service';
import type { SuggestSpeciesResponse } from '@workspace/api-client-react';
import {
  BMU_NAME,
  catchItemValue,
  DEMO_SITES,
  OFFICIAL_NAME,
  STORAGE_KEY,
  formatDateTime,
  makeId,
  nairobiDayKey,
  newLocalDateTime,
  parseLocalDateTime,
  recordSaleValue,
  toCsv,
  validateLanding,
  type AppData,
  type CatchDraft,
  type CatchItem,
  type LandingForm,
  type LandingRecord,
  type Language,
  type PriceBasis,
  type WeightBasis,
} from '@/lib/domain';

type Page = 'today' | 'record' | 'review' | 'records' | 'summary' | 'settings';
type CaptureMode = 'choose' | 'details' | 'voice' | 'photo';
type StatusFilter = 'all' | 'approved' | 'draft' | 'rejected';
type DateFilter = 'all' | 'today' | 'week';
type Palette = ReturnType<typeof useColors>;

const COPY = {
  en: {
    today: 'Today', record: 'Record', review: 'Review', records: 'My records', summary: 'BMU summary',
    settings: 'Settings', demo: 'Prototype · Demo data', official: 'BMU official',
    todayIntro: 'A clear picture of today’s landings.', approvedToday: 'Approved today',
    awaitingReview: 'Awaiting review', waitingSync: 'Waiting to sync', catchWeight: 'Catch recorded today',
    recordLanding: 'Record a landing', quickTip: 'Record one boat landing with one or more catch items.',
    actualNetwork: 'Device internet', demoSync: 'Demo sync', available: 'Available', unavailable: 'Unavailable',
    unknown: 'Unknown', savedPhone: 'Saved on this phone', syncWaiting: 'Waiting to sync',
    syncedDemo: 'Synced · demo only', locallySaved: 'Saved locally', saving: 'Saving locally…',
    saveError: 'Local save needs attention', recordMethod: 'How would you like to record?',
    enterDetails: 'Enter details', voiceReport: 'Record voice', photoCatch: 'Take or upload a photo',
    shortForm: 'Short guided form', voiceNote: 'Short voice note', photoNote: 'Photo and manual details',
    site: 'Landing site', dateTime: 'Landing date and time · EAT', vessel: 'Vessel code or name',
    crew: 'Crew count · optional', gear: 'Gear type · optional', departure: 'Departure time · optional',
    returnTime: 'Return time · optional', area: 'Broad fishing area · optional', catchItems: 'Catch items',
    localName: 'Local fish name', species: 'Species or group · if known', weight: 'Weight · kg',
    weightBasis: 'Weight basis', measured: 'Measured', estimated: 'Estimated', priceBasis: 'Price basis',
    perKg: 'KES per kg', totalSale: 'Total sale · KES', noPrice: 'Unknown price',
    amount: 'Price amount · KES', addCatch: 'Add another catch item', removeCatch: 'Remove catch item', observation: 'Observation · optional',
    saveDraft: 'Save draft for review', cancel: 'Cancel', remove: 'Remove', addPhoto: 'Add photo to catch',
    camera: 'Camera', upload: 'Upload', preparedPhoto: 'Use prepared demo image',
    preparedImageNote: 'Prepared example: suggested group is rabbitfish. Confirm or correct it.',
    arbitraryPhotoNote: 'Photo is saved as source evidence. It cannot establish weight, price, vessel, or fishing location.',
    sampleVoice: 'Try sample voice report', sampleVoiceText: 'Demo Boat 01 landed 12 kilograms of rabbitfish at Demo Landing A. Price was 350 Kenyan shillings per kilogram.',
    seededError: 'Seeded demonstration error: the transcript says 12 kg, while the draft suggests 21 kg. Correct the draft before approval.',
    realVoiceNote: 'Recording stays on this phone. Optional server transcription is an unverified draft; check it against the audio.',
    startRecording: 'Start recording', stopRecording: 'Stop recording', playRecording: 'Replay voice note',
    deleteRecording: 'Delete voice note', transcript: 'Transcript · prepared example or your own notes',
    createVoiceDraft: 'Create draft from voice note', createPhotoDraft: 'Review photo and enter details',
    transcribeAi: 'Transcribe with AI · unverified', transcribingAi: 'Transcribing securely…',
    aiTranscriptReview: 'AI-generated draft text · check it against the recording.',
    suggestSpeciesAi: 'Suggest fish group with AI', analyzingImageAi: 'Reviewing image securely…',
    aiPhotoLabel: 'AI image suggestion · unverified', aiConfidence: 'Confidence',
    useAiSuggestion: 'Copy suggestion into editable fields',
    aiMediaNote: 'When enabled, this sends the selected media to the configured server-side model for an unverified suggestion.',
    aiUnavailable: 'AI service unavailable. Your media remains on this phone; enter details manually.',
    noClearSpecies: 'No clear fish identification. Leave it unknown or enter it after checking.',
    reviewQueue: 'Review queue', noPending: 'No records need review.', selectDraft: 'Choose a draft to review.',
    correctAndApprove: 'Check the source, complete missing fields, then approve.', source: 'Source',
    transcriptSource: 'Transcript', photoSource: 'Source photo', approval: 'Approve record',
    reject: 'Reject suggestion', retrySync: 'Simulate sync now', simOnly: 'Demo sync only · no server upload or multi-device sync.',
    approveDone: 'Record approved', another: 'Record another landing', viewHistory: 'View record history',
    filters: 'Filters', date: 'Date', speciesFilter: 'Species', search: 'Search vessel, local name or species', all: 'All', draftStatus: 'Needs review',
    approvedStatus: 'Approved', rejectedStatus: 'Rejected', noRecords: 'No records match these filters.',
    details: 'Landing details', history: 'History', amend: 'Amend approved record',
    amendmentReason: 'Reason for amendment · required', saveAmendment: 'Save amendment',
    amendmentSaved: 'Amendment saved. Previous values remain in the history.',
    day: 'Today', week: 'Last 7 days', landings: 'Recorded landings', weightLabel: 'Recorded catch weight',
    valueLabel: 'Recorded sale value', pricesObserved: 'Observed prices', missingPrices: 'Records with missing prices',
    bySpecies: 'Recorded weight by local category', last7Days: 'Last 7 days', unitPrices: 'Observed prices per kg', totalSaleObservations: 'Catch items reported with total sale amounts', priceNote: 'Average of captured per-kg prices only; not a market price.', summaryNote: 'Summaries include approved captured records only. They are not estimates of the entire fishery.',
    prototypeExport: 'Prototype export', exportCsv: 'Download CSV', exportDone: 'Prototype CSV export created.',
    language: 'Language', english: 'English', swahili: 'Kiswahili', assignedSite: 'Assigned demo site',
    connectivity: 'Demo connectivity', resetDemo: 'Reset demo data', resetConfirm: 'Reset all records and settings to the original demo?',
    confirmReset: 'Yes, reset demo', keepData: 'Keep my data', resetDone: 'Demo data reset.',
    profile: 'Demo official', deviceStatus: 'Device and sync status', localOnlyInfo: 'Your records stay on this phone. The sync control only demonstrates a possible future server flow.',
    pendingList: 'Saved records waiting for review', missingInfo: 'Needs confirmation', noSummary: 'No approved records for this site yet.',
    unknownSpecies: 'Unknown species group', amountUnknown: 'Price not recorded', approveValidation: 'Please complete the required fields before approval.',
    voiceErrorGate: 'Review the seeded 21 kg demo error. The transcript states 12 kg.',
    onlineSim: 'On · simulated', offlineSim: 'Off · local queue only', deviceUnknown: 'Checking…',
    photoSuggestion: 'Prepared suggestion', none: 'None', noObservation: 'No observation recorded.',
    edit: 'Edit', draftSaved: 'Draft saved on this phone.', languageInfo: 'English and Kiswahili labels are prototype translations for review.',
    fallbackSaved: 'Saved on this phone', status: 'Status', priced: 'Price recorded', marketValue: 'Calculated value',
    approvedBy: 'Approved by', capturedBy: 'Recorded by', siteChanged: 'Demo assignment changed.',
    photoNoInference: 'A fish photo never supplies weight, price, crew, or fishing location.',
  },
  sw: {
    today: 'Leo', record: 'Rekodi', review: 'Kagua', records: 'Rekodi zangu', summary: 'Muhtasari wa BMU',
    settings: 'Mipangilio', demo: 'Mfano · Data ya majaribio', official: 'Afisa wa BMU',
    todayIntro: 'Muhtasari wa wazi wa shughuli za leo.', approvedToday: 'Zilizoidhinishwa leo',
    awaitingReview: 'Zinasubiri ukaguzi', waitingSync: 'Zinasubiri kusawazishwa', catchWeight: 'Uzito wa samaki leo',
    recordLanding: 'Rekodi upakuaji', quickTip: 'Rekodi mashua moja yenye aina moja au zaidi za samaki.',
    actualNetwork: 'Intaneti ya kifaa', demoSync: 'Usawazishaji wa mfano', available: 'Inapatikana', unavailable: 'Haipatikani',
    unknown: 'Haijulikani', savedPhone: 'Imehifadhiwa kwenye simu hii', syncWaiting: 'Inasubiri kusawazishwa',
    syncedDemo: 'Imesawazishwa · mfano tu', locallySaved: 'Imehifadhiwa ndani ya simu', saving: 'Inahifadhiwa…',
    saveError: 'Hifadhi ya ndani inahitaji kuangaliwa', recordMethod: 'Ungependa kurekodi kwa njia gani?',
    enterDetails: 'Ingiza maelezo', voiceReport: 'Rekodi sauti', photoCatch: 'Piga au pakia picha',
    shortForm: 'Fomu fupi ya hatua', voiceNote: 'Ujumbe mfupi wa sauti', photoNote: 'Picha na maelezo ya mkono',
    site: 'Eneo la kutua', dateTime: 'Tarehe na saa ya kutua · EAT', vessel: 'Namba au jina la chombo',
    crew: 'Idadi ya wafanyakazi · hiari', gear: 'Aina ya zana · hiari', departure: 'Muda wa kuondoka · hiari',
    returnTime: 'Muda wa kurudi · hiari', area: 'Eneo pana la uvuvi · hiari', catchItems: 'Aina za samaki',
    localName: 'Jina la samaki la eneo', species: 'Spishi au kundi · ikijulikana', weight: 'Uzito · kg',
    weightBasis: 'Msingi wa uzito', measured: 'Uliopimwa', estimated: 'Makadirio', priceBasis: 'Msingi wa bei',
    perKg: 'KES kwa kg', totalSale: 'Jumla ya mauzo · KES', noPrice: 'Bei haijulikani',
    amount: 'Kiasi cha bei · KES', addCatch: 'Ongeza aina nyingine', removeCatch: 'Ondoa aina hii', observation: 'Uchunguzi · hiari',
    saveDraft: 'Hifadhi rasimu ikaguliwe', cancel: 'Ghairi', remove: 'Ondoa', addPhoto: 'Ongeza picha',
    camera: 'Kamera', upload: 'Pakia', preparedPhoto: 'Tumia picha ya mfano',
    preparedImageNote: 'Mfano ulioandaliwa: kundi lililopendekezwa ni changu. Thibitisha au sahihisha.',
    arbitraryPhotoNote: 'Picha imehifadhiwa kama ushahidi. Haiwezi kuthibitisha uzito, bei, chombo au eneo la uvuvi.',
    sampleVoice: 'Jaribu mfano wa taarifa ya sauti', sampleVoiceText: 'Demo Boat 01 landed 12 kilograms of rabbitfish at Demo Landing A. Price was 350 Kenyan shillings per kilogram.',
    seededError: 'Hitilafu ya mfano: taarifa inasema kilo 12, lakini rasimu inapendekeza kilo 21. Sahihisha kabla ya kuidhinisha.',
    realVoiceNote: 'Sauti inabaki kwenye simu hii. Maandishi ya seva ni rasimu isiyothibitishwa; yakague kwa kusikiliza.',
    startRecording: 'Anza kurekodi', stopRecording: 'Simamisha kurekodi', playRecording: 'Sikiliza tena',
    deleteRecording: 'Futa sauti', transcript: 'Maandishi · mfano au maelezo yako',
    createVoiceDraft: 'Unda rasimu kutokana na sauti', createPhotoDraft: 'Kagua picha na uweke maelezo',
    transcribeAi: 'Badilisha sauti kwa AI · haijathibitishwa', transcribingAi: 'Inabadilisha sauti kwa usalama…',
    aiTranscriptReview: 'Maandishi ya AI · hakiki kwa kusikiliza sauti.',
    suggestSpeciesAi: 'Pendekeza kundi la samaki kwa AI', analyzingImageAi: 'Inakagua picha kwa usalama…',
    aiPhotoLabel: 'Pendekezo la picha la AI · halijathibitishwa', aiConfidence: 'Uhakika',
    useAiSuggestion: 'Nakili pendekezo kwenye sehemu zinazoweza kuhaririwa',
    aiMediaNote: 'Ikiwashwa, picha au sauti hutumwa kwa modeli ya seva kwa pendekezo lisilothibitishwa.',
    aiUnavailable: 'Huduma ya AI haipatikani. Picha au sauti imehifadhiwa kwenye simu; jaza maelezo mwenyewe.',
    noClearSpecies: 'Samaki hawezi kutambuliwa wazi. Acha bila kujulikana au jaza baada ya kukagua.',
    reviewQueue: 'Foleni ya ukaguzi', noPending: 'Hakuna rekodi zinazohitaji ukaguzi.', selectDraft: 'Chagua rasimu ya kukagua.',
    correctAndApprove: 'Kagua chanzo, jaza sehemu zinazokosekana, kisha uidhinishe.', source: 'Chanzo',
    transcriptSource: 'Maandishi ya sauti', photoSource: 'Picha ya chanzo', approval: 'Idhinisha rekodi',
    reject: 'Kataa pendekezo', retrySync: 'Onyesha usawazishaji sasa', simOnly: 'Usawazishaji wa mfano tu · hakuna kupakia seva wala kusawazisha vifaa.',
    approveDone: 'Rekodi imeidhinishwa', another: 'Rekodi upakuaji mwingine', viewHistory: 'Tazama historia',
    filters: 'Vichujio', date: 'Tarehe', speciesFilter: 'Spishi', search: 'Tafuta chombo, jina au spishi', all: 'Zote', draftStatus: 'Zinasubiri ukaguzi',
    approvedStatus: 'Zimeidhinishwa', rejectedStatus: 'Zimekataliwa', noRecords: 'Hakuna rekodi zinazolingana na vichujio.',
    details: 'Maelezo ya upakuaji', history: 'Historia', amend: 'Rekebisha rekodi iliyoidhinishwa',
    amendmentReason: 'Sababu ya marekebisho · inahitajika', saveAmendment: 'Hifadhi marekebisho',
    amendmentSaved: 'Marekebisho yamehifadhiwa. Maelezo ya awali bado yako kwenye historia.',
    day: 'Leo', week: 'Siku 7 zilizopita', landings: 'Idadi ya upakuaji', weightLabel: 'Uzito wa samaki',
    valueLabel: 'Thamani ya mauzo iliyorekodiwa', pricesObserved: 'Bei zilizorekodiwa', missingPrices: 'Rekodi zisizo na bei kamili',
    bySpecies: 'Uzito kwa kundi la eneo', last7Days: 'Siku 7 zilizopita', unitPrices: 'Bei zilizoripotiwa kwa kilo', totalSaleObservations: 'Aina zenye jumla ya mauzo iliyorekodiwa', priceNote: 'Wastani wa bei zilizorekodiwa kwa kilo pekee; si bei ya soko.', summaryNote: 'Muhtasari hutumia rekodi zilizoidhinishwa pekee. Si makadirio ya uvuvi wote.',
    prototypeExport: 'Uhamishaji wa mfano', exportCsv: 'Pakua CSV', exportDone: 'CSV ya mfano imetayarishwa.',
    language: 'Lugha', english: 'English', swahili: 'Kiswahili', assignedSite: 'Eneo la mfano ulilogawiwa',
    connectivity: 'Muunganisho wa mfano', resetDemo: 'Weka upya data ya mfano', resetConfirm: 'Weka upya rekodi na mipangilio yote?',
    confirmReset: 'Ndiyo, weka upya', keepData: 'Hifadhi data yangu', resetDone: 'Data ya mfano imewekwa upya.',
    profile: 'Afisa wa mfano', deviceStatus: 'Hali ya kifaa na usawazishaji', localOnlyInfo: 'Rekodi hubaki kwenye simu hii. Udhibiti unaonyesha tu jinsi seva ya baadaye inavyoweza kufanya kazi.',
    pendingList: 'Rekodi zilizohifadhiwa zikisubiri ukaguzi', missingInfo: 'Inahitaji uthibitisho', noSummary: 'Bado hakuna rekodi zilizoidhinishwa kwa eneo hili.',
    unknownSpecies: 'Kundi la spishi halijulikani', amountUnknown: 'Bei haikurekodiwa', approveValidation: 'Jaza sehemu zinazohitajika kabla ya kuidhinisha.',
    voiceErrorGate: 'Kagua hitilafu ya mfano ya kilo 21. Maandishi yanasema kilo 12.',
    onlineSim: 'Washa · mfano', offlineSim: 'Zima · foleni ya ndani pekee', deviceUnknown: 'Inaangaliwa…',
    photoSuggestion: 'Pendekezo la mfano', none: 'Hakuna', noObservation: 'Hakuna uchunguzi ulioandikwa.',
    edit: 'Hariri', draftSaved: 'Rasimu imehifadhiwa kwenye simu hii.', languageInfo: 'Tafsiri za Kiingereza na Kiswahili ni za mfano na zinahitaji kukaguliwa.',
    fallbackSaved: 'Imehifadhiwa kwenye simu hii', status: 'Hali', priced: 'Bei imeandikwa', marketValue: 'Thamani iliyokokotolewa',
    approvedBy: 'Imeidhinishwa na', capturedBy: 'Imerekodiwa na', siteChanged: 'Eneo la mfano limebadilishwa.',
    photoNoInference: 'Picha ya samaki haitoi uzito, bei, wafanyakazi, au eneo la uvuvi.',
  },
} as const;

type CopyKey = keyof typeof COPY.en;

function makeEmptyCatch(): CatchDraft {
  return {
    id: makeId('CATCH'),
    localName: '',
    speciesGroup: '',
    weightKg: '',
    weightBasis: 'measured',
    priceBasis: 'unknown',
    priceAmount: '',
  };
}

function makeEmptyForm(site: string): LandingForm {
  return {
    site,
    landedAt: newLocalDateTime(),
    vessel: '',
    crewCount: '',
    gear: '',
    departureTime: '',
    returnTime: '',
    area: '',
    catchItems: [makeEmptyCatch()],
    observation: '',
  };
}

function paletteStyle(color: string) {
  return { color };
}

function imageSource(uri?: string) {
  if (!uri) return undefined;
  if (uri === 'prepared-demo') return require('../assets/images/demo-rabbitfish.jpg');
  return { uri };
}

function asCatchItems(drafts: CatchDraft[]): CatchItem[] {
  return drafts.map((draft) => ({
    id: draft.id,
    localName: draft.localName.trim(),
    speciesGroup: draft.speciesGroup.trim(),
    weightKg: Number(draft.weightKg) || 0,
    weightBasis: draft.weightBasis,
    priceBasis: draft.priceBasis,
    priceAmount: draft.priceBasis === 'unknown' ? null : Number(draft.priceAmount) || null,
    photoUri: draft.photoUri,
  }));
}

function createLocalRecord(form: LandingForm): LandingRecord | null {
  const landedAt = parseLocalDateTime(form.landedAt);
  if (!landedAt) return null;
  return {
    id: makeId('LANDING'),
    site: form.site,
    landedAt,
    vessel: form.vessel.trim(),
    crewCount: form.crewCount ? Number(form.crewCount) || null : null,
    gear: form.gear.trim(),
    departureTime: form.departureTime.trim(),
    returnTime: form.returnTime.trim(),
    area: form.area.trim(),
    catchItems: asCatchItems(form.catchItems),
    observation: form.observation.trim(),
    source: 'manual',
    photoUri: form.photoUri,
    status: 'draft',
    syncStatus: 'waiting',
    createdAt: new Date().toISOString(),
    history: [],
  };
}

function localDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={!disabled}
        testID={`input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        style={[
          styles.input,
          {
            backgroundColor: disabled ? colors.muted : colors.card,
            borderColor: colors.input,
            color: colors.foreground,
            minHeight: multiline ? 92 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );
}

function Action({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'quiet';
  disabled?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.primary, color: colors.primaryForeground, borderColor: colors.primary },
    secondary: { backgroundColor: colors.seaGlass, color: colors.deepSea, borderColor: colors.seaGlass },
    outline: { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
    danger: { backgroundColor: colors.dangerSoft, color: colors.destructive, borderColor: colors.dangerSoft },
    quiet: { backgroundColor: 'transparent', color: colors.primary, borderColor: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        void onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor, opacity: disabled ? 0.48 : pressed ? 0.78 : 1 },
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={palette.color} /> : null}
      <Text style={[styles.actionText, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

function Card({ children, colors, style }: { children: React.ReactNode; colors: Palette; style?: object }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, paletteStyle(colors.foreground)]}>{title}</Text>
      {aside ? <Text style={[styles.sectionAside, paletteStyle(colors.mutedForeground)]}>{aside}</Text> : null}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.deepSea : colors.card,
          borderColor: selected ? colors.deepSea : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function StateBadge({ label, status }: { label: string; status: 'approved' | 'draft' | 'rejected' | 'waiting' | 'simulated' }) {
  const colors = useColors();
  const palette = {
    approved: { backgroundColor: colors.seaGlass, color: colors.success },
    draft: { backgroundColor: colors.paleWarning, color: colors.warning },
    rejected: { backgroundColor: colors.dangerSoft, color: colors.destructive },
    waiting: { backgroundColor: colors.paleWarning, color: colors.warning },
    simulated: { backgroundColor: colors.seaGlass, color: colors.success },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, colors, accent }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; colors: Palette; accent?: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: accent ?? colors.seaGlass }]}>
        <Feather name={icon} size={17} color={colors.deepSea} />
      </View>
      <Text style={[styles.statValue, paletteStyle(colors.foreground)]}>{value}</Text>
      <Text style={[styles.statLabel, paletteStyle(colors.mutedForeground)]}>{label}</Text>
    </View>
  );
}

function AppRecordCard({
  record,
  onPress,
  language,
}: {
  record: LandingRecord;
  onPress: () => void;
  language: Language;
}) {
  const colors = useColors();
  const catchSummary = record.catchItems.map((item) => item.localName || item.speciesGroup || 'Unknown').filter(Boolean).join(' · ');
  const weight = record.catchItems.reduce((sum, item) => sum + item.weightKg, 0);
  const statusLabel = record.status === 'draft' ? COPY[language].draftStatus : record.status === 'approved' ? COPY[language].approvedStatus : COPY[language].rejectedStatus;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 }]}>
      <View style={styles.recordRowMain}>
        <View style={styles.recordRowTop}>
          <Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{record.vessel || 'Needs confirmation'}</Text>
          <StateBadge label={statusLabel} status={record.status} />
        </View>
        <Text style={[styles.recordCatch, paletteStyle(colors.mutedForeground)]}>{catchSummary || 'Unknown catch'} · {weight.toFixed(1)} kg</Text>
        <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{formatDateTime(record.landedAt, language)} · {record.site.replace(' · Kilifi BMU', '')}</Text>
      </View>
      <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
    </Pressable>
  );
}

function CatchEditor({
  item,
  index,
  language,
  onChange,
  onPhoto,
  onRemove,
}: {
  item: CatchDraft;
  index: number;
  language: Language;
  onChange: (patch: Partial<CatchDraft>) => void;
  onPhoto: (source: 'camera' | 'library') => void;
  onRemove?: () => void;
}) {
  const colors = useColors();
  const t = (key: CopyKey) => COPY[language][key];
  return (
    <View style={[styles.catchEditor, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.catchEditorHeading}>
        <Text style={[styles.catchEditorTitle, paletteStyle(colors.foreground)]}>{t('catchItems')} {index + 1}</Text>
        {onRemove ? (
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('remove')} style={styles.removeButton}>
            <Feather name="trash-2" size={17} color={colors.destructive} />
            <Text style={[styles.removeText, { color: colors.destructive }]}>{t('remove')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Input label={t('localName')} value={item.localName} onChangeText={(localName) => onChange({ localName })} placeholder="e.g. Changu" />
      <Input label={t('species')} value={item.speciesGroup} onChangeText={(speciesGroup) => onChange({ speciesGroup })} placeholder="Unknown is okay" />
      <Input label={t('weight')} value={item.weightKg} onChangeText={(weightKg) => onChange({ weightKg })} keyboardType="decimal-pad" placeholder="e.g. 12" />
      <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{t('weightBasis')}</Text>
      <View style={styles.chipRow}>
        {(['measured', 'estimated'] as const).map((basis) => (
          <ChoiceChip key={basis} label={basis === 'measured' ? t('measured') : t('estimated')} selected={item.weightBasis === basis} onPress={() => onChange({ weightBasis: basis })} />
        ))}
      </View>
      <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{t('priceBasis')}</Text>
      <View style={styles.chipRow}>
        {(['per_kg', 'total', 'unknown'] as const).map((basis) => (
          <ChoiceChip
            key={basis}
            label={basis === 'per_kg' ? t('perKg') : basis === 'total' ? t('totalSale') : t('noPrice')}
            selected={item.priceBasis === basis}
            onPress={() => onChange({ priceBasis: basis, priceAmount: basis === 'unknown' ? '' : item.priceAmount })}
          />
        ))}
      </View>
      {item.priceBasis !== 'unknown' ? (
        <Input label={t('amount')} value={item.priceAmount} onChangeText={(priceAmount) => onChange({ priceAmount })} keyboardType="decimal-pad" placeholder="e.g. 350" />
      ) : (
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{t('amountUnknown')}</Text>
      )}
      <View style={styles.buttonRow}>
        <View style={styles.flex}><Action label={t('camera')} icon="camera" variant="outline" onPress={() => onPhoto('camera')} /></View>
        <View style={styles.flex}><Action label={t('upload')} icon="upload" variant="outline" onPress={() => onPhoto('library')} /></View>
      </View>
      {item.photoUri ? <Image source={imageSource(item.photoUri)} style={[styles.catchPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" /> : null}
    </View>
  );
}

function RecordDetail({
  record,
  language,
  onUpdate,
  onPlay,
}: {
  record: LandingRecord;
  language: Language;
  onUpdate: (record: LandingRecord) => void;
  onPlay: (uri: string) => void;
}) {
  const colors = useColors();
  const t = (key: CopyKey) => COPY[language][key];
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [amendError, setAmendError] = useState('');
  const [draft, setDraft] = useState<LandingRecord>(record);
  useEffect(() => {
    if (!editing) setDraft(record);
  }, [record, editing]);
  const patchItem = (id: string, patch: Partial<CatchItem>) => setDraft((current) => ({
    ...current,
    catchItems: current.catchItems.map((item) => item.id === id ? { ...item, ...patch } : item),
  }));

  const saveAmendment = () => {
    if (!reason.trim()) return;
    const errors = validateLanding({ ...draft, status: 'approved' });
    if (errors.length) {
      setAmendError(errors[0]);
      return;
    }
    const previous = `${record.vessel}; ${record.catchItems.map((item) => `${item.localName} ${item.weightKg} kg, ${item.priceBasis === 'unknown' ? 'price unknown' : `KES ${item.priceAmount}${item.priceBasis === 'per_kg' ? '/kg' : ' total'}`}`).join(' · ')}`;
    onUpdate({
      ...draft,
      history: [{
        at: new Date().toISOString(),
        by: OFFICIAL_NAME,
        reason: reason.trim(),
        summary: `Previous values: ${previous}`,
      }, ...record.history],
    });
    setEditing(false);
    setReason('');
    setAmendError('');
  };
  const displayedCatchItems = editing ? draft.catchItems : record.catchItems;

  return (
    <View style={styles.stack}>
      <Card colors={colors}>
        <View style={styles.detailTitleRow}>
          <View style={styles.detailTitleText}>
            <Text style={[styles.cardTitle, paletteStyle(colors.foreground)]}>{record.vessel || t('missingInfo')}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{formatDateTime(record.landedAt, language)} · {record.site}</Text>
          </View>
          <StateBadge label={record.status === 'approved' ? t('approvedStatus') : record.status === 'draft' ? t('draftStatus') : t('rejectedStatus')} status={record.status} />
        </View>
        <View style={styles.inlineFacts}>
          <View><Text style={[styles.factLabel, paletteStyle(colors.mutedForeground)]}>{t('site')}</Text><Text style={[styles.factValue, paletteStyle(colors.foreground)]}>{record.site}</Text></View>
          <View><Text style={[styles.factLabel, paletteStyle(colors.mutedForeground)]}>{t('source')}</Text><Text style={[styles.factValue, paletteStyle(colors.foreground)]}>{record.source}</Text></View>
          {record.approvedBy ? <View><Text style={[styles.factLabel, paletteStyle(colors.mutedForeground)]}>{t('approvedBy')}</Text><Text style={[styles.factValue, paletteStyle(colors.foreground)]}>{record.approvedBy}</Text></View> : null}
        </View>
        {record.photoUri ? <Image source={imageSource(record.photoUri)} style={[styles.recordPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" /> : null}
        {record.transcript ? (
          <View style={[styles.transcriptBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.factLabel, paletteStyle(colors.mutedForeground)]}>{t('transcriptSource')}</Text>
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{record.transcript}</Text>
          </View>
        ) : null}
        {record.audioUri ? <Action label={t('playRecording')} icon="volume-2" variant="outline" onPress={() => onPlay(record.audioUri!)} /> : null}
        {displayedCatchItems.map((item) => (
          <View key={item.id} style={[styles.catchSummaryRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              {editing ? (
                <>
                  {displayedCatchItems.length > 1 ? <Action label={t('removeCatch')} icon="trash-2" variant="quiet" onPress={() => setDraft((current) => ({ ...current, catchItems: current.catchItems.filter((catchItem) => catchItem.id !== item.id) }))} /> : null}
                  <Input label={t('localName')} value={item.localName} onChangeText={(localName) => patchItem(item.id, { localName })} />
                  <Input label={t('species')} value={item.speciesGroup} onChangeText={(speciesGroup) => patchItem(item.id, { speciesGroup })} />
                  <Input label={t('weight')} value={String(item.weightKg || '')} onChangeText={(value) => patchItem(item.id, { weightKg: Number(value) || 0 })} keyboardType="decimal-pad" />
                  <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{t('priceBasis')}</Text>
                  <View style={styles.chipRow}>
                    {(['per_kg', 'total', 'unknown'] as const).map((basis) => (
                      <ChoiceChip key={basis} label={basis === 'per_kg' ? t('perKg') : basis === 'total' ? t('totalSale') : t('noPrice')} selected={item.priceBasis === basis} onPress={() => patchItem(item.id, { priceBasis: basis, priceAmount: basis === 'unknown' ? null : item.priceAmount })} />
                    ))}
                  </View>
                  {item.priceBasis !== 'unknown' ? <Input label={t('amount')} value={item.priceAmount === null ? '' : String(item.priceAmount)} onChangeText={(value) => patchItem(item.id, { priceAmount: Number(value) || null })} keyboardType="decimal-pad" /> : null}
                </>
              ) : (
                <>
                  <Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{item.localName || item.speciesGroup || t('missingInfo')}</Text>
                  <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{item.speciesGroup || t('unknownSpecies')} · {item.weightKg > 0 ? `${item.weightKg} kg · ${item.weightBasis}` : t('missingInfo')}</Text>
                  <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{item.priceBasis === 'unknown' || item.priceAmount === null ? t('amountUnknown') : item.priceBasis === 'per_kg' ? `KES ${item.priceAmount}/kg` : `KES ${item.priceAmount} total`}</Text>
                </>
              )}
            </View>
            {!editing && item.photoUri ? <Image source={imageSource(item.photoUri)} style={styles.thumb} resizeMode="cover" /> : null}
          </View>
        ))}
        {record.observation ? <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>Observation: {record.observation}</Text> : null}
        {record.status === 'approved' && !editing ? <Action label={t('amend')} icon="edit-3" variant="outline" onPress={() => { setDraft(record); setEditing(true); }} /> : null}
        {editing ? (
          <>
            <Action label={t('addCatch')} icon="plus" variant="secondary" onPress={() => setDraft((current) => ({
              ...current,
              catchItems: [...current.catchItems, { id: makeId('CATCH'), localName: '', speciesGroup: '', weightKg: 0, weightBasis: 'measured', priceBasis: 'unknown', priceAmount: null }],
            }))} />
            <Input label={t('amendmentReason')} value={reason} onChangeText={setReason} multiline placeholder="What was corrected, and why?" />
            {amendError ? <Text style={[styles.helperText, { color: colors.destructive }]}>{amendError}</Text> : null}
            <View style={styles.buttonRow}>
              <View style={styles.flex}><Action label={t('cancel')} variant="outline" onPress={() => { setEditing(false); setDraft(record); setAmendError(''); setReason(''); }} /></View>
              <View style={styles.flex}><Action label={t('saveAmendment')} icon="check" disabled={!reason.trim()} onPress={saveAmendment} /></View>
            </View>
          </>
        ) : null}
      </Card>
      <Card colors={colors}>
        <SectionTitle title={t('history')} />
        <View style={styles.historyLine}>
          <View style={[styles.historyDot, { backgroundColor: colors.primary }]} />
          <View style={styles.flex}>
            <Text style={[styles.historyTitle, paletteStyle(colors.foreground)]}>{record.status === 'approved' ? t('approvedStatus') : t('capturedBy')}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{formatDateTime(record.approvedAt ?? record.createdAt, language)} · {record.approvedBy ?? OFFICIAL_NAME}</Text>
          </View>
        </View>
        {record.history.map((event, index) => (
          <View key={`${event.at}-${index}`} style={styles.historyLine}>
            <View style={[styles.historyDot, { backgroundColor: colors.amber }]} />
            <View style={styles.flex}>
              <Text style={[styles.historyTitle, paletteStyle(colors.foreground)]}>{event.summary}</Text>
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{event.reason} · {event.by} · {formatDateTime(event.at, language)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.inlineFacts}>
          <StateBadge label={record.syncStatus === 'waiting' ? t('syncWaiting') : t('syncedDemo')} status={record.syncStatus} />
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{t('simOnly')}</Text>
        </View>
      </Card>
    </View>
  );
}

export default function MoaiApp() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [deviceInternet, setDeviceInternet] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>('today');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('choose');
  const [form, setForm] = useState<LandingForm>(() => makeEmptyForm(DEMO_SITES[0]));
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [recordingUri, setRecordingUri] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceTranscriptIsAi, setVoiceTranscriptIsAi] = useState(false);
  const [recording, setRecording] = useState(false);
  const [photoDraftUri, setPhotoDraftUri] = useState('');
  const [photoSuggestion, setPhotoSuggestion] = useState<SuggestSpeciesResponse | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [approvedRecentlyId, setApprovedRecentlyId] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useCallback((key: CopyKey) => COPY[data?.settings.language ?? 'en'][key], [data?.settings.language]);
  const siteRecords = useMemo(
    () => data?.records.filter((record) => record.site === data.settings.site) ?? [],
    [data],
  );
  const approvedSiteRecords = useMemo(() => siteRecords.filter((record) => record.status === 'approved'), [siteRecords]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        if (!parsed || !Array.isArray(parsed.records) || !parsed.settings) throw new Error('Saved demo data could not be read.');
        setData(parsed);
      } else {
        setData(makeDemoData());
      }
      setLocalSaved(true);
      setLoaded(true);
    }).catch((error: unknown) => {
      if (!active) return;
      setStorageError(error instanceof Error ? error.message : 'Local storage could not be read.');
      setData(makeDemoData());
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    setLocalSaved(false);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).then(() => {
      setStorageError('');
      setLocalSaved(true);
    }).catch((error: unknown) => {
      setStorageError(error instanceof Error ? error.message : 'Local storage could not be written.');
    });
  }, [data, loaded]);

  useEffect(() => {
    let active = true;
    Network.getNetworkStateAsync().then((state) => {
      if (active) setDeviceInternet(state.isInternetReachable ?? state.isConnected ?? null);
    }).catch(() => {
      if (active) setDeviceInternet(null);
    });
    const subscription = Network.addNetworkStateListener((state) => {
      setDeviceInternet(state.isInternetReachable ?? state.isConnected ?? null);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => current ? updater(current) : current);
  };
  const updateRecord = (id: string, updater: (record: LandingRecord) => LandingRecord) => {
    updateData((current) => ({
      ...current,
      records: current.records.map((record) => record.id === id ? updater(record) : record),
    }));
  };
  const addRecord = (record: LandingRecord) => {
    updateData((current) => ({ ...current, records: [record, ...current.records] }));
    setSelectedId(record.id);
  };
  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice((current) => current === message ? '' : current), 4200);
  };
  const playAudio = (uri: string) => {
    try {
      player.replace(uri);
      player.play();
    } catch {
      showNotice('This audio file could not be played on this device.');
    }
  };
  const choosePhoto = async (source: 'camera' | 'library', onChosen: (uri: string) => void) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showNotice('Camera access was not granted. You can still upload a photo or enter details.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showNotice('Photo access was not granted. You can still use the camera or enter details.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.65, base64: true };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const savedUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      onChosen(savedUri);
    } catch (error) {
      showNotice(error instanceof Error ? `Could not open photo: ${error.message}` : 'Could not open the photo.');
    }
  };

  const beginRecord = () => {
    setForm(makeEmptyForm(data?.settings.site ?? DEMO_SITES[0]));
    setFormError('');
    setPhotoDraftUri('');
      setPhotoSuggestion(null);
    setRecordingUri('');
    setVoiceTranscript('');
      setVoiceTranscriptIsAi(false);
    setCaptureMode('choose');
    setPage('record');
  };
  const saveManualDraft = () => {
    const record = createLocalRecord(form);
    if (!record) {
      setFormError('Enter a valid landing date and time in YYYY-MM-DD HH:MM format.');
      return;
    }
    const errors = validateLanding(record);
    if (errors.length) {
      setFormError(errors[0]);
      return;
    }
    addRecord(record);
    setFormError('');
    setPage('review');
    showNotice(t('draftSaved'));
  };
  const savePreparedVoice = () => {
    const record = aiService.makePreparedVoiceDraft(data?.settings.site ?? DEMO_SITES[0]);
    addRecord(record);
    setPage('review');
    showNotice('Prepared voice example added as a draft. Review the seeded 21 kg error.');
  };
  const saveRecordedVoiceDraft = () => {
    const now = new Date().toISOString();
    const record: LandingRecord = {
      id: makeId('VOICE'),
      site: data?.settings.site ?? DEMO_SITES[0],
      landedAt: parseLocalDateTime(newLocalDateTime()) ?? now,
      vessel: '',
      crewCount: null,
      gear: '',
      departureTime: '',
      returnTime: '',
      area: '',
      catchItems: [{
        id: makeId('CATCH'),
        localName: '',
        speciesGroup: '',
        weightKg: 0,
        weightBasis: 'measured',
        priceBasis: 'unknown',
        priceAmount: null,
      }],
      observation: '',
      source: 'voice',
      audioUri: recordingUri,
      transcript: voiceTranscript.trim(),
      aiTranscription: voiceTranscriptIsAi,
      status: 'draft',
      syncStatus: 'waiting',
      createdAt: now,
      history: [],
    };
    addRecord(record);
    setPage('review');
    showNotice('Voice note saved locally. Complete its fields during review.');
  };
  const savePhotoDraft = () => {
    if (!photoDraftUri) return;
    const now = new Date().toISOString();
    const record: LandingRecord = {
      id: makeId('PHOTO'),
      site: data?.settings.site ?? DEMO_SITES[0],
      landedAt: parseLocalDateTime(newLocalDateTime()) ?? now,
      vessel: '',
      crewCount: null,
      gear: '',
      departureTime: '',
      returnTime: '',
      area: '',
      catchItems: [{
        id: makeId('CATCH'),
        localName: '',
        speciesGroup: '',
        weightKg: 0,
        weightBasis: 'measured',
        priceBasis: 'unknown',
        priceAmount: null,
      }],
      observation: '',
      source: 'photo',
      photoUri: photoDraftUri,
      aiPhotoSuggestion: photoSuggestion ?? undefined,
      status: 'draft',
      syncStatus: 'waiting',
      createdAt: now,
      history: [],
    };
    addRecord(record);
    setPage('review');
    showNotice('Photo saved locally. Add vessel and catch details during review.');
  };
  const startVoiceRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showNotice('Microphone access was not granted. You can use the prepared voice example or enter details.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setRecordingUri('');
      setVoiceTranscript('');
      setVoiceTranscriptIsAi(false);
    } catch (error) {
      showNotice(error instanceof Error ? `Could not start recording: ${error.message}` : 'Could not start recording.');
    }
  };
  const stopVoiceRecording = async () => {
    try {
      await recorder.stop();
      setRecording(false);
      const sourceUri = recorder.uri ?? '';
      const directory = FileSystem.documentDirectory;
      if (sourceUri && directory) {
        const extension = sourceUri.split('.').pop()?.split('?')[0] || 'm4a';
        const durableUri = `${directory}moai-voice-${Date.now()}.${extension}`;
        await FileSystem.copyAsync({ from: sourceUri, to: durableUri });
        setRecordingUri(durableUri);
        setVoiceTranscript('');
        setVoiceTranscriptIsAi(false);
      } else {
        setRecordingUri(sourceUri);
      }
    } catch (error) {
      setRecording(false);
      showNotice(error instanceof Error ? `Could not save recording: ${error.message}` : 'Could not save recording.');
    }
  };
  const transcribeVoice = async () => {
    if (!recordingUri || transcribing) return;
    setTranscribing(true);
    try {
      const extension = recordingUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'm4a';
      const mimeType =
        extension === 'wav' ? 'audio/wav' :
        extension === 'mp3' ? 'audio/mpeg' :
        extension === 'webm' ? 'audio/webm' : 'audio/mp4';
      const audioBase64 = await FileSystem.readAsStringAsync(recordingUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await aiService.transcribeAudio({
        audioBase64,
        mimeType,
        filename: `recording.${extension.replace(/[^a-z0-9]/g, '') || 'm4a'}`,
      });
      setVoiceTranscript(result.transcript);
      setVoiceTranscriptIsAi(true);
      showNotice('AI transcription added as an editable draft. Check it against the saved recording.');
    } catch {
      showNotice(t('aiUnavailable'));
    } finally {
      setTranscribing(false);
    }
  };
  const analyzePhoto = async () => {
    if (!photoDraftUri || analyzingPhoto) return;
    setAnalyzingPhoto(true);
    try {
      const dataUri = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(photoDraftUri);
      const extension = photoDraftUri.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
      const mimeType = dataUri?.[1] ??
        (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
      const imageBase64 = dataUri?.[2] ?? await FileSystem.readAsStringAsync(photoDraftUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await aiService.analyzeImage({ imageBase64, mimeType });
      setPhotoSuggestion(result);
      showNotice('AI image suggestion added for review only. Confirm it against the photo.');
    } catch {
      showNotice(t('aiUnavailable'));
    } finally {
      setAnalyzingPhoto(false);
    }
  };
  const approveRecord = (record: LandingRecord) => {
    const errors = validateLanding(record);
    if (errors.length) {
      showNotice(`${t('approveValidation')} ${errors[0]}`);
      return;
    }
    if (record.seededVoiceError && record.catchItems[0]?.weightKg === 21) {
      showNotice(t('voiceErrorGate'));
      return;
    }
    const approvedAt = new Date().toISOString();
    updateRecord(record.id, (current) => ({
      ...current,
      status: 'approved',
      approvedBy: OFFICIAL_NAME,
      approvedAt,
      syncStatus: 'waiting',
      history: [{
        at: approvedAt,
        by: OFFICIAL_NAME,
        reason: 'Approved after human review',
        summary: 'Draft approved as one landing record.',
      }, ...current.history],
    }));
    setApprovedRecentlyId(record.id);
    setSelectedId('');
    showNotice(t('approveDone'));
  };
  const rejectRecord = (record: LandingRecord) => {
    updateRecord(record.id, (current) => ({
      ...current,
      status: 'rejected',
      history: [{
        at: new Date().toISOString(),
        by: OFFICIAL_NAME,
        reason: 'Official rejected the draft',
        summary: 'Draft suggestion rejected; no landing was added to approved totals.',
      }, ...current.history],
    }));
    setSelectedId('');
    showNotice('Suggestion rejected. It remains in My records for the audit trail.');
  };
  const syncNow = () => {
    if (!data?.settings.demoConnectivity) {
      showNotice('Turn on demo connectivity first. No data will leave this phone.');
      return;
    }
    const waitingCount = data.records.filter((record) => record.syncStatus === 'waiting').length;
    if (!waitingCount) {
      showNotice('There are no records waiting in the local demo queue.');
      return;
    }
    setSyncBusy(true);
    syncTimer.current = setTimeout(() => {
      updateData((current) => ({
        ...current,
        records: current.records.map((record) => record.syncStatus === 'waiting' ? { ...record, syncStatus: 'simulated' } : record),
      }));
      setSyncBusy(false);
      syncTimer.current = null;
      showNotice(`${waitingCount} record${waitingCount === 1 ? '' : 's'} marked synced in the demo only. No server upload occurred.`);
    }, 500);
  };
  const resetDemo = async () => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
      setSyncBusy(false);
    }
    const audioFiles = [...new Set([
      recordingUri,
      ...(data?.records.map((record) => record.audioUri ?? '') ?? []),
    ].filter((uri) => uri.startsWith('file://')))];
    await Promise.all(audioFiles.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
    updateData(() => makeDemoData());
    setSearchText('');
    setStatusFilter('all');
    setDateFilter('all');
    setSpeciesFilter('');
    setSelectedId('');
    setApprovedRecentlyId('');
    setRecordingUri('');
    setVoiceTranscript('');
    setResetConfirm(false);
    setPage('today');
    showNotice(t('resetDone'));
  };

  if (!loaded || !data) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>Opening local demo records…</Text>
      </View>
    );
  }

  const language = data.settings.language;
  const activeT = (key: CopyKey) => COPY[language][key];
  const allCurrentDrafts = siteRecords.filter((record) => record.status === 'draft');
  const approvedRecently = siteRecords.find((record) => record.id === approvedRecentlyId && record.status === 'approved');
  const selectedReview = allCurrentDrafts.find((record) => record.id === selectedId)
    ?? (approvedRecently ? undefined : allCurrentDrafts[0]);
  const todayKey = nairobiDayKey(new Date());
  const approvedTodayRecords = approvedSiteRecords.filter((record) => nairobiDayKey(record.landedAt) === todayKey);
  const todayWeight = approvedTodayRecords.reduce((sum, record) => sum + record.catchItems.reduce((total, item) => total + item.weightKg, 0), 0);
  const waitingCount = siteRecords.filter((record) => record.syncStatus === 'waiting').length;
  const filteredRecords = siteRecords.filter((record) => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const search = searchText.trim().toLocaleLowerCase();
    const matchesSearch = !search || [record.vessel, record.site, ...record.catchItems.flatMap((item) => [item.localName, item.speciesGroup])].join(' ').toLocaleLowerCase().includes(search);
    const matchesDate = dateFilter === 'all'
      || (dateFilter === 'today' && nairobiDayKey(record.landedAt) === todayKey)
      || (dateFilter === 'week' && new Date(record.landedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000);
    const matchesSpecies = !speciesFilter || record.catchItems.some((item) => (item.localName || item.speciesGroup) === speciesFilter);
    return matchesStatus && matchesSearch && matchesDate && matchesSpecies;
  });
  const speciesOptions = [...new Set(siteRecords.flatMap((record) => record.catchItems.map((item) => item.localName || item.speciesGroup).filter(Boolean)))];

  const updateForm = (patch: Partial<LandingForm>) => setForm((current) => ({ ...current, ...patch }));
  const updateFormCatch = (id: string, patch: Partial<CatchDraft>) => setForm((current) => ({
    ...current,
    catchItems: current.catchItems.map((item) => item.id === id ? { ...item, ...patch } : item),
  }));

  const currentPageTitle: Record<Page, string> = {
    today: activeT('today'),
    record: activeT('recordLanding'),
    review: activeT('reviewQueue'),
    records: activeT('records'),
    summary: activeT('summary'),
    settings: activeT('settings'),
  };
  const contentTop = Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top + 8;
  const activeCountToday = String(approvedTodayRecords.length);

  const renderToday = () => (
    <View style={styles.stack}>
      <View style={[styles.heroBlock, { backgroundColor: colors.deepSea }]}>
        <Text style={[styles.heroKicker, { color: colors.seaGlass }]}>{BMU_NAME.toUpperCase()}</Text>
        <Text style={[styles.heroName, { color: colors.primaryForeground }]}>{OFFICIAL_NAME}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.seaGlass }]}>{activeT('official')} · {data.settings.site.replace(' · Kilifi BMU', '')}</Text>
        <View style={[styles.heroDemoLabel, { backgroundColor: colors.seaGlass }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.heroDemoText, { color: colors.deepSea }]}>{activeT('demo')}</Text>
        </View>
      </View>

      <View style={styles.networkSummary}>
        <View style={styles.networkLine}>
          <Feather name={deviceInternet === false ? 'wifi-off' : 'wifi'} size={15} color={deviceInternet === false ? colors.warning : colors.success} />
          <Text style={[styles.networkText, paletteStyle(colors.foreground)]}>{activeT('actualNetwork')}: {deviceInternet === null ? activeT('deviceUnknown') : deviceInternet ? activeT('available') : activeT('unavailable')}</Text>
        </View>
        <View style={styles.networkLine}>
          <Feather name="refresh-cw" size={15} color={data.settings.demoConnectivity ? colors.success : colors.warning} />
          <Text style={[styles.networkText, paletteStyle(colors.foreground)]}>{activeT('demoSync')}: {data.settings.demoConnectivity ? activeT('onlineSim') : activeT('offlineSim')}</Text>
        </View>
        {storageError ? <Text style={[styles.storageError, { color: colors.destructive }]}>{activeT('saveError')}: {storageError}</Text> : null}
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={activeT('approvedToday')} value={activeCountToday} icon="check-circle" colors={colors} />
        <StatCard label={activeT('awaitingReview')} value={String(allCurrentDrafts.length)} icon="clock" colors={colors} accent={colors.paleWarning} />
        <StatCard label={activeT('waitingSync')} value={String(waitingCount)} icon="upload-cloud" colors={colors} accent={colors.sand} />
        <StatCard label={activeT('catchWeight')} value={`${todayWeight.toFixed(1)} kg`} icon="anchor" colors={colors} />
      </View>

      <Pressable onPress={beginRecord} testID="record-a-landing" accessibilityRole="button" style={({ pressed }) => [styles.primaryHeroAction, { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 }]}>
        <View style={[styles.actionIconCircle, { backgroundColor: colors.seaGlass }]}><Feather name="plus" size={23} color={colors.deepSea} /></View>
        <View style={styles.actionTitleWrap}>
          <Text style={[styles.primaryHeroTitle, { color: colors.primaryForeground }]}>{activeT('recordLanding')}</Text>
          <Text style={[styles.primaryHeroSubtitle, { color: colors.seaGlass }]}>{activeT('quickTip')}</Text>
        </View>
        <Feather name="arrow-up-right" size={20} color={colors.primaryForeground} />
      </Pressable>

      <Card colors={colors}>
        <View style={styles.syncCardHeader}>
          <View style={styles.flex}>
            <SectionTitle title={activeT('deviceStatus')} />
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('localOnlyInfo')}</Text>
          </View>
          <Pressable onPress={() => setPage('settings')} accessibilityRole="button" accessibilityLabel={activeT('settings')} style={styles.settingsIcon}>
            <Feather name="settings" size={19} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.syncStatusRow}>
          <View style={styles.flex}>
            <Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{localSaved ? activeT('savedPhone') : storageError ? activeT('saveError') : activeT('saving')}</Text>
            <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{activeT('waitingSync')}: {waitingCount}</Text>
          </View>
          <StateBadge label={localSaved ? activeT('locallySaved') : activeT('saving')} status={localSaved ? 'simulated' : 'waiting'} />
        </View>
        <Text style={[styles.syncDisclosure, paletteStyle(colors.mutedForeground)]}>{activeT('simOnly')}</Text>
        {waitingCount > 0 ? <Action label={syncBusy ? 'Working…' : activeT('retrySync')} icon="refresh-cw" variant="outline" disabled={syncBusy} onPress={syncNow} /> : null}
      </Card>

      {allCurrentDrafts.length > 0 ? (
        <View style={styles.stackTight}>
          <SectionTitle title={activeT('pendingList')} aside={`${allCurrentDrafts.length}`} />
          {allCurrentDrafts.slice(0, 2).map((record) => (
            <AppRecordCard key={record.id} record={record} language={language} onPress={() => { setSelectedId(record.id); setPage('review'); }} />
          ))}
        </View>
      ) : null}
      <Text style={[styles.prototypeFootnote, paletteStyle(colors.mutedForeground)]}>MOAI BMU · {activeT('demo')} · Local prototype data</Text>
    </View>
  );

  const renderRecord = () => (
    <View style={styles.stack}>
      {captureMode === 'choose' ? (
        <>
          <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('recordMethod')}</Text>
          <Text style={[styles.bodyText, paletteStyle(colors.mutedForeground)]}>{activeT('quickTip')}</Text>
          {([
            { mode: 'details' as const, title: activeT('enterDetails'), description: activeT('shortForm'), icon: 'edit-3' as const },
            { mode: 'voice' as const, title: activeT('voiceReport'), description: activeT('voiceNote'), icon: 'mic' as const },
            { mode: 'photo' as const, title: activeT('photoCatch'), description: activeT('photoNote'), icon: 'camera' as const },
          ]).map((item) => (
            <Pressable key={item.mode} onPress={() => setCaptureMode(item.mode)} accessibilityRole="button" style={({ pressed }) => [styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
              <View style={[styles.methodIcon, { backgroundColor: colors.seaGlass }]}><Feather name={item.icon} size={21} color={colors.deepSea} /></View>
              <View style={styles.flex}>
                <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{item.title}</Text>
                <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
          <View style={[styles.noteBox, { backgroundColor: colors.seaGlass }]}>
            <Feather name="map-pin" size={17} color={colors.deepSea} />
            <Text style={[styles.noteText, { color: colors.deepSea }]}>{activeT('site')}: {data.settings.site}</Text>
          </View>
        </>
      ) : null}

      {captureMode === 'details' ? (
        <>
          <Pressable onPress={() => setCaptureMode('choose')} style={styles.backRow}><Feather name="arrow-left" size={17} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>{activeT('cancel')}</Text></Pressable>
          <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('enterDetails')}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('site')}: {form.site} · EAT (Africa/Nairobi)</Text>
          <Input label={activeT('dateTime')} value={form.landedAt} onChangeText={(landedAt) => updateForm({ landedAt })} placeholder="YYYY-MM-DDTHH:MM" />
          <Input label={activeT('vessel')} value={form.vessel} onChangeText={(vessel) => updateForm({ vessel })} placeholder="e.g. KLF 104" />
          <View style={styles.twoInputs}>
            <View style={styles.flex}><Input label={activeT('crew')} value={form.crewCount} onChangeText={(crewCount) => updateForm({ crewCount })} keyboardType="numeric" placeholder="Optional" /></View>
            <View style={styles.flex}><Input label={activeT('gear')} value={form.gear} onChangeText={(gear) => updateForm({ gear })} placeholder="Optional" /></View>
          </View>
          <View style={styles.twoInputs}>
            <View style={styles.flex}><Input label={activeT('departure')} value={form.departureTime} onChangeText={(departureTime) => updateForm({ departureTime })} placeholder="Optional" /></View>
            <View style={styles.flex}><Input label={activeT('returnTime')} value={form.returnTime} onChangeText={(returnTime) => updateForm({ returnTime })} placeholder="Optional" /></View>
          </View>
          <Input label={activeT('area')} value={form.area} onChangeText={(area) => updateForm({ area })} placeholder="Optional · broad area only" />
          <SectionTitle title={activeT('catchItems')} aside="One landing can have several catch items" />
          {form.catchItems.map((item, index) => (
            <CatchEditor
              key={item.id}
              item={item}
              index={index}
              language={language}
              onChange={(patch) => updateFormCatch(item.id, patch)}
              onPhoto={(source) => choosePhoto(source, (photoUri) => updateFormCatch(item.id, { photoUri }))}
              onRemove={form.catchItems.length > 1 ? () => updateForm({ catchItems: form.catchItems.filter((catchItem) => catchItem.id !== item.id) }) : undefined}
            />
          ))}
          <Action label={activeT('addCatch')} icon="plus" variant="secondary" onPress={() => updateForm({ catchItems: [...form.catchItems, makeEmptyCatch()] })} />
          <Input label={activeT('observation')} value={form.observation} onChangeText={(observation) => updateForm({ observation })} multiline placeholder="Unusual catch, market disruption, or other context" />
          {form.photoUri ? <Image source={imageSource(form.photoUri)} style={[styles.recordPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" /> : null}
          {formError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text> : null}
          <Action label={activeT('saveDraft')} icon="save" onPress={saveManualDraft} testID="save-landing-draft" />
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>Drafts stay separate from approved records. You can approve after review.</Text>
        </>
      ) : null}

      {captureMode === 'voice' ? (
        <>
          <Pressable onPress={() => setCaptureMode('choose')} style={styles.backRow}><Feather name="arrow-left" size={17} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>{activeT('cancel')}</Text></Pressable>
          <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('voiceReport')}</Text>
          <Card colors={colors}>
            <View style={styles.voiceHeader}>
              <View style={[styles.voiceIcon, { backgroundColor: recording ? colors.dangerSoft : colors.seaGlass }]}>
                <Feather name={recording ? 'radio' : 'mic'} size={21} color={recording ? colors.destructive : colors.deepSea} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{recording ? 'Recording on this phone' : 'Voice note'}</Text>
                <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('realVoiceNote')}</Text>
              </View>
            </View>
            {recording ? (
              <Action label={activeT('stopRecording')} icon="square" variant="danger" onPress={stopVoiceRecording} />
            ) : (
              <Action label={activeT('startRecording')} icon="mic" onPress={startVoiceRecording} />
            )}
            {recordingUri ? (
              <View style={styles.stackTight}>
                <Action label={activeT('playRecording')} icon="volume-2" variant="outline" onPress={() => playAudio(recordingUri)} />
                <Action
                  label={activeT('deleteRecording')}
                  icon="trash-2"
                  variant="quiet"
                  onPress={async () => {
                    try {
                      player.pause();
                      if (recordingUri.startsWith('file://')) await FileSystem.deleteAsync(recordingUri, { idempotent: true });
                      setRecordingUri('');
                      setVoiceTranscript('');
                      setVoiceTranscriptIsAi(false);
                    } catch (error) {
                      showNotice(error instanceof Error ? `Could not delete the voice note: ${error.message}` : 'Could not delete the voice note.');
                    }
                  }}
                />
              </View>
            ) : null}
          </Card>
          <Action
            label={transcribing ? activeT('transcribingAi') : activeT('transcribeAi')}
            icon={transcribing ? 'loader' : 'zap'}
            variant="outline"
            disabled={!recordingUri || transcribing}
            onPress={transcribeVoice}
          />
          {voiceTranscriptIsAi ? <Text style={[styles.helperText, paletteStyle(colors.warning)]}>{activeT('aiTranscriptReview')}</Text> : null}
          <Input label={activeT('transcript')} value={voiceTranscript} onChangeText={setVoiceTranscript} multiline placeholder="No transcript yet. Type details manually or request a server transcription." />
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('aiMediaNote')}</Text>
          <Action label={activeT('createVoiceDraft')} icon="file-plus" variant="secondary" disabled={!recordingUri} onPress={saveRecordedVoiceDraft} />
          <View style={[styles.sampleBox, { backgroundColor: colors.paleWarning, borderColor: colors.sand }]}>
            <View style={styles.sampleBoxTitle}><Feather name="alert-triangle" size={17} color={colors.warning} /><Text style={[styles.sampleTitle, { color: colors.warning }]}>{activeT('seededError')}</Text></View>
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>“{activeT('sampleVoiceText')}”</Text>
            <Action label={activeT('sampleVoice')} icon="play-circle" variant="outline" onPress={savePreparedVoice} />
          </View>
        </>
      ) : null}

      {captureMode === 'photo' ? (
        <>
          <Pressable onPress={() => setCaptureMode('choose')} style={styles.backRow}><Feather name="arrow-left" size={17} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>{activeT('cancel')}</Text></Pressable>
          <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('photoCatch')}</Text>
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Action label={activeT('camera')} icon="camera" onPress={() => choosePhoto('camera', (uri) => { setPhotoDraftUri(uri); setPhotoSuggestion(null); })} /></View>
            <View style={styles.flex}><Action label={activeT('upload')} icon="upload" variant="outline" onPress={() => choosePhoto('library', (uri) => { setPhotoDraftUri(uri); setPhotoSuggestion(null); })} /></View>
          </View>
          {photoDraftUri ? (
            <Card colors={colors}>
              <Image source={imageSource(photoDraftUri)} style={[styles.recordPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" />
              <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{activeT('photoSource')}</Text>
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('arbitraryPhotoNote')}</Text>
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('photoNoInference')}</Text>
              <Action
                label={analyzingPhoto ? activeT('analyzingImageAi') : activeT('suggestSpeciesAi')}
                icon={analyzingPhoto ? 'loader' : 'zap'}
                variant="outline"
                disabled={analyzingPhoto}
                onPress={analyzePhoto}
              />
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('aiMediaNote')}</Text>
              {photoSuggestion ? (
                <View style={[styles.warningBox, { backgroundColor: colors.paleWarning, borderColor: colors.sand }]}>
                  <Feather name="alert-triangle" size={18} color={colors.warning} />
                  <View style={styles.flex}>
                    <Text style={[styles.warningText, { color: colors.warning }]}>{activeT('aiPhotoLabel')}</Text>
                    <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>
                      {[photoSuggestion.localName, photoSuggestion.speciesGroup].filter(Boolean).join(' · ') || activeT('noClearSpecies')}
                    </Text>
                    <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
                      {activeT('aiConfidence')}: {photoSuggestion.confidence} · {photoSuggestion.explanation}
                    </Text>
                  </View>
                </View>
              ) : null}
              <Action label={activeT('createPhotoDraft')} icon="file-plus" onPress={savePhotoDraft} />
            </Card>
          ) : null}
          <View style={[styles.sampleBox, { backgroundColor: colors.seaGlass, borderColor: colors.border }]}>
            <Text style={[styles.methodTitle, paletteStyle(colors.deepSea)]}>{activeT('preparedPhoto')}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.deepSea)]}>{activeT('preparedImageNote')}</Text>
            <Image source={require('../assets/images/demo-rabbitfish.jpg')} style={[styles.recordPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" />
            <Text style={[styles.helperText, paletteStyle(colors.deepSea)]}>{activeT('photoNoInference')}</Text>
            <Action
              label={activeT('preparedPhoto')}
              icon="image"
              variant="outline"
              onPress={() => {
                const record = aiService.makePreparedPhotoDraft(data.settings.site);
                addRecord(record);
                setPage('review');
                showNotice('Prepared image suggestion added as a draft. Confirm or correct the species.');
              }}
            />
          </View>
        </>
      ) : null}
    </View>
  );

  const renderReview = () => (
    <View style={styles.stack}>
      {approvedRecently ? (
        <Card colors={colors}>
          <View style={styles.detailTitleRow}>
            <View style={styles.detailTitleText}>
              <Text style={[styles.cardTitle, paletteStyle(colors.foreground)]}>{activeT('approveDone')}</Text>
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
                {approvedRecently.vessel} · {formatDateTime(approvedRecently.approvedAt ?? approvedRecently.createdAt, language)}
              </Text>
            </View>
            <StateBadge label={activeT('approvedStatus')} status="approved" />
          </View>
          <View style={[styles.historyLine, { borderTopColor: colors.border }]}>
            <View style={[styles.historyDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>
              {approvedRecently.catchItems.length} catch item{approvedRecently.catchItems.length === 1 ? '' : 's'} · one landing · {approvedRecently.catchItems.reduce((sum, item) => sum + item.weightKg, 0)} kg
            </Text>
          </View>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
            {activeT('valueLabel')}: {recordSaleValue(approvedRecently) === null ? activeT('amountUnknown') : `KES ${recordSaleValue(approvedRecently)?.toLocaleString('en-KE')}`}
          </Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
            {approvedRecently.syncStatus === 'waiting' ? activeT('syncWaiting') : activeT('syncedDemo')} · {approvedRecently.approvedBy ?? OFFICIAL_NAME}
          </Text>
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Action label={activeT('viewHistory')} icon="clock" variant="outline" onPress={() => { setSelectedId(approvedRecently.id); setPage('records'); }} /></View>
            <View style={styles.flex}><Action label={activeT('another')} icon="plus" onPress={beginRecord} /></View>
          </View>
        </Card>
      ) : null}
      <View style={[styles.queueHeader, { backgroundColor: colors.seaGlass }]}>
        <View style={[styles.queueCountCircle, { backgroundColor: colors.deepSea }]}><Text style={[styles.queueCount, { color: colors.primaryForeground }]}>{allCurrentDrafts.length}</Text></View>
        <View style={styles.flex}>
          <Text style={[styles.methodTitle, paletteStyle(colors.deepSea)]}>{activeT('reviewQueue')}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.deepSea)]}>{activeT('correctAndApprove')}</Text>
        </View>
      </View>
      {allCurrentDrafts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalQueue}>
          {allCurrentDrafts.map((record) => (
            <Pressable key={record.id} onPress={() => setSelectedId(record.id)} accessibilityRole="button" style={[styles.queueChip, { backgroundColor: selectedReview?.id === record.id ? colors.deepSea : colors.card, borderColor: colors.border }]}>
              <Text style={[styles.queueChipTitle, { color: selectedReview?.id === record.id ? colors.primaryForeground : colors.foreground }]}>{record.vessel || 'Needs confirmation'}</Text>
              <Text style={[styles.queueChipSub, { color: selectedReview?.id === record.id ? colors.seaGlass : colors.mutedForeground }]}>{record.source} · {record.catchItems[0]?.localName || 'Unknown catch'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Card colors={colors}>
          <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{activeT('noPending')}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>New manual, voice, and photo records appear here until an official makes a decision.</Text>
          <Action label={activeT('recordLanding')} icon="plus" onPress={beginRecord} />
        </Card>
      )}
      {selectedReview ? (
        <ReviewEditor
          record={selectedReview}
          language={language}
          colors={colors}
          onChange={(next) => updateRecord(selectedReview.id, () => next)}
          onApprove={() => approveRecord(selectedReview)}
          onReject={() => rejectRecord(selectedReview)}
          onSave={() => showNotice(activeT('draftSaved'))}
          onPlay={playAudio}
        />
      ) : null}
      <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>A landing record is one boat return. Several species lines still count as one landing.</Text>
    </View>
  );

  const renderRecords = () => {
    const selected = selectedId ? siteRecords.find((record) => record.id === selectedId) : undefined;
    return (
      <View style={styles.stack}>
        {selected ? (
          <>
            <Pressable onPress={() => setSelectedId('')} style={styles.backRow}><Feather name="arrow-left" size={17} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>{activeT('records')}</Text></Pressable>
            <SectionTitle title={activeT('details')} />
            <RecordDetail
              key={selected.id}
              record={selected}
              language={language}
              onPlay={playAudio}
              onUpdate={(next) => {
                updateRecord(selected.id, () => next);
                showNotice(activeT('amendmentSaved'));
              }}
            />
          </>
        ) : (
          <>
            <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('records')}</Text>
            <Input label={activeT('search')} value={searchText} onChangeText={setSearchText} placeholder="Vessel, fish name, species" />
            <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{activeT('filters')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {([
                ['all', activeT('all')],
                ['approved', activeT('approvedStatus')],
                ['draft', activeT('draftStatus')],
                ['rejected', activeT('rejectedStatus')],
              ] as [StatusFilter, string][]).map(([value, label]) => (
                <ChoiceChip key={value} label={label} selected={statusFilter === value} onPress={() => setStatusFilter(value)} />
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{activeT('date')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {([
                ['all', activeT('all')],
                ['today', activeT('day')],
                ['week', activeT('week')],
              ] as [DateFilter, string][]).map(([value, label]) => (
                <ChoiceChip key={value} label={label} selected={dateFilter === value} onPress={() => setDateFilter(value)} />
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{activeT('speciesFilter')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <ChoiceChip label={activeT('all')} selected={!speciesFilter} onPress={() => setSpeciesFilter('')} />
              {speciesOptions.map((species) => (
                <ChoiceChip key={species} label={species} selected={speciesFilter === species} onPress={() => setSpeciesFilter(species)} />
              ))}
            </ScrollView>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{filteredRecords.length} records · {data.settings.site}</Text>
            {filteredRecords.length ? (
              filteredRecords.map((record) => (
                <View key={record.id} style={styles.recordCardWrap}>
                  <AppRecordCard record={record} language={language} onPress={() => setSelectedId(record.id)} />
                  <View style={styles.recordSyncLine}>
                    <Feather name={record.syncStatus === 'waiting' ? 'cloud-off' : 'check'} size={13} color={record.syncStatus === 'waiting' ? colors.warning : colors.success} />
                    <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{record.syncStatus === 'waiting' ? activeT('syncWaiting') : activeT('syncedDemo')}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Card colors={colors}><Text style={[styles.bodyText, paletteStyle(colors.mutedForeground)]}>{activeT('noRecords')}</Text></Card>
            )}
          </>
        )}
      </View>
    );
  };

  const renderSummary = () => {
    const now = Date.now();
    const weekRecords = approvedSiteRecords.filter((record) => {
      const time = new Date(record.landedAt).getTime();
      return time >= now - 7 * 24 * 60 * 60 * 1000 && time <= now;
    });
    const todayRecords = approvedSiteRecords.filter((record) => nairobiDayKey(record.landedAt) === todayKey);
    const calcStats = (records: LandingRecord[]) => {
      const allItems = records.flatMap((record) => record.catchItems);
      const weights = allItems.reduce((sum, item) => sum + item.weightKg, 0);
      const knownValues = allItems.map(catchItemValue).filter((value): value is number => value !== null);
      const value = knownValues.reduce((sum, amount) => sum + amount, 0);
      const pricedCatchItems = allItems.filter((item) => item.priceBasis !== 'unknown' && item.priceAmount !== null).length;
      const missingPriceRecords = records.filter((record) => record.catchItems.some((item) => item.priceBasis === 'unknown' || item.priceAmount === null)).length;
      return { landings: records.length, weights, value, pricedCatchItems, missingPriceRecords, allItems };
    };
    const dayStats = calcStats(todayRecords);
    const weekStats = calcStats(weekRecords);
    const grouped = new Map<string, number>();
    weekStats.allItems.forEach((item) => {
      const label = item.localName || item.speciesGroup || activeT('unknownSpecies');
      grouped.set(label, (grouped.get(label) ?? 0) + item.weightKg);
    });
    const groups = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
    const unitPriceGroups = new Map<string, { total: number; count: number }>();
    weekStats.allItems.forEach((item) => {
      if (item.priceBasis !== 'per_kg' || item.priceAmount === null) return;
      const label = item.localName || item.speciesGroup || activeT('unknownSpecies');
      const group = unitPriceGroups.get(label) ?? { total: 0, count: 0 };
      group.total += item.priceAmount;
      group.count += 1;
      unitPriceGroups.set(label, group);
    });
    const unitPriceRows = [...unitPriceGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const totalSaleObservations = weekStats.allItems.filter((item) => item.priceBasis === 'total' && item.priceAmount !== null).length;
    const shareCsv = async () => {
      try {
        const csv = toCsv(approvedSiteRecords);
        if (Platform.OS === 'web') {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `moai-bmu-prototype-${nairobiDayKey(new Date())}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          const directory = FileSystem.cacheDirectory;
          if (!directory) throw new Error('A temporary export folder is not available on this phone.');
          const uri = `${directory}moai-bmu-prototype-export.csv`;
          await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: activeT('prototypeExport') });
          } else {
            showNotice(`CSV saved to the phone cache: ${uri}`);
            return;
          }
        }
        showNotice(activeT('exportDone'));
      } catch (error) {
        showNotice(error instanceof Error ? `Export failed: ${error.message}` : 'CSV export failed.');
      }
    };
    const summarySection = (label: string, stats: ReturnType<typeof calcStats>) => (
      <Card colors={colors}>
        <SectionTitle title={label} />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryMetric}><Text style={[styles.summaryValue, paletteStyle(colors.foreground)]}>{stats.landings}</Text><Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('landings')}</Text></View>
          <View style={styles.summaryMetric}><Text style={[styles.summaryValue, paletteStyle(colors.foreground)]}>{stats.weights.toFixed(1)} kg</Text><Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('weightLabel')}</Text></View>
          <View style={styles.summaryMetric}><Text style={[styles.summaryValue, paletteStyle(colors.foreground)]}>{stats.value > 0 ? `KES ${Math.round(stats.value).toLocaleString('en-KE')}` : '—'}</Text><Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('valueLabel')}</Text></View>
        </View>
        <View style={[styles.summaryFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('pricesObserved')}: {stats.pricedCatchItems}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('missingPrices')}: {stats.missingPriceRecords}</Text>
        </View>
      </Card>
    );
    return (
      <View style={styles.stack}>
        <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('summary')}</Text>
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{data.settings.site}</Text>
        {summarySection(activeT('day'), dayStats)}
        {summarySection(activeT('week'), weekStats)}
        <Card colors={colors}>
          <SectionTitle title={activeT('bySpecies')} aside={activeT('last7Days')} />
          {groups.length ? groups.map(([label, weight]) => (
            <View key={label} style={[styles.speciesRow, { borderBottomColor: colors.border }]}>
              <View style={styles.flex}><Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{label}</Text><Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{weekStats.weights ? `${Math.round(weight / weekStats.weights * 100)}% of recorded kg` : ''}</Text></View>
              <Text style={[styles.weightStrong, paletteStyle(colors.deepSea)]}>{weight.toFixed(1)} kg</Text>
            </View>
          )) : <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('noSummary')}</Text>}
        </Card>
        <Card colors={colors}>
          <SectionTitle title={activeT('pricesObserved')} aside={activeT('last7Days')} />
          <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{activeT('unitPrices')}</Text>
          {unitPriceRows.length ? unitPriceRows.map(([label, values]) => (
            <View key={label} style={[styles.speciesRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{label}</Text>
              <Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>Avg KES {Math.round(values.total / values.count)}/kg · {values.count} obs.</Text>
            </View>
          )) : <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('noSummary')}</Text>}
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
            {activeT('totalSaleObservations')}: {totalSaleObservations}
          </Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('priceNote')}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('priceNote')}</Text>
        </Card>
        <Card colors={colors}>
          <SectionTitle title={activeT('pendingList')} />
          <View style={[styles.summaryFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{activeT('awaitingReview')}: {allCurrentDrafts.length}</Text>
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{activeT('waitingSync')}: {waitingCount}</Text>
          </View>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('simOnly')}</Text>
        </Card>
        <View style={[styles.noteBox, { backgroundColor: colors.paleWarning }]}>
          <Feather name="info" size={17} color={colors.warning} />
          <Text style={[styles.noteText, { color: colors.warning }]}>{activeT('summaryNote')}</Text>
        </View>
        <Card colors={colors}>
          <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{activeT('prototypeExport')}</Text>
          <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>Includes approved records for this site. One row per catch item; record IDs link catch lines to a single landing.</Text>
          <Action label={activeT('exportCsv')} icon="download" variant="secondary" onPress={shareCsv} />
        </Card>
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.stack}>
      <Text style={[styles.screenLead, paletteStyle(colors.foreground)]}>{activeT('profile')}</Text>
      <Card colors={colors}>
        <View style={styles.profileRow}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.deepSea }]}><Text style={[styles.profileInitials, { color: colors.primaryForeground }]}>MA</Text></View>
          <View style={styles.flex}>
            <Text style={[styles.methodTitle, paletteStyle(colors.foreground)]}>{OFFICIAL_NAME}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{BMU_NAME} · {activeT('official')}</Text>
          </View>
        </View>
      </Card>
      <Card colors={colors}>
        <SectionTitle title={activeT('language')} />
        <View style={styles.buttonRow}>
          <View style={styles.flex}><ChoiceChip label={activeT('english')} selected={language === 'en'} onPress={() => updateData((current) => ({ ...current, settings: { ...current.settings, language: 'en' } }))} /></View>
          <View style={styles.flex}><ChoiceChip label={activeT('swahili')} selected={language === 'sw'} onPress={() => updateData((current) => ({ ...current, settings: { ...current.settings, language: 'sw' } }))} /></View>
        </View>
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('languageInfo')}</Text>
      </Card>
      <Card colors={colors}>
        <SectionTitle title={activeT('assignedSite')} />
        {DEMO_SITES.map((site) => (
          <Pressable key={site} onPress={() => { updateData((current) => ({ ...current, settings: { ...current.settings, site } })); showNotice(activeT('siteChanged')); }} style={[styles.siteOption, { borderBottomColor: colors.border }]}>
            <View style={styles.flex}><Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{site.split(' · ')[0]}</Text><Text style={[styles.recordMeta, paletteStyle(colors.mutedForeground)]}>{site.split(' · ')[1]}</Text></View>
            <Feather name={data.settings.site === site ? 'check-circle' : 'circle'} size={20} color={data.settings.site === site ? colors.primary : colors.mutedForeground} />
          </Pressable>
        ))}
      </Card>
      <Card colors={colors}>
        <SectionTitle title={activeT('connectivity')} />
        <View style={styles.networkLine}>
          <Feather name={deviceInternet === false ? 'wifi-off' : 'wifi'} size={17} color={deviceInternet === false ? colors.warning : colors.success} />
          <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{activeT('actualNetwork')}: {deviceInternet === null ? activeT('deviceUnknown') : deviceInternet ? activeT('available') : activeT('unavailable')}</Text>
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
          <View style={styles.flex}>
            <Text style={[styles.recordVessel, paletteStyle(colors.foreground)]}>{activeT('demoSync')}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('simOnly')}</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: data.settings.demoConnectivity }}
            accessibilityLabel={activeT('connectivity')}
            testID="demo-connectivity-toggle"
            onPress={() => updateData((current) => ({ ...current, settings: { ...current.settings, demoConnectivity: !current.settings.demoConnectivity } }))}
            style={[styles.switchTrack, { backgroundColor: data.settings.demoConnectivity ? colors.primary : colors.border }]}
          >
            <View style={[styles.switchThumb, { alignSelf: data.settings.demoConnectivity ? 'flex-end' : 'flex-start', backgroundColor: colors.card }]} />
          </Pressable>
        </View>
        <Action label={syncBusy ? 'Working…' : activeT('retrySync')} icon="refresh-cw" variant="outline" disabled={syncBusy || waitingCount === 0} onPress={syncNow} />
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{waitingCount} · {activeT('waitingSync')}</Text>
      </Card>
      <Card colors={colors}>
        <SectionTitle title={activeT('deviceStatus')} />
        <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{localSaved ? activeT('savedPhone') : storageError ? activeT('saveError') : activeT('saving')}</Text>
        {storageError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{storageError}</Text> : null}
      </Card>
      <Card colors={colors}>
        <SectionTitle title={activeT('resetDemo')} />
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{activeT('resetConfirm')}</Text>
        {resetConfirm ? (
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Action label={activeT('keepData')} variant="outline" onPress={() => setResetConfirm(false)} /></View>
            <View style={styles.flex}><Action label={activeT('confirmReset')} icon="rotate-ccw" variant="danger" onPress={resetDemo} /></View>
          </View>
        ) : <Action label={activeT('resetDemo')} icon="rotate-ccw" variant="danger" onPress={() => setResetConfirm(true)} />}
      </Card>
      <Action label={activeT('today')} icon="home" variant="outline" onPress={() => setPage('today')} />
    </View>
  );

  const content = page === 'today'
    ? renderToday()
    : page === 'record'
      ? renderRecord()
      : page === 'review'
        ? renderReview()
        : page === 'records'
          ? renderRecords()
          : page === 'summary'
            ? renderSummary()
            : renderSettings();

  return (
    <View style={[styles.app, { backgroundColor: colors.background, paddingTop: contentTop }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <View style={styles.brandLockup}>
          <View style={[styles.brandMark, { backgroundColor: colors.deepSea }]}><Feather name="anchor" size={17} color={colors.seaGlass} /></View>
          <View>
            <Text style={[styles.brandName, paletteStyle(colors.foreground)]}>MOAI BMU</Text>
            <Text style={[styles.brandMeta, paletteStyle(colors.mutedForeground)]}>{currentPageTitle[page]}</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.localStatus, { backgroundColor: localSaved ? colors.seaGlass : colors.paleWarning }]}>
            <View style={[styles.statusDot, { backgroundColor: localSaved ? colors.success : colors.warning }]} />
            <Text style={[styles.localStatusText, { color: localSaved ? colors.success : colors.warning }]}>{localSaved ? activeT('savedPhone') : activeT('saving')}</Text>
          </View>
          <Pressable onPress={() => setPage('settings')} accessibilityRole="button" accessibilityLabel={activeT('settings')} style={[styles.headerSettings, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="settings" size={19} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
      {notice ? <View style={[styles.notice, { backgroundColor: colors.deepSea }]}><Feather name="info" size={16} color={colors.seaGlass} /><Text style={[styles.noticeText, { color: colors.primaryForeground }]}>{notice}</Text><Pressable onPress={() => setNotice('')}><Feather name="x" size={17} color={colors.seaGlass} /></Pressable></View> : null}
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.pageContent, { paddingBottom: 22 + (Platform.OS === 'web' ? 0 : insets.bottom) }]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        bottomOffset={70}
      >
        {content}
      </KeyboardAwareScrollViewCompat>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'web' ? 34 : Math.max(8, insets.bottom) }]}>
        {([
          ['today', activeT('today'), 'home'],
          ['review', activeT('review'), 'check-square'],
          ['record', activeT('record'), 'plus-circle'],
          ['records', activeT('records'), 'file-text'],
          ['summary', activeT('summary'), 'bar-chart-2'],
        ] as [Page, string, keyof typeof Feather.glyphMap][]).map(([tab, label, icon]) => {
          const selected = page === tab;
          const active = tab === 'record' && page === 'record';
          return (
            <Pressable
              key={tab}
              onPress={() => tab === 'record' ? beginRecord() : setPage(tab)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              testID={`tab-${tab}`}
              style={styles.tabItem}
            >
              <View style={[styles.tabIconWrap, active && { backgroundColor: colors.deepSea }]}>
                <Feather name={icon} size={18} color={active ? colors.seaGlass : selected ? colors.primary : colors.mutedForeground} />
                {tab === 'review' && allCurrentDrafts.length > 0 ? <View style={[styles.tabDot, { backgroundColor: colors.warning }]} /> : null}
              </View>
              <Text numberOfLines={1} style={[styles.tabLabel, { color: selected ? colors.primary : colors.mutedForeground, fontWeight: selected ? '700' : '500' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => Keyboard.dismiss()} style={styles.keyboardDismissTarget} accessibilityElementsHidden />
    </View>
  );
}

function ReviewEditor({
  record,
  language,
  colors,
  onChange,
  onApprove,
  onReject,
  onSave,
  onPlay,
}: {
  record: LandingRecord;
  language: Language;
  colors: Palette;
  onChange: (record: LandingRecord) => void;
  onApprove: () => void;
  onReject: () => void;
  onSave: () => void;
  onPlay: (uri: string) => void;
}) {
  const t = (key: CopyKey) => COPY[language][key];
  const changeCatch = (id: string, patch: Partial<CatchItem>) => onChange({
    ...record,
    catchItems: record.catchItems.map((item) => item.id === id ? { ...item, ...patch } : item),
  });
  return (
    <View style={styles.stack}>
      <Card colors={colors}>
        <View style={styles.detailTitleRow}>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, paletteStyle(colors.foreground)]}>{record.vessel || t('missingInfo')}</Text>
            <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{record.id} · {record.site}</Text>
          </View>
          <StateBadge label={t('draftStatus')} status="draft" />
        </View>
        {record.seededVoiceError ? (
          <View style={[styles.warningBox, { backgroundColor: colors.paleWarning, borderColor: colors.sand }]}>
            <Feather name="alert-triangle" size={18} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>{t('seededError')}</Text>
          </View>
        ) : null}
        {record.source === 'voice' ? (
          <View style={[styles.transcriptBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.factLabel, paletteStyle(colors.mutedForeground)]}>{t('transcriptSource')}</Text>
            <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>{record.transcript || 'No transcript provided. Enter details manually.'}</Text>
            {record.aiTranscription ? <Text style={[styles.helperText, paletteStyle(colors.warning)]}>{t('aiTranscriptReview')}</Text> : null}
            {record.audioUri ? <Action label={t('playRecording')} icon="volume-2" variant="outline" onPress={() => onPlay(record.audioUri!)} /> : null}
            {!record.audioUri ? <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>Prepared text only · no audio recording attached.</Text> : null}
          </View>
        ) : null}
        {record.source === 'photo' && record.photoUri ? <Image source={imageSource(record.photoUri)} style={[styles.recordPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" /> : null}
        {record.source === 'photo' ? <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{record.photoUri === 'prepared-demo' ? t('preparedImageNote') : t('arbitraryPhotoNote')} {t('photoNoInference')}</Text> : null}
        {record.aiPhotoSuggestion ? (
          <View style={[styles.warningBox, { backgroundColor: colors.paleWarning, borderColor: colors.sand }]}>
            <Feather name="alert-triangle" size={18} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={[styles.warningText, { color: colors.warning }]}>{t('aiPhotoLabel')}</Text>
              <Text style={[styles.bodyText, paletteStyle(colors.foreground)]}>
                {[record.aiPhotoSuggestion.localName, record.aiPhotoSuggestion.speciesGroup].filter(Boolean).join(' · ') || t('noClearSpecies')}
              </Text>
              <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>
                {t('aiConfidence')}: {record.aiPhotoSuggestion.confidence} · {record.aiPhotoSuggestion.explanation}
              </Text>
              <Action
                label={t('useAiSuggestion')}
                icon="edit-3"
                variant="outline"
                disabled={!record.aiPhotoSuggestion.localName && !record.aiPhotoSuggestion.speciesGroup}
                onPress={() => {
                  const suggestion = record.aiPhotoSuggestion!;
                  const firstCatch = record.catchItems[0];
                  if (!firstCatch) return;
                  changeCatch(firstCatch.id, {
                    localName: firstCatch.localName || suggestion.localName || '',
                    speciesGroup: firstCatch.speciesGroup || suggestion.speciesGroup || '',
                  });
                }}
              />
            </View>
          </View>
        ) : null}
        <Input label={t('site')} value={record.site} onChangeText={(site) => onChange({ ...record, site })} />
        <Input label={t('dateTime')} value={localDateInput(record.landedAt)} onChangeText={(value) => onChange({ ...record, landedAt: parseLocalDateTime(value) ?? value })} placeholder="YYYY-MM-DDTHH:MM" />
        <Input label={t('vessel')} value={record.vessel} onChangeText={(vessel) => onChange({ ...record, vessel })} placeholder={t('missingInfo')} />
        <SectionTitle title={t('catchItems')} />
        {record.catchItems.map((item, index) => (
          <View key={item.id} style={[styles.catchEditor, { backgroundColor: colors.background, borderColor: item.weightKg === 21 && record.seededVoiceError ? colors.warning : colors.border }]}>
            <Text style={[styles.catchEditorTitle, paletteStyle(colors.foreground)]}>{t('catchItems')} {index + 1}</Text>
            {record.catchItems.length > 1 ? <Action label={t('removeCatch')} icon="trash-2" variant="quiet" onPress={() => onChange({ ...record, catchItems: record.catchItems.filter((catchItem) => catchItem.id !== item.id) })} /> : null}
            <Input label={t('localName')} value={item.localName} onChangeText={(localName) => changeCatch(item.id, { localName })} placeholder={t('missingInfo')} />
            <Input label={t('species')} value={item.speciesGroup} onChangeText={(speciesGroup) => changeCatch(item.id, { speciesGroup })} placeholder={t('unknownSpecies')} />
            <Input label={t('weight')} value={item.weightKg > 0 ? String(item.weightKg) : ''} onChangeText={(value) => changeCatch(item.id, { weightKg: Number(value) || 0 })} keyboardType="decimal-pad" placeholder={t('missingInfo')} />
            <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{t('weightBasis')}</Text>
            <View style={styles.chipRow}>
              {(['measured', 'estimated'] as WeightBasis[]).map((basis) => (
                <ChoiceChip key={basis} label={basis === 'measured' ? t('measured') : t('estimated')} selected={item.weightBasis === basis} onPress={() => changeCatch(item.id, { weightBasis: basis })} />
              ))}
            </View>
            <Text style={[styles.fieldLabel, paletteStyle(colors.foreground)]}>{t('priceBasis')}</Text>
            <View style={styles.chipRow}>
              {(['per_kg', 'total', 'unknown'] as PriceBasis[]).map((basis) => (
                <ChoiceChip key={basis} label={basis === 'per_kg' ? t('perKg') : basis === 'total' ? t('totalSale') : t('noPrice')} selected={item.priceBasis === basis} onPress={() => changeCatch(item.id, { priceBasis: basis, priceAmount: basis === 'unknown' ? null : item.priceAmount })} />
              ))}
            </View>
            {item.priceBasis !== 'unknown' ? <Input label={t('amount')} value={item.priceAmount === null ? '' : String(item.priceAmount)} onChangeText={(value) => changeCatch(item.id, { priceAmount: Number(value) || null })} keyboardType="decimal-pad" /> : <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>{t('amountUnknown')}</Text>}
            {item.photoUri ? <Image source={imageSource(item.photoUri)} style={[styles.catchPhoto, { backgroundColor: colors.muted }]} resizeMode="cover" /> : null}
          </View>
        ))}
        <Action label={t('addCatch')} icon="plus" variant="secondary" onPress={() => onChange({
          ...record,
          catchItems: [...record.catchItems, { id: makeId('CATCH'), localName: '', speciesGroup: '', weightKg: 0, weightBasis: 'measured', priceBasis: 'unknown', priceAmount: null }],
        })} />
        <Input label={t('observation')} value={record.observation} onChangeText={(observation) => onChange({ ...record, observation })} multiline placeholder="Optional context, separate from catch measurements" />
        <Text style={[styles.helperText, paletteStyle(colors.mutedForeground)]}>Validation used here is configurable demo guidance, not an official Kenya reporting rule.</Text>
        <Action label={t('saveDraft')} icon="save" variant="outline" onPress={onSave} />
        <Action label={t('approval')} icon="check-circle" testID="approve-landing" onPress={onApprove} />
        <Action label={t('reject')} icon="x-circle" variant="danger" onPress={onReject} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  topBar: { minHeight: 64, paddingHorizontal: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  brandName: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  brandMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  localStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, maxWidth: 155 },
  localStatusText: { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  headerSettings: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  pageContent: { paddingHorizontal: 16, paddingTop: 5, gap: 16 },
  stack: { gap: 15 },
  stackTight: { gap: 9 },
  heroBlock: { borderRadius: 22, padding: 20, overflow: 'hidden' },
  heroKicker: { fontSize: 10, letterSpacing: 1.6, fontWeight: '800' },
  heroName: { fontSize: 27, lineHeight: 34, fontWeight: '800', marginTop: 7 },
  heroSubtitle: { fontSize: 14, marginTop: 2, fontWeight: '500' },
  heroDemoLabel: { marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  heroDemoText: { fontWeight: '700', fontSize: 11 },
  networkSummary: { paddingHorizontal: 2, gap: 7 },
  networkLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  networkText: { fontSize: 12, fontWeight: '600' },
  storageError: { fontSize: 12, lineHeight: 17 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 112, borderRadius: 17, borderWidth: 1, padding: 12, justifyContent: 'space-between' },
  statIcon: { height: 29, width: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  primaryHeroAction: { minHeight: 80, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIconCircle: { height: 43, width: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitleWrap: { flex: 1 },
  primaryHeroTitle: { fontSize: 17, fontWeight: '800' },
  primaryHeroSubtitle: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  syncCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  settingsIcon: { height: 39, width: 39, alignItems: 'center', justifyContent: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  sectionAside: { fontSize: 11, fontWeight: '600' },
  syncStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  syncDisclosure: { fontSize: 11, lineHeight: 16 },
  prototypeFootnote: { fontSize: 11, textAlign: 'center', paddingTop: 1 },
  screenLead: { fontSize: 23, lineHeight: 29, fontWeight: '800' },
  bodyText: { fontSize: 14, lineHeight: 21 },
  helperText: { fontSize: 12, lineHeight: 18 },
  field: { gap: 6, marginBottom: 3 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, lineHeight: 20 },
  action: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  actionText: { fontSize: 14, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 43, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  methodCard: { minHeight: 83, borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
  methodIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  noteBox: { padding: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  backRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontWeight: '700' },
  twoInputs: { flexDirection: 'row', gap: 10 },
  catchEditor: { borderWidth: 1, borderRadius: 16, padding: 13, gap: 10 },
  catchEditorHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catchEditorTitle: { fontSize: 13, fontWeight: '800' },
  removeButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  removeText: { fontSize: 11, fontWeight: '700' },
  catchPhoto: { width: '100%', height: 150, borderRadius: 13 },
  errorText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  voiceHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  voiceIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sampleBox: { padding: 14, borderRadius: 17, borderWidth: 1, gap: 11 },
  sampleBoxTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sampleTitle: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  recordPhoto: { width: '100%', height: 230, borderRadius: 15 },
  warningBox: { padding: 12, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  queueHeader: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  queueCountCircle: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  queueCount: { fontSize: 16, fontWeight: '800' },
  horizontalQueue: { gap: 8, paddingRight: 5 },
  queueChip: { minWidth: 155, maxWidth: 210, borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  queueChipTitle: { fontSize: 12, fontWeight: '800' },
  queueChipSub: { fontSize: 10, marginTop: 4, textTransform: 'capitalize' },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailTitleText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  transcriptBox: { padding: 12, borderRadius: 13, gap: 6 },
  factLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  inlineFacts: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  factValue: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  catchSummaryRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  buttonRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  flex: { flex: 1 },
  historyLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  historyDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  historyTitle: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  recordRow: { minHeight: 87, borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  recordRowMain: { flex: 1, gap: 4 },
  recordRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  recordVessel: { fontSize: 13, fontWeight: '800' },
  recordCatch: { fontSize: 12, lineHeight: 17 },
  recordMeta: { fontSize: 10, lineHeight: 15 },
  recordCardWrap: { gap: 4 },
  recordSyncLine: { marginLeft: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  inlineDate: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryMetric: { minWidth: '44%', flex: 1, gap: 4 },
  summaryValue: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  summaryFooter: { borderTopWidth: 1, paddingTop: 10, gap: 5 },
  speciesRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: 12 },
  weightStrong: { fontSize: 13, fontWeight: '800' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { fontSize: 15, fontWeight: '800' },
  siteOption: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  toggleRow: { minHeight: 73, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTrack: { width: 54, height: 32, borderRadius: 17, padding: 4, justifyContent: 'center' },
  switchThumb: { width: 24, height: 24, borderRadius: 12 },
  tabBar: { minHeight: 68, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 6 },
  tabItem: { flex: 1, minHeight: 47, justifyContent: 'center', alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  tabIconWrap: { width: 40, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabLabel: { fontSize: 9, lineHeight: 12, textAlign: 'center', maxWidth: '100%' },
  tabDot: { position: 'absolute', right: 3, top: 1, width: 8, height: 8, borderRadius: 4 },
  keyboardDismissTarget: { height: 0, width: 0 },
});
