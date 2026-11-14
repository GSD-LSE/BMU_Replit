import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Platform, BackHandler, Keyboard, useWindowDimensions, type KeyboardTypeOptions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '../KeyboardAwareScrollViewCompat';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, FadeOutDown, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import colors from '@/constants/colors';
import { applyUndo, numberValue } from '@/lib/prototype/model';
import { usePrototype } from '@/lib/prototype/store';
import { configureLayoutMotion, useMotionPrefs } from './motion';

export const C = colors.light;
export type Icon = keyof typeof Feather.glyphMap;
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const OverlayDismissContext = createContext<(() => void) | null>(null);
type KeyboardActions = { next?: () => void };
const KeyboardActionsContext = createContext<(actions: KeyboardActions | null) => void>(() => {});
export const useRegisterKeyboardActions = () => useContext(KeyboardActionsContext);
export function Txt({ children, muted = false, bold = false, small = false }: { children: React.ReactNode; muted?: boolean; bold?: boolean; small?: boolean }) {
  return <Text style={[s.text, muted && { color: C.mutedForeground }, bold && s.bold, small && s.small]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) { return <Text style={s.heading}>{children}</Text>; }
export function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Btn({ label, onPress, icon, kind = 'primary', disabled = false, disabledReason, testID, closeOnPress = false, large = false }: {
  label: string; onPress: () => void | boolean | Promise<void | boolean>; icon?: Icon;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; disabledReason?: string; testID?: string; closeOnPress?: boolean; large?: boolean;
}) {
  const primary = kind === 'primary', danger = kind === 'danger';
  const foreground = primary ? C.primaryForeground : danger ? C.destructiveForeground : C.foreground;
  const dismissOverlay = useContext(OverlayDismissContext);
  const handlePress = async () => {
    const result = await onPress();
    if (closeOnPress && result !== false) dismissOverlay?.();
  };
  return <View style={s.buttonGroup}>
    {disabled && disabledReason ? <Text style={s.disabledHint}>{disabledReason}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} testID={testID ?? slug(label)}
      onPress={handlePress} disabled={disabled} style={({ pressed }) => [s.button, large && { minHeight: 56 }, {
        backgroundColor: primary ? C.primary : danger ? C.destructive : kind === 'quiet' ? 'transparent' : C.card,
        borderColor: primary ? C.primary : danger ? C.destructive : kind === 'quiet' ? 'transparent' : C.input,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      }]}>
      {icon ? <Feather name={icon} size={20} color={foreground} /> : null}
      <Text style={[s.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  </View>;
}
export function ActionBar({ primary, secondary, danger, variant = 'row' }: {
  primary?: React.ReactNode; secondary?: React.ReactNode; danger?: React.ReactNode; variant?: 'row' | 'stacked';
}) {
  if (variant === 'stacked') return <View style={s.actionStack}>
    {primary ? <View>{primary}</View> : null}
    {danger ? <View>{danger}</View> : null}
    {secondary ? <View>{secondary}</View> : null}
  </View>;
  return <View style={s.actionBar}>
    {secondary ? <View style={s.actionSecondary}>{secondary}</View> : null}
    {danger ? <View style={s.actionSecondary}>{danger}</View> : null}
    {primary ? <View style={secondary || danger ? s.actionPrimary : s.actionFull}>{primary}</View> : null}
  </View>;
}
export function Field({ label, value, onChange, numeric = false, multiline = false, before, hint, keyboardType, testID, placeholder,
  inputRef, onFocus, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; multiline?: boolean; before?: string;
  hint?: string; keyboardType?: KeyboardTypeOptions; testID?: string; placeholder?: string; inputRef?: React.Ref<TextInput>;
  onFocus?: () => void; onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const changed = before !== undefined && before !== value;
  return <View style={s.field}>
    {label.startsWith('Search ') ? null : <Text style={s.label}>{label}</Text>}
    {changed ? <Txt small bold>Changed · Was: {before || 'No value yet'}</Txt> : null}
    <TextInput ref={inputRef} value={value} accessibilityLabel={label} testID={testID ?? slug(label)} onChangeText={onChange}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur?.(); }}
      placeholder={placeholder ?? (label.startsWith('Search ') ? label : '')} placeholderTextColor={C.mutedForeground} multiline={multiline}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} keyboardType={keyboardType ?? (numeric ? 'decimal-pad' : 'default')}
      style={[s.input, focused && s.inputFocused, multiline && { minHeight: 100, textAlignVertical: 'top' }]} />
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
        style={[s.choice, selected && { backgroundColor: C.seaGlass, borderColor: C.primary, borderWidth: 2 }]}>
        <Feather name={selected ? 'check-circle' : 'circle'} size={18} color={C.foreground} /><View style={{ flexShrink: 1 }}><Txt>{option}</Txt></View>
      </Pressable>;
    })}
  </View></View>;
}
export function StatusChip({ status }: { status: string }) {
  let backgroundColor = C.card, color = C.mutedForeground, borderColor = C.input, borderStyle: 'solid' | 'dashed' = 'solid';
  let icon: Icon = 'help-circle';
  if (status === 'Draft') { icon = 'edit-3'; borderStyle = 'dashed'; }
  else if (status === 'Needs review') { icon = 'alert-circle'; backgroundColor = C.paleWarning; color = C.warning; borderColor = C.paleWarning; }
  else if (status === 'Saved') { icon = 'check-circle'; color = C.primary; borderColor = C.primary; }
  else if (status === 'Waiting to send') { icon = 'clock'; backgroundColor = C.processing; color = C.primaryForeground; borderColor = C.processing; }
  else if (status === 'Couldn’t send' || status === "Couldn't send") { icon = 'alert-triangle'; backgroundColor = C.destructive; color = C.destructiveForeground; borderColor = C.destructive; }
  else if (status === 'Cancelled') { icon = 'x-circle'; backgroundColor = C.muted; color = C.foreground; borderColor = C.muted; }
  else if (status === 'Processing') { icon = 'clock'; backgroundColor = C.processingSoft; color = C.processing; borderColor = C.processingSoft; }
  else if (status.startsWith('Sent')) { icon = 'send'; backgroundColor = C.deepSea; color = C.primaryForeground; borderColor = C.deepSea; }
  else if (status === 'Photo read') { icon = 'check-circle'; backgroundColor = C.seaGlass; color = C.foreground; borderColor = C.seaGlass; }
  return <View accessibilityLabel={`Status: ${status}`} style={[s.badge, { backgroundColor, borderColor, borderStyle }]}>
    <Feather name={icon} size={18} color={color} />
    <Text style={[s.badgeText, { color }]}>{status}</Text>
  </View>;
}
export function Notice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const textOnly = React.Children.toArray(children).every(child => typeof child === 'string' || typeof child === 'number');
  return <View style={[s.notice, warning && { backgroundColor: C.paleWarning }]}><Feather name={warning ? 'alert-circle' : 'info'} size={20} color={C.foreground} /><View style={[s.flex, { gap: 8 }]}>{textOnly ? <Txt>{children}</Txt> : children}</View></View>;
}
export function Shell({ title, subtitle, offline, saved, back, children, footer, tab, onTab, stickyIndices, scrollKey,
  presentation = 'screen', backIcon, backLabel, headerRight, offlineCompact = false }: {
  title: string; subtitle?: string; offline?: boolean; saved?: string; back?: () => void; children: React.ReactNode; footer?: React.ReactNode;
  tab?: string; onTab?: (tab: string) => void; presentation?: 'screen' | 'dialog'; backIcon?: Icon; backLabel?: string;
  stickyIndices?: number[]; headerRight?: React.ReactNode; offlineCompact?: boolean;
  scrollKey?: string;
}) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false), [keyboardActions, setKeyboardActions] = useState<KeyboardActions | null>(null);
  useEffect(() => {
    if (!back || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); setKeyboardActions(null); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const layout = <KeyboardActionsContext.Provider value={setKeyboardActions}><View style={[s.screen, presentation === 'dialog' && s.dialogPanel, { paddingTop: presentation === 'dialog' ? 0 : Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top }]}>
    <View style={s.header}>
      {back ? <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={backLabel ?? (presentation === 'dialog' ? 'Close dialog' : 'Back')}
        testID="header-back" style={s.iconButton}><Feather name={backIcon ?? (presentation === 'dialog' ? 'x' : 'arrow-left')} size={23} color={C.foreground} /></Pressable> : null}
      <View style={s.flex}><Text style={s.title}>{title}</Text>{subtitle ? <Txt small muted>{subtitle}</Txt> : null}</View>
      {headerRight}
      {offline && offlineCompact ? <View style={s.offlinePill}><Feather name="wifi-off" color={C.foreground} size={14} /><Txt small>Offline</Txt></View> : null}
      {saved ? <Text accessibilityLiveRegion="polite" style={s.saved}>{saved}</Text> : null}
    </View>
    {offline && !offlineCompact ? <View style={s.offline}><Feather name="wifi-off" color={C.foreground} size={16} /><Txt small>Offline: records are saved on this phone</Txt></View> : null}
    <KeyboardAwareScrollViewCompat key={scrollKey ?? title} style={s.flex} contentContainerStyle={s.content} stickyHeaderIndices={stickyIndices?.map(i => i + 1)} bottomOffset={100} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={{ gap: 8 }}><StateNotices /></View>
      {React.Children.toArray(children)}
    </KeyboardAwareScrollViewCompat>
    {keyboardVisible && keyboardActions ? <View style={[s.keyboardToolbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <ActionBar secondary={<Btn label="Next" kind="secondary" disabled={!keyboardActions.next} onPress={() => keyboardActions.next?.()} />}
        primary={<Btn label="Done" onPress={() => Keyboard.dismiss()} />} />
    </View> : footer && !(keyboardVisible && keyboardActions) ? <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    {tab && onTab ? <View style={[s.tabs, { height: Platform.OS === 'web' ? 84 : 56 + insets.bottom, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
      {(['Home', 'Records', 'Settings'] as const).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityLabel={t}
        accessibilityState={{ selected: tab === t }} aria-selected={tab === t} testID={`tab-${slug(t)}`} onPress={() => onTab(t)} style={s.tab}>
        <Ionicons name={t === 'Home' ? tab === t ? 'home' : 'home-outline' : t === 'Records' ? tab === t ? 'documents' : 'documents-outline' : tab === t ? 'settings' : 'settings-outline'}
          color={tab === t ? C.primary : C.foreground} size={23} />
        <Text style={[s.label, { fontWeight: tab === t ? '700' : '400', color: tab === t ? C.primary : C.foreground }]}>{t}</Text>
      </Pressable>)}
    </View> : null}
  </View></KeyboardActionsContext.Provider>;
  return Platform.OS === 'web' ? layout : <KeyboardAvoidingView behavior="padding" style={s.flex}>{layout}</KeyboardAvoidingView>;
}
function StateNotices() {
  const { data, error, retry, change, saved } = usePrototype();
  const [now, setNow] = useState(Date.now());
  const reduceMotion = useMotionPrefs();
  const pauseStart = useRef(0), [paused, setPaused] = useState(false);
  useEffect(() => { const t = setInterval(() => { if (!pauseStart.current) setNow(Date.now()); }, 100); return () => clearInterval(t); }, []);
  const [undoError, setUndoError] = useState(''), [restoreNotice, setRestoreNotice] = useState('');
  const touchStart = () => { if (!pauseStart.current) { pauseStart.current = Date.now(); setPaused(true); } };
  const touchEnd = () => {
    if (!pauseStart.current) return;
    const extra = Date.now() - pauseStart.current;
    pauseStart.current = 0;
    setPaused(false);
    if (extra > 0) void change(state => state.undo ? { ...state, undo: { ...state.undo, expiresAt: state.undo.expiresAt + extra } } : state);
  };
  const undo = data?.undo;
  const remaining = undo ? Math.max(0, undo.expiresAt - (paused ? pauseStart.current : now)) : 0;
  return <>
    {error ? <Notice warning><Txt bold>Not saved on this phone</Txt><Txt>{error}</Txt><Btn label="Retry local save" kind="secondary" onPress={() => { void retry(); }} />
      {data?.settings.failSaves ? <Btn label="Disable simulated failure and retry" kind="secondary" onPress={() => { void change(s => ({ ...s, settings: { ...s.settings, failSaves: false } })); }} /> : null}
    </Notice> : null}
    {undo && (undo.expiresAt > now || paused) && saved ? <Animated.View entering={reduceMotion ? FadeIn.duration(100) : FadeInUp.duration(180)}
      exiting={reduceMotion ? FadeOut.duration(100) : FadeOutDown.duration(100)} onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={touchEnd}>
      <Notice>
        <Txt>{undo.label}</Txt>
        {!reduceMotion ? <View style={s.undoTrack}><View style={[s.undoFill, { width: `${Math.min(100, remaining / 10000 * 100)}%` }]} /></View> : null}
        <Btn label="Undo" kind="secondary" onPress={async () => {
          const kind = undo.kind;
          configureLayoutMotion(reduceMotion);
          const ok = await change(state => { try { return applyUndo(state); } catch (e) { setUndoError((e as Error).message); return { ...state, undo: undefined }; } });
          if (ok) {
            const message = kind === 'delete' ? 'Record restored.' : kind === 'discard' ? 'Draft restored.'
              : kind === 'edit' ? 'Changes restored.' : 'Catch line restored.';
            setRestoreNotice(message);
            setTimeout(() => setRestoreNotice(''), 2500);
          }
        }} />
      </Notice>
    </Animated.View> : null}
    {restoreNotice ? <Animated.View entering={reduceMotion ? FadeIn.duration(100) : FadeInUp.duration(180)} exiting={reduceMotion ? FadeOut.duration(100) : FadeOutDown.duration(100)}>
      <Notice>{restoreNotice}</Notice>
    </Animated.View> : null}
    {undoError ? <Txt>{undoError}</Txt> : null}
  </>;
}
export function Overlay({ title, onClose, children, footer, saved, variant = 'sheet' }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; saved?: string; variant?: 'sheet' | 'dialog';
}) {
  const reduceMotion = useMotionPrefs();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(true);
  const closing = useRef(false);
  const progress = useSharedValue(0);
  const scrimProgress = useSharedValue(0);
  const enterDuration = reduceMotion ? 100 : variant === 'dialog' ? 150 : 250;
  const exitDuration = reduceMotion ? 100 : variant === 'dialog' ? 100 : 200;
  const finishClose = useCallback(() => { setMounted(false); onClose(); }, [onClose]);
  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    progress.value = withTiming(0, { duration: exitDuration, easing: Easing.in(Easing.cubic) }, finished => {
      if (finished) runOnJS(finishClose)();
    });
    scrimProgress.value = withTiming(0, { duration: reduceMotion ? 100 : 150, easing: Easing.in(Easing.cubic) });
  }, [exitDuration, finishClose, progress, reduceMotion, scrimProgress]);
  useEffect(() => {
    progress.value = withTiming(1, { duration: enterDuration, easing: Easing.out(Easing.cubic) });
    scrimProgress.value = withTiming(1, { duration: reduceMotion ? 100 : 150, easing: Easing.out(Easing.cubic) });
  }, [enterDuration, progress, reduceMotion, scrimProgress]);
  const panelStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion || variant === 'dialog' ? progress.value : 1,
    transform: variant === 'sheet' && !reduceMotion ? [{ translateY: height * (1 - progress.value) }] : [],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimProgress.value }));
  if (!mounted) return null;
  return <OverlayDismissContext.Provider value={dismiss}>
    <Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={variant === 'dialog' ? s.dialogBackdrop : s.modalBackdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, s.modalScrim, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={variant === 'dialog' ? 'Close dialog' : 'Close sheet'} onPress={dismiss} style={StyleSheet.absoluteFill} />
        </Animated.View>
        {variant === 'dialog' ? <Animated.View style={[s.dialogPanelFrame, panelStyle]}>
          <Shell title={title} back={dismiss} backLabel="Close dialog" footer={footer} saved={saved} presentation="dialog">{children}</Shell>
        </Animated.View> : <Animated.View style={[s.modalFrame, panelStyle]}>
        <Shell title={title} back={dismiss} footer={footer} saved={saved}>{children}</Shell>
      </Animated.View>}
      </View>
    </Modal>
  </OverlayDismissContext.Provider>;
}
export function Select({ label, value, options, onChange, before, allowEmpty = true, emptyLabel: emptyLabelOverride }: {
  label: string; value: string; options: { value: string; label: string; detail?: string }[]; onChange: (v: string) => void;
  before?: string; allowEmpty?: boolean; emptyLabel?: string;
}) {
  const emptyLabel = emptyLabelOverride ?? (label.includes('Fisher') ? 'No fisher' : label.includes('Boat') ? 'No boat' : label === 'Propulsion' ? 'No propulsion' : 'No value');
  const searchLabel = label === 'Boat' ? 'Search boats' : label === 'Fisher' ? 'Search fishers'
    : label === 'Species' ? 'Search species' : label === 'Send to' ? 'Search recipients' : `Search ${label.toLowerCase()}`;
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    {before !== undefined && before !== value ? <Txt small bold>Changed · Was: {options.find(o => o.value === before)?.label ?? (before || emptyLabel)}</Txt> : null}
    <Btn kind="secondary" label={options.find(o => o.value === value)?.label ?? (value || (allowEmpty ? emptyLabel : `Choose ${label.toLowerCase()}`))} icon="chevron-down" testID={`select-${slug(label)}`} onPress={() => { setQuery(''); setOpen(true); }} />
    {open ? <Overlay title={label} onClose={() => setOpen(false)}>
      <Field label={searchLabel} value={query} onChange={setQuery} />
      {allowEmpty ? <Btn label={emptyLabel} kind="quiet" closeOnPress onPress={() => { onChange(''); }} /> : null}
      {options.filter(o => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(query.toLowerCase())).map(o =>
        <Btn key={o.value} label={`${o.label}${o.detail ? ` · ${o.detail}` : ''}`} kind="secondary" closeOnPress onPress={() => { onChange(o.value); }} />)}
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
  inputFocused: { borderWidth: 2, borderColor: C.deepSea },
  buttonGroup: { gap: 4 },
  disabledHint: { color: C.mutedForeground, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter_600SemiBold', flexShrink: 1, textAlign: 'center' },
  actionBar: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  actionSecondary: { flex: 1, minWidth: 0 },
  actionPrimary: { flex: 2, minWidth: 0 },
  actionFull: { flex: 1, minWidth: 0 },
  actionStack: { gap: 16 },
  undoTrack: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden', backgroundColor: C.border },
  undoFill: { height: 4, borderRadius: 2, backgroundColor: C.primary },
  modalFrame: { flex: 1 },
  modalBackdrop: { flex: 1 },
  modalScrim: { backgroundColor: C.scrim },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialogPanelFrame: { width: '100%', maxWidth: 560 },
  dialogPanel: { flex: 0, minHeight: 200, maxHeight: '86%', width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: C.card, elevation: 12 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choice: { minHeight: 48, borderWidth: 1, borderColor: C.input, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card },
  choiceIcon: { width: 20, fontSize: 18, color: C.foreground },
  uncertainCatch: { borderLeftWidth: 4, borderLeftColor: C.amber, borderRadius: 14 },
  uncertainText: { color: C.warning, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_700Bold' },
  catchSpecies: { color: C.foreground, fontSize: 16, lineHeight: 21, fontFamily: 'Inter_700Bold' },
  weightInputWrap: { width: 112, height: 56, position: 'relative' },
  weightInput: { width: 112, height: 56, paddingHorizontal: 10, paddingRight: 32, borderWidth: 1, borderColor: C.input, borderRadius: 10, backgroundColor: C.card, color: C.foreground, fontSize: 18, lineHeight: 24 },
  weightUnit: { position: 'absolute', right: 9, top: 17, color: C.mutedForeground, fontSize: 14, lineHeight: 20 },
  priceChip: { minHeight: 48, borderWidth: 1, borderColor: C.input, borderRadius: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  priceChipText: { color: C.foreground, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  computedValue: { color: C.foreground, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  photoStrip: { minHeight: 88, padding: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  photoThumb: { width: 96, height: 72, borderRadius: 10 },
  photoTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: C.border },
  photoProgress: { height: 6, backgroundColor: C.processing },
  suggestionGroup: { gap: 10, borderTopWidth: 1, borderColor: C.border, paddingTop: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10 },
  noCatchCheck: { minHeight: 48 },
  badge: { alignSelf: 'flex-start', minHeight: 36, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_700Bold', fontWeight: '700' },
  notice: { borderRadius: 12, padding: 12, backgroundColor: C.muted, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  error: { color: C.destructive, fontSize: 14, lineHeight: 20 },
  screen: { flex: 1, backgroundColor: C.background, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  saved: { fontSize: 14, color: C.foreground, maxWidth: 110, textAlign: 'right' },
  offline: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.muted, flexDirection: 'row', alignItems: 'center', gap: 8 },
  offlinePill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 10, backgroundColor: C.muted, flexDirection: 'row', alignItems: 'center', gap: 5 },
  savedConfirmation: { minHeight: 56, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingLeft: 12, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card },
  savedConfirmationText: { flex: 1, minWidth: 0 },
  confirmAction: { minWidth: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  compactRecordCard: { minHeight: 112, padding: 10, gap: 4, position: 'relative', overflow: 'hidden' },
  compactRecordTitle: { color: C.foreground, fontSize: 17, lineHeight: 22, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  compactEdit: { minWidth: 80, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 8 },
  compactEditText: { color: C.primary, fontSize: 14, lineHeight: 18, fontFamily: 'Inter_700Bold' },
  daySummary: { color: C.foreground, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  reviewRow: { minHeight: 56, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  footer: { backgroundColor: C.card, borderTopWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  keyboardToolbar: { backgroundColor: C.card, borderTopWidth: 1, borderColor: C.border, padding: 8 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, gap: 4 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.border },
  line: { borderTopWidth: 1, borderColor: C.border, paddingTop: 12, gap: 8 },
});
