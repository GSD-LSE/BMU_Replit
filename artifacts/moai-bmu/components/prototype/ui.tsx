import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Platform, BackHandler, type KeyboardTypeOptions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '../KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';
import { applyUndo, numberValue } from '@/lib/prototype/model';
import { usePrototype } from '@/lib/prototype/store';

export const C = colors.light;
export type Icon = keyof typeof Feather.glyphMap;
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export function Txt({ children, muted = false, bold = false, small = false }: { children: React.ReactNode; muted?: boolean; bold?: boolean; small?: boolean }) {
  return <Text style={[s.text, muted && { color: C.mutedForeground }, bold && s.bold, small && s.small]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) { return <Text style={s.heading}>{children}</Text>; }
export function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Btn({ label, onPress, icon, kind = 'primary', disabled = false, testID }: {
  label: string; onPress: () => void; icon?: Icon; kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; testID?: string;
}) {
  const primary = kind === 'primary', danger = kind === 'danger';
  const foreground = primary ? C.primaryForeground : danger ? C.destructive : C.foreground;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} testID={testID ?? slug(label)}
    onPress={onPress} disabled={disabled} style={({ pressed }) => [s.button, {
      backgroundColor: primary ? C.primary : danger ? C.dangerSoft : kind === 'quiet' ? 'transparent' : C.card,
      borderColor: primary ? C.primary : kind === 'quiet' ? 'transparent' : C.border,
      opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
    }]}>
    {icon ? <Feather name={icon} size={20} color={foreground} /> : null}
    <Text style={[s.buttonText, { color: foreground }]}>{label}</Text>
  </Pressable>;
}
export function Field({ label, value, onChange, numeric = false, multiline = false, before, hint, keyboardType, testID }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; multiline?: boolean; before?: string;
  hint?: string; keyboardType?: KeyboardTypeOptions; testID?: string;
}) {
  const changed = before !== undefined && before !== value;
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    {changed ? <Txt small bold>Changed · Was: {before || 'Not entered'}</Txt> : null}
    <TextInput value={value} accessibilityLabel={label} testID={testID ?? slug(label)} onChangeText={onChange}
      placeholder="Not entered" placeholderTextColor={C.mutedForeground} multiline={multiline}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} keyboardType={keyboardType ?? (numeric ? 'decimal-pad' : 'default')}
      style={[s.input, multiline && { minHeight: 100, textAlignVertical: 'top' }]} />
    {hint ? <Txt small muted>{hint}</Txt> : null}
    {numeric && value.trim() && numberValue(value) === null ? <Text style={s.error}>Enter a number of zero or more.</Text> : null}
  </View>;
}
export function Choices({ label, options, value, onChange, multiple = false }: {
  label: string; options: string[]; value: string | string[]; onChange: (v: string) => void; multiple?: boolean;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.wrap}>
    {options.map(option => {
      const selected = multiple ? (value as string[]).includes(option) : value === option;
      return <Pressable key={option} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityLabel={option}
        accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => onChange(option)}
        style={[s.choice, selected && { backgroundColor: C.seaGlass, borderColor: C.primary }]}>
        <Feather name={selected ? 'check-circle' : 'circle'} size={18} color={C.foreground} /><View style={{ flexShrink: 1 }}><Txt>{option}</Txt></View>
      </Pressable>;
    })}
  </View></View>;
}
export function Badge({ status }: { status: string }) {
  const warning = ['Needs review', 'Waiting to send'].includes(status), processing = status === 'Processing';
  const icon: Icon = status === 'Draft' ? 'edit-3' : warning ? 'alert-circle' : processing ? 'clock' : status === 'Cancelled' ? 'x-circle' : 'check-circle';
  return <View style={[s.badge, { backgroundColor: warning ? C.paleWarning : processing ? C.processingSoft : status === 'Draft' ? C.muted : C.seaGlass }]}>
    <Feather name={icon} size={16} color={warning ? C.warning : processing ? C.processing : C.foreground} />
    <Text style={[s.label, { color: warning ? C.warning : processing ? C.processing : C.foreground }]}>{status}</Text>
  </View>;
}
export function Notice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const textOnly = React.Children.toArray(children).every(child => typeof child === 'string' || typeof child === 'number');
  return <View style={[s.notice, warning && { backgroundColor: C.paleWarning }]}><Feather name={warning ? 'alert-circle' : 'info'} size={20} color={C.foreground} /><View style={[s.flex, { gap: 8 }]}>{textOnly ? <Txt>{children}</Txt> : children}</View></View>;
}
export function Shell({ title, subtitle, offline, saved, back, children, footer, tab, onTab, stickyIndices, scrollKey }: {
  title: string; subtitle?: string; offline?: boolean; saved?: string; back?: () => void; children: React.ReactNode; footer?: React.ReactNode;
  tab?: string; onTab?: (tab: string) => void;
  stickyIndices?: number[];
  scrollKey?: string;
}) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!back || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back]);
  const layout = <View style={[s.screen, { paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top }]}>
    <View style={s.header}>
      {back ? <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={s.iconButton}><Feather name="arrow-left" size={23} color={C.foreground} /></Pressable> : null}
      <View style={s.flex}><Text style={s.title}>{title}</Text>{subtitle ? <Txt small muted>{subtitle}</Txt> : null}</View>
      {saved ? <Text accessibilityLiveRegion="polite" style={s.saved}>{saved}</Text> : null}
    </View>
    {offline ? <View style={s.offline}><Feather name="wifi-off" color={C.foreground} size={16} /><Txt small>Offline: records are saved on this phone</Txt></View> : null}
    <KeyboardAwareScrollViewCompat key={scrollKey ?? title} style={s.flex} contentContainerStyle={s.content} stickyHeaderIndices={stickyIndices?.map(i => i + 1)} bottomOffset={100} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={{ gap: 8 }}><StateNotices /></View>
      {React.Children.toArray(children)}
    </KeyboardAwareScrollViewCompat>
    {footer ? <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    {tab && onTab ? <View style={[s.tabs, { height: Platform.OS === 'web' ? 84 : 56 + insets.bottom, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
      {(['Home', 'Records', 'Settings'] as const).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityLabel={t}
        accessibilityState={{ selected: tab === t }} aria-selected={tab === t} testID={`tab-${slug(t)}`} onPress={() => onTab(t)} style={s.tab}>
        <Ionicons name={t === 'Home' ? tab === t ? 'home' : 'home-outline' : t === 'Records' ? tab === t ? 'documents' : 'documents-outline' : tab === t ? 'settings' : 'settings-outline'}
          color={tab === t ? C.primary : C.foreground} size={23} />
        <Text style={[s.label, { fontWeight: tab === t ? '700' : '400', color: tab === t ? C.primary : C.foreground }]}>{t}</Text>
      </Pressable>)}
    </View> : null}
  </View>;
  return Platform.OS === 'web' ? layout : <KeyboardAvoidingView behavior="padding" style={s.flex}>{layout}</KeyboardAvoidingView>;
}
function StateNotices() {
  const { data, error, retry, change, saved } = usePrototype();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const [undoError, setUndoError] = useState('');
  return <>
    {error ? <Notice warning><Txt bold>Not saved on this phone</Txt><Txt>{error}</Txt><Btn label="Retry local save" kind="secondary" onPress={() => { void retry(); }} />
      {data?.settings.failSaves ? <Btn label="Disable simulated failure and retry" kind="secondary" onPress={() => { void change(s => ({ ...s, settings: { ...s.settings, failSaves: false } })); }} /> : null}
    </Notice> : null}
    {data?.undo && data.undo.expiresAt > now && saved ? <Notice>
      <Txt>{data.undo.label} · {Math.ceil((data.undo.expiresAt - now) / 1000)}s</Txt>
      <Btn label="Undo" kind="secondary" onPress={() => {
        void change(state => { try { return applyUndo(state); } catch (e) { setUndoError((e as Error).message); return { ...state, undo: undefined }; } });
      }} />
    </Notice> : null}
    {undoError ? <Txt>{undoError}</Txt> : null}
  </>;
}
export function Overlay({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return <Modal visible animationType="none" onRequestClose={onClose}><Shell title={title} back={onClose} footer={footer}>{children}</Shell></Modal>;
}
export function Select({ label, value, options, onChange, before, allowEmpty = true }: {
  label: string; value: string; options: { value: string; label: string; detail?: string }[]; onChange: (v: string) => void; before?: string; allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    {before !== undefined && before !== value ? <Txt small bold>Changed · Was: {options.find(o => o.value === before)?.label ?? (before || 'Not entered')}</Txt> : null}
    <Btn kind="secondary" label={options.find(o => o.value === value)?.label ?? (value || `Choose ${label.toLowerCase()}`)} icon="chevron-down" testID={`select-${slug(label)}`} onPress={() => { setQuery(''); setOpen(true); }} />
    {open ? <Overlay title={label} onClose={() => setOpen(false)}>
      <Field label={`Search ${label.toLowerCase()}`} value={query} onChange={setQuery} />
      {allowEmpty ? <Btn label="Not entered" kind="quiet" onPress={() => { onChange(''); setOpen(false); }} /> : null}
      {options.filter(o => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(query.toLowerCase())).map(o =>
        <Btn key={o.value} label={`${o.label}${o.detail ? ` · ${o.detail}` : ''}`} kind="secondary" onPress={() => { onChange(o.value); setOpen(false); }} />)}
    </Overlay> : null}
  </View>;
}
export const s = StyleSheet.create({
  flex: { flex: 1 }, text: { fontSize: 16, lineHeight: 23, color: C.foreground, fontFamily: 'Inter_400Regular' },
  bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' }, small: { fontSize: 14, lineHeight: 20 },
  heading: { fontSize: 21, lineHeight: 28, color: C.foreground, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 24, lineHeight: 30, color: C.foreground, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 14, lineHeight: 20, color: C.foreground, fontFamily: 'Inter_600SemiBold' },
  field: { gap: 8 }, input: { minHeight: 52, borderWidth: 1, borderColor: C.input, borderRadius: 12, padding: 12, fontSize: 16, lineHeight: 23, color: C.foreground, backgroundColor: C.card },
  button: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter_600SemiBold', flexShrink: 1, textAlign: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choice: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card },
  badge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { borderRadius: 12, padding: 12, backgroundColor: C.muted, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  error: { color: C.destructive, fontSize: 14, lineHeight: 20 },
  screen: { flex: 1, backgroundColor: C.background, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  saved: { fontSize: 14, color: C.foreground, maxWidth: 110, textAlign: 'right' },
  offline: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.muted, flexDirection: 'row', alignItems: 'center', gap: 8 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  footer: { backgroundColor: C.card, borderTopWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, gap: 4 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.border },
  line: { borderTopWidth: 1, borderColor: C.border, paddingTop: 12, gap: 8 },
});
