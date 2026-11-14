import React, { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { usePrototype } from '@/lib/prototype/store';
import { configureLayoutMotion, useMotionPrefs } from './motion';
import {
  SPECIES, blankLine, dayKey, dayPriceFor, needsCheck, numberValue, priceYesterday,
  speciesName, timeLabel, type CatchLine, type CatchRecord,
} from '@/lib/prototype/model';
import { ActionBar, Btn, C, Field, Heading, Notice, Overlay, StatusChip, Txt, s, useRegisterKeyboardActions } from './ui';

const demoImage = require('../../assets/images/demo-rabbitfish.jpg');

const money = (value: number) => `Ksh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export function SpeciesPicker({ record, onSelect, onClose }: {
  record?: Pick<CatchRecord, 'site' | 'date'>; onSelect: (id: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const { data } = usePrototype();
  if (!data) return null;
  const site = record?.site ?? data.settings.site, date = record?.date ?? new Date().toISOString();
  const seen = [...new Set(data.records.filter(r => !r.deleted && r.site === site && dayKey(r.date) === dayKey(date))
    .flatMap(r => r.lines.map(l => l.speciesId)))].sort((a, b) => a === 'Mixed demersals' ? -1 : b === 'Mixed demersals' ? 1 : 0);
  const found = SPECIES.filter(sp => `${sp.common} ${sp.local}`.toLowerCase().includes(query.toLowerCase()));
  const groups = ['Demersal', 'Pelagic', 'Other invertebrates', 'Crustaceans'];
  return <Overlay title="Add species" variant="page" onClose={onClose}>
    <Field label="Search species" placeholder="Search species" value={query} onChange={setQuery} />
    {seen.length ? <>
      <Heading>Seen today</Heading>
      <View style={s.wrap}>{seen.filter(id => found.some(item => item.id === id)).map(id => <Btn key={id} label={speciesName(id)} kind="secondary" closeOnPress onPress={() => onSelect(id)} />)}</View>
    </> : null}
    {groups.map(group => {
      const species = found.filter(sp => sp.group === group && !seen.includes(sp.id));
      if (!species.length) return null;
      const ordered = group === 'Demersal' ? [...species].sort((a, b) => a.id === 'Mixed demersals' ? -1 : b.id === 'Mixed demersals' ? 1 : 0) : species;
      return <View key={group} style={{ gap: 8 }}><Heading>{group}</Heading>
        {ordered.map(sp => <Btn key={sp.id} label={speciesName(sp.id)} testID={`species-${sp.id.toLowerCase().replaceAll(' ', '-')}`}
          kind="secondary" closeOnPress onPress={() => onSelect(sp.id)} />)}
      </View>;
    })}
    {!found.length ? <Txt>No species match this search.</Txt> : null}
  </Overlay>;
}

function CatchLineRow({ line, record, original, lines, open, weightRefs, onToggle, onChange, onChangeSpecies, onRemove,
  onSetDailyPrice, setFirstPriceOnBlur, onFixEarlier }: {
  line: CatchLine; record: CatchRecord; original?: CatchRecord; lines: CatchLine[]; open: boolean;
  weightRefs: React.MutableRefObject<Record<string, TextInput | null>>;
  onToggle: () => void; onChange: (patch: Partial<CatchLine>) => void; onChangeSpecies: () => void; onRemove: () => void;
  onSetDailyPrice: (speciesId: string, price: string) => void; setFirstPriceOnBlur: boolean;
  onFixEarlier: (recordIds: string[], speciesId: string, price: string) => void;
}) {
  const { data } = usePrototype();
  const registerKeyboardActions = useRegisterKeyboardActions();
  const priceRef = useRef<TextInput>(null);
  const [priceOpen, setPriceOpen] = useState(false), [showFixEarlier, setShowFixEarlier] = useState(false), [fixEarlier, setFixEarlier] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  if (!data) return null;
  const uncertain = !line.checked && line.speciesId !== 'Mixed demersals';
  const daily = dayPriceFor(data, line.speciesId, record.id);
  const yesterday = priceYesterday(data, line.speciesId, record.id);
  const weight = numberValue(line.weight), price = numberValue(line.price);
  const value = weight !== null && price !== null ? weight * price : null;
  const sourceLabel = line.priceSource === "today's price" && line.priceSetAt
    ? `Today's price, set ${timeLabel(line.priceSetAt)}` : line.priceSource === 'changed here' ? 'Changed here' : '';
  const nextLine = lines[lines.findIndex(item => item.id === line.id) + 1];
  const candidates = data.records.filter(r => !r.deleted && r.id !== record.id && r.site === record.site
    && dayKey(r.date) === dayKey(record.date) && r.date < record.date)
    .filter(r => r.lines.some(item => item.speciesId === line.speciesId && item.price !== line.price));
  const applyYesterday = () => {
    onChange({ price: yesterday, priceSource: 'typed here', priceSetAt: new Date().toISOString() });
    if (setFirstPriceOnBlur) onSetDailyPrice(line.speciesId, yesterday);
    setPriceOpen(false);
  };
  const handleWeight = (weightValue: string) => onChange({ weight: weightValue, ...(weightValue.trim() ? { checked: true } : {}) });
  const focusPrice = () => {
    setPriceOpen(true);
    setTimeout(() => priceRef.current?.focus(), 80);
  };
  const goNext = () => { if (nextLine) weightRefs.current[nextLine.id]?.focus(); else Keyboard.dismiss(); };
  const onChangeSpeciesById = (speciesId: string) => {
    const knownPrice = dayPriceFor(data, speciesId, record.id);
    onChange({ speciesId, checked: true, alternatives: undefined,
      ...(line.price ? { priceSource: 'changed here' as const } : knownPrice ? { price: knownPrice.price, priceSource: "today's price" as const, priceSetAt: knownPrice.setAt } : {}) });
  };

  return <View style={[s.card, { padding: 10, gap: 8, minHeight: 72 }, uncertain && s.uncertainCatch]}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Close' : 'Open'} details for ${speciesName(line.speciesId)}`}
          onPress={onToggle} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text numberOfLines={2} style={s.catchSpecies}>{speciesName(line.speciesId)}</Text>
          {line.count && line.speciesId !== 'Mixed demersals' ? <Txt small muted>{`About ${line.count} fish`}</Txt> : null}
        </Pressable>
        {uncertain ? <Text style={s.uncertainText}>Check species</Text> : null}
      </View>
      <View style={{ width: 112, gap: 6 }}>
        <View style={s.weightInputWrap}>
          <TextInput ref={ref => { weightRefs.current[line.id] = ref; }} value={line.weight} testID={`weight-${line.id}`}
            accessibilityLabel={`Weight for ${speciesName(line.speciesId)} in kg`}
            keyboardType="decimal-pad" returnKeyType={nextLine ? 'next' : 'done'}
            onFocus={() => registerKeyboardActions({ next: goNext })} onBlur={() => registerKeyboardActions(null)}
            onSubmitEditing={goNext} onChangeText={handleWeight} style={s.weightInput} />
          <Text pointerEvents="none" style={s.weightUnit}>kg</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={price !== null ? `${money(price)} per kg` : line.price ? 'Check price' : "Set today's price"}
          testID={`price-chip-${line.id}`}
          onPress={focusPrice} style={s.priceChip}>
          <Text numberOfLines={2} style={s.priceChipText}>{price !== null ? `${money(price)}/kg` : line.price ? 'Check price' : "Set today's price"}</Text>
        </Pressable>
      </View>
    </View>
    {uncertain ? <View style={s.wrap}>
      {(line.alternatives ?? []).slice(0, 2).map(id => <Btn key={id} label={speciesName(id)} kind="secondary" onPress={() => onChangeSpeciesById(id)} />)}
      <Btn label="Other…" kind="secondary" onPress={onChangeSpecies} />
    </View> : null}
    <View style={s.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {sourceLabel ? <Txt small muted>{sourceLabel}</Txt> : null}
        {yesterday && !line.price ? <Btn label={`Yesterday: ${money(Number(yesterday))}`} kind="quiet" onPress={applyYesterday} /> : null}
      </View>
      <Text style={s.computedValue}>{value === null ? '—' : money(value)}</Text>
    </View>
    {priceOpen ? <>
      <Field label="Price per kg (Ksh)" value={line.price} numeric testID={`price-${line.id}`} onChange={priceValue => {
        onChange({ price: priceValue, priceSource: daily ? 'changed here' : 'typed here', priceSetAt: new Date().toISOString() });
      }} inputRef={priceRef} onFocus={() => registerKeyboardActions({ next: goNext })} onBlur={() => {
        registerKeyboardActions(null);
        if (setFirstPriceOnBlur && !daily && numberValue(line.price) !== null) onSetDailyPrice(line.speciesId, line.price);
      }} />
      {daily && line.price && numberValue(line.price) !== null && line.price !== daily.price ? <View style={{ gap: 8 }}>
        <Txt small muted>Change the shared price for this day?</Txt>
        <ActionBar secondary={<Btn label="Only this fisher" kind="secondary" onPress={() => setPriceOpen(false)} />}
          primary={<Btn label="All later fishers today" onPress={() => {
            onSetDailyPrice(line.speciesId, line.price);
            setPriceOpen(false);
            setShowFixEarlier(candidates.length > 0);
          }} />} />
      </View> : null}
      <Btn label="Done with price" kind="quiet" onPress={() => { setPriceOpen(false); Keyboard.dismiss(); }} />
    </> : null}
    {showFixEarlier && candidates.length ? <Btn label="Fix earlier records" kind="quiet" onPress={() => { setSelectedRecords([]); setFixEarlier(true); setPriceOpen(false); }} /> : null}
    {open ? <View style={{ gap: 8, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}>
      {line.speciesId !== 'Mixed demersals' ? <Field label="Number of fish" value={line.count} numeric onChange={count => onChange({ count })}
        onFocus={() => registerKeyboardActions({ next: goNext })} onBlur={() => registerKeyboardActions(null)} /> : null}
      {!priceOpen ? <Btn label="Change price" kind="quiet" onPress={focusPrice} /> : null}
      <Field label="Remarks" value={line.remarks} multiline onChange={remarks => onChange({ remarks })} />
      <View style={[s.actionBar, { gap: 8 }]}>
        <Btn label="Change species" kind="secondary" onPress={onChangeSpecies} />
        <Btn label="Remove" kind="quiet" icon="trash-2" onPress={onRemove} />
      </View>
    </View> : null}
    {fixEarlier && candidates.length ? <Overlay title="Fix earlier records" variant="dialog" onClose={() => setFixEarlier(false)}
      footer={<ActionBar secondary={<Btn label="Cancel" kind="secondary" closeOnPress onPress={() => {}} />}
        primary={<Btn label="Apply to selected" disabled={!selectedRecords.length} closeOnPress onPress={() => {
          onFixEarlier(selectedRecords, line.speciesId, line.price);
          return true;
        }} />} />}>
      <Txt>Update earlier records from this landing day. Each correction will be added to its history.</Txt>
      {candidates.map(candidate => {
        const old = candidate.lines.find(item => item.speciesId === line.speciesId);
        const checked = selectedRecords.includes(candidate.id);
        const fisher = data.fishers.find(person => person.id === candidate.fisherId)?.name || 'No fisher';
        return <Pressable key={candidate.id} accessibilityRole="checkbox" accessibilityState={{ checked }}
          onPress={() => setSelectedRecords(list => checked ? list.filter(id => id !== candidate.id) : [...list, candidate.id])}
          style={[s.choice, { alignItems: 'flex-start' }]}>
          <Feather name={checked ? 'check-square' : 'square'} size={20} color={C.foreground} />
          <View><Txt bold>{candidate.boatName} · {fisher}</Txt><Txt small muted>{old?.price ? `${money(Number(old.price))}/kg` : 'No price yet'} → {money(Number(line.price))}/kg</Txt></View>
        </Pressable>;
      })}
    </Overlay> : null}
  </View>;
}

export function CatchReview({ r, onChange, onRemove, onSetDailyPrice, onRetakePhoto, original, showNotes = true, setFirstPriceOnBlur = true }: {
  r: CatchRecord; onChange: (patch: Partial<CatchRecord>) => void; onRemove: (lineId: string) => void;
  onSetDailyPrice: (speciesId: string, price: string) => void;
  setFirstPriceOnBlur?: boolean;
  onRetakePhoto?: () => void; original?: CatchRecord; showNotes?: boolean;
}) {
  const { data, change } = usePrototype();
  const reduceMotion = useMotionPrefs();
  const [picker, setPicker] = useState(''), [enlarge, setEnlarge] = useState(false);
  const [openLine, setOpenLine] = useState(''), [noteOpen, setNoteOpen] = useState(!!r.notes);
  const weightRefs = useRef<Record<string, TextInput | null>>({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  if (!data) return null;
  const checkedLines = r.lines.filter(line => line.checked || line.speciesId === 'Mixed demersals');
  const uncertainLines = r.lines.filter(line => !line.checked && line.speciesId !== 'Mixed demersals');
  const lines = [...uncertainLines, ...checkedLines];
  const todaySpecies = [...new Set(data.records.filter(item => !item.deleted && item.site === r.site && dayKey(item.date) === dayKey(r.date))
    .flatMap(item => item.lines.map(line => line.speciesId)))].sort((a, b) => a === 'Mixed demersals' ? -1 : b === 'Mixed demersals' ? 1 : 0);
  const elapsed = Math.max(0, (now - (r.photo?.startedAt ?? now)) / 1000);
  const duration = Math.max(1, ((r.photo?.dueAt ?? now) - (r.photo?.startedAt ?? now)) / 1000);
  const progress = Math.min(99, Math.max(1, Math.floor(elapsed / duration * 100)));
  const remaining = Math.max(1, Math.ceil(((r.photo?.dueAt ?? now) - now) / 1000));
  const addSpecies = (speciesId: string) => {
    const existing = r.lines.find(line => line.speciesId === speciesId);
    if (existing) { setOpenLine(existing.id); return; }
    const daily = dayPriceFor(data, speciesId, r.id);
    const line = blankLine(speciesId, daily?.price ?? '', daily?.setAt);
    configureLayoutMotion(reduceMotion);
    onChange({ noCatch: false, lines: [...r.lines, line] });
    setOpenLine(line.id);
  };
  const updateLine = (id: string, patch: Partial<CatchLine>) => onChange({ lines: r.lines.map(line => {
    if (line.id !== id) return line;
    const next = { ...line, ...patch };
    if (patch.price !== undefined && patch.price !== line.price) {
      const daily = dayPriceFor(data, line.speciesId, r.id);
      next.priceSource = daily ? patch.price === daily.price ? "today's price" : 'changed here' : 'typed here';
      next.priceSetAt = daily && patch.price === daily.price ? daily.setAt : new Date().toISOString();
    }
    if (patch.weight?.trim()) next.checked = true;
    return next;
  }) });
  const chooseSpecies = (speciesId: string) => {
    if (!picker) return;
    const current = r.lines.find(line => line.id === picker);
    const daily = dayPriceFor(data, speciesId, r.id);
    if (current) onChange({ lines: r.lines.map(line => line.id !== picker ? line : {
      ...line, speciesId, checked: true, alternatives: undefined,
      ...(line.price ? { priceSource: 'changed here' as const } : daily ? { price: daily.price, priceSource: "today's price" as const, priceSetAt: daily.setAt } : {}),
    }) });
    setOpenLine(picker);
  };
  const applyEarlier = (recordIds: string[], speciesId: string, price: string) => {
    const at = new Date().toISOString();
    void change(state => ({ ...state, records: state.records.map(record => recordIds.includes(record.id)
      ? { ...record, lines: record.lines.map(line => line.speciesId === speciesId
        ? { ...line, price, priceSource: 'changed here' as const, priceSetAt: at } : line),
        status: record.status === 'Sent' || record.sentAt ? 'Needs review' : record.status, sentAt: undefined,
        revision: record.revision + 1, editedAt: at,
        history: [...record.history, { at, field: `${speciesName(speciesId)} · Price per kg`, was: record.lines.find(line => line.speciesId === speciesId)?.price || 'No value yet',
          now: price, reason: 'Wrong price' }] }
      : record) }));
  };

  return <>
    {r.photo ? <View style={s.photoStrip}>
      <Pressable accessibilityRole="button" accessibilityLabel="View photo" onPress={() => setEnlarge(true)}>
        <Image source={demoImage} style={s.photoThumb} resizeMode="cover" />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {r.photo.state === 'processing' ? <>
          <Txt bold>Reading photo</Txt>
          <View accessibilityLabel={`Reading progress ${progress}%`} style={s.photoTrack}><View style={[s.photoProgress, { width: `${progress}%` }]} /></View>
          <Txt small muted>{progress}%, about {remaining} s left</Txt>
          {elapsed >= 10 ? <Btn label="Cancel photo reading" kind="quiet" onPress={() => onChange({ photo: { ...r.photo!, state: 'cancelled' } })} /> : null}
        </> : <Animated.View key={r.photo.state} entering={reduceMotion ? FadeIn.duration(100) : FadeIn.duration(200)} style={{ flex: 1, gap: 4 }}>
          <View style={s.row}><Txt bold>Photo</Txt>
            <StatusChip status={r.photo.state === 'ready' ? 'Photo read' : r.photo.state === 'empty' ? 'No fish found' : r.photo.state === 'cancelled' ? 'Cancelled' : "Couldn't read photo"} />
          </View>
          <View style={s.row}>
            <Btn label="View photo" kind="quiet" onPress={() => setEnlarge(true)} />
            {r.photo.state === 'error' ? <Btn label="Retake photo" kind="secondary" onPress={() => onRetakePhoto ? onRetakePhoto() : onChange({ photo: { ...r.photo!, state: 'preview' } })} /> : null}
          </View>
          {r.photo.state === 'error' ? <Txt small>We could not read this photo. Add species yourself or retake.</Txt> : null}
          {r.photo.state === 'empty' ? <Txt small>No fish found in this photo.</Txt> : null}
        </Animated.View>}
      </View>
    </View> : null}
    {r.photo?.state === 'ready' ? <View style={s.row}>
      <Txt small muted>{r.lines.filter(line => line.origin === 'photo').length + r.suggestions.length} species from photo</Txt>
       {uncertainLines.length ? <View style={s.row}><View style={s.uncertainDot} /><Text style={s.uncertainText}>{uncertainLines.length} to check</Text></View> : null}
    </View> : null}
    {r.photo?.state === 'processing' ? <Notice>Photo reading can continue while you add species. Saving now keeps this record in review.</Notice> : null}
    {r.noCatch ? <Notice>No catch recorded for this fisher.</Notice> : null}
    {!r.noCatch && lines.map(line => <Animated.View key={line.id} entering={reduceMotion ? FadeIn.duration(100) : FadeIn.duration(150)} exiting={reduceMotion ? FadeOut.duration(100) : FadeOut.duration(150)}>
      <CatchLineRow line={line} record={r} original={original} lines={lines} weightRefs={weightRefs}
        open={openLine === line.id} onToggle={() => { configureLayoutMotion(reduceMotion); setOpenLine(openLine === line.id ? '' : line.id); }}
        onChange={patch => updateLine(line.id, patch)} onChangeSpecies={() => setPicker(line.id)}
        onRemove={() => onRemove(line.id)} onSetDailyPrice={onSetDailyPrice} setFirstPriceOnBlur={setFirstPriceOnBlur} onFixEarlier={applyEarlier} />
    </Animated.View>)}
    {r.suggestions.length ? <View style={s.suggestionGroup}>
      <Heading>Suggested from photo</Heading>
      {r.suggestions.map(suggestion => <View key={suggestion.id} style={s.suggestionRow}>
        <View style={{ flex: 1 }}><Txt bold>{speciesName(suggestion.speciesId)}</Txt>
          <Txt small muted>{suggestion.count ? `About ${suggestion.count} fish` : 'Suggested species'}</Txt>
          {!suggestion.checked ? <Text style={s.uncertainText}>Check species</Text> : null}</View>
        <ActionBar secondary={<Btn label="Dismiss" kind="quiet" onPress={() => onChange({ suggestions: r.suggestions.filter(item => item.id !== suggestion.id) })} />}
          primary={<Btn label="Add" onPress={() => onChange({ suggestions: r.suggestions.filter(item => item.id !== suggestion.id), lines: [...r.lines, suggestion], noCatch: false })} />} />
      </View>)}
    </View> : null}
    <>
      <ActionBar secondary={<Btn label="Add species" icon="plus" kind="secondary" onPress={() => setPicker('new')} />}
        primary={<Btn label="Mixed catch" kind="secondary" onPress={() => addSpecies('Mixed demersals')} />} />
      {todaySpecies.length ? <View style={{ gap: 4 }}><Txt small muted>Seen today</Txt><View style={s.wrap}>
        {todaySpecies.slice(0, 6).map(id => <Btn key={id} label={speciesName(id)} kind="quiet" onPress={() => addSpecies(id)} />)}
      </View></View> : null}
      {!r.lines.length && !r.photo ? <Pressable accessibilityRole="checkbox" accessibilityLabel="No catch from this fisher"
        accessibilityState={{ checked: r.noCatch }} onPress={() => onChange({ noCatch: !r.noCatch })}
        style={[s.choice, r.noCatch && { backgroundColor: C.seaGlass, borderColor: C.primary, borderWidth: 2 }]}>
         <Feather name={r.noCatch ? 'check-square' : 'square'} size={20} color={C.foreground} /><Txt>No catch from this fisher</Txt>
      </Pressable> : null}
    </>
    {showNotes ? <>
      <Btn label={noteOpen ? 'Hide note' : 'Add note'} kind="quiet" icon="edit-3"
        onPress={() => { configureLayoutMotion(reduceMotion); setNoteOpen(!noteOpen); }} />
      {noteOpen ? <Field label="Notes" value={r.notes} before={original?.notes} onChange={notes => onChange({ notes })} multiline /> : null}
    </> : null}
    {picker === 'new' ? <SpeciesPicker record={r} onSelect={addSpecies} onClose={() => setPicker('')} /> : null}
    {picker && picker !== 'new' ? <SpeciesPicker record={r} onSelect={chooseSpecies} onClose={() => setPicker('')} /> : null}
    {enlarge ? <Overlay title="Photo" onClose={() => setEnlarge(false)}>
      <Image source={demoImage} style={{ width: '100%', height: 350 }} resizeMode="contain" /><Txt>Illustrative catch photo.</Txt>
    </Overlay> : null}
  </>;
}
