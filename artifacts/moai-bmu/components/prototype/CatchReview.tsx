import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { usePrototype } from '@/lib/prototype/store';
import { SPECIES, blankLine, needsCheck, priceToday, speciesName, totalText, totals, type CatchLine, type CatchRecord } from '@/lib/prototype/model';
import { Badge, Btn, C, Card, Field, Heading, Notice, Overlay, Txt, s } from './ui';

const demoImage = require('../../assets/images/demo-rabbitfish.jpg');
export function SpeciesPicker({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { data } = usePrototype();
  const recent = [...new Set((data?.records ?? []).filter(r => !r.deleted).flatMap(r => r.lines.map(l => l.speciesId)))].slice(0, 5);
  const found = SPECIES.filter(sp => `${sp.common} ${sp.local}`.toLowerCase().includes(query.toLowerCase()));
  return <Overlay title="Choose species" onClose={onClose}>
    <Field label="Search species" value={query} onChange={setQuery} />
    {!query && recent.length ? <><Heading>Recent species</Heading>{recent.map(id => <Btn key={id} label={speciesName(id)} kind="secondary" onPress={() => onSelect(id)} />)}</> : null}
    {['Demersal', 'Pelagic', 'Other invertebrates', 'Crustaceans'].map(group => {
      const species = found.filter(sp => sp.group === group);
      return species.length ? <View key={group} style={{ gap: 8 }}><Heading>{group}</Heading>
        {species.map(sp => <Btn key={sp.id} label={speciesName(sp.id)} testID={`species-${sp.id.toLowerCase().replaceAll(' ', '-')}`} kind="secondary" onPress={() => onSelect(sp.id)} />)}
      </View> : null;
    })}
    {!found.length ? <Txt>No species match this search.</Txt> : null}
  </Overlay>;
}
function LineFields({ line, before, update, compact = false }: {
  line: CatchLine; before?: CatchLine; update: (patch: Partial<CatchLine>) => void; compact?: boolean;
}) {
  return <>
    <Field label="Weight (kg)" value={line.weight} before={before?.weight} numeric onChange={weight => update({ weight })} testID={`weight-${line.id}`} />
    <Field label="Price per kg (Ksh)" value={line.price} before={before?.price} numeric onChange={price => update({ price })} testID={`price-${line.id}`} hint="Last price entered today for this species is recalled when available." />
    {!compact ? <>
      <Field label="Approximate number" value={line.count} before={before?.count} numeric onChange={count => update({ count })} />
      <Field label="Remarks" value={line.remarks} before={before?.remarks} multiline onChange={remarks => update({ remarks })} />
    </> : null}
  </>;
}
export function CatchReview({ r, onChange, onRemove, original, showNotes = true }: {
  r: CatchRecord; onChange: (patch: Partial<CatchRecord>) => void; onRemove: (lineId: string) => void; original?: CatchRecord; showNotes?: boolean;
}) {
  const { data } = usePrototype();
  const [picker, setPicker] = useState<string | null>(null), [enlarge, setEnlarge] = useState(false);
  const [looksOpen, setLooksOpen] = useState(false), [openLine, setOpenLine] = useState(''), [noteOpen, setNoteOpen] = useState(!!r.notes);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  if (!data) return null;
  const updateLine = (id: string, patch: Partial<CatchLine>) => onChange({ lines: r.lines.map(l => l.id === id ? { ...l, ...patch } : l) });
  const unchecked = r.lines.filter(l => !l.checked), checked = r.lines.filter(l => l.checked);
  const elapsed = Math.max(0, (now - (r.photo?.startedAt ?? now)) / 1000);
  const progress = Math.min(99, Math.max(1, Math.floor((now - (r.photo?.startedAt ?? now)) / Math.max(1, (r.photo?.dueAt ?? now) - (r.photo?.startedAt ?? now)) * 100)));
  const t = totals(r.lines);
  const chooseSpecies = (speciesId: string) => {
    if (picker === 'new') {
      const line = blankLine(speciesId, priceToday(data, speciesId, r.id));
      onChange({ lines: [...r.lines, line] }); setLooksOpen(true); setOpenLine(line.id);
    } else if (picker) {
      // Correcting identity never replaces a typed weight or price.
      updateLine(picker, { speciesId, checked: true });
      setLooksOpen(true); setOpenLine(picker);
    }
    setPicker(null);
  };
  const rowActions = (l: CatchLine) => <>
    <Btn label={`Change ${l.speciesId}`} kind="secondary" icon="edit-3" onPress={() => setPicker(l.id)} />
    <Btn label={`Remove ${l.speciesId}`} kind="quiet" icon="trash-2" onPress={() => onRemove(l.id)} />
  </>;
  return <>
    {r.photo ? <Card>
      <Pressable accessibilityRole="button" accessibilityLabel="Enlarge photo" onPress={() => setEnlarge(true)} style={{ minHeight: 100 }}>
        <Image source={demoImage} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" />
      </Pressable>
      <Txt small muted>Prepared photo {r.photo.scenario} · tap to enlarge</Txt>
      <Badge status={r.photo.state === 'processing' ? 'Processing' : r.photo.state === 'ready' ? 'Photo read' : r.photo.state === 'cancelled' ? 'Cancelled' : 'Needs review'} />
      {r.photo.state === 'processing' ? <>
        <Txt>Reading your photo. You can keep going.</Txt>
        {elapsed >= 1 ? <View accessibilityLabel={`Reading progress ${progress}%`} style={{ height: 8, borderRadius: 4, backgroundColor: C.border }}>
          <View style={{ height: 8, borderRadius: 4, width: `${progress}%`, backgroundColor: C.processing }} />
        </View> : null}
        {elapsed >= 10 ? <><Txt>{progress}% · {Math.floor(elapsed)} seconds</Txt><Btn label="Cancel photo reading" kind="secondary" onPress={() => onChange({ photo: { ...r.photo!, state: 'cancelled' } })} /></> : null}
      </> : r.photo.state === 'ready' ? <Notice>Photo read: 8 species found. {needsCheck(r)} added species need checking.</Notice>
        : <Notice>{r.photo.state === 'cancelled' ? 'Photo reading cancelled. Add species yourself.' : 'No fish found. Add species yourself.'}{r.photo.state === 'error' ? ' Prepared error outcome; no model was called.' : ''}</Notice>}
    </Card> : null}
    <Heading>{new Set(r.lines.map(l => l.speciesId)).size} species · {unchecked.length} need checking</Heading>
    {unchecked.length ? <>
      <Heading>Needs checking</Heading>
      {unchecked.map(l => <Card key={l.id}>
        <Txt bold>{speciesName(l.speciesId)}</Txt><Txt>About {l.count || 'an unknown number of'} fish · Low confidence</Txt>
        <LineFields line={l} before={original?.lines.find(old => old.id === l.id)} update={patch => updateLine(l.id, patch)} />
        <Btn label={`Looks right: ${l.speciesId}`} icon="check" onPress={() => updateLine(l.id, { checked: true })} />
        {rowActions(l)}
      </Card>)}
    </> : null}
    <Btn label={`Looks right · ${checked.length} species${looksOpen ? ' · collapse' : ' · expand'}`} icon={looksOpen ? 'chevron-up' : 'chevron-down'} kind="secondary" onPress={() => setLooksOpen(!looksOpen)} />
    {looksOpen ? checked.map(l => <Card key={l.id}>
      <Btn kind="quiet" label={speciesName(l.speciesId)} onPress={() => setOpenLine(openLine === l.id ? '' : l.id)} />
      <Txt>{l.count ? `About ${l.count} fish · ` : ''}{l.weight ? `${l.weight} kg` : 'Weight not entered'}</Txt>
      {original && original.lines.find(old => old.id === l.id)?.speciesId !== l.speciesId ? <Txt small bold>Changed species · Was: {speciesName(original.lines.find(old => old.id === l.id)?.speciesId ?? 'Not entered')}</Txt> : null}
      {openLine === l.id ? <><LineFields line={l} before={original?.lines.find(old => old.id === l.id)} update={patch => updateLine(l.id, patch)} />{rowActions(l)}</> : null}
    </Card>) : null}
    {r.suggestions.length ? <Card>
      <Heading>Suggested from photo</Heading>
      <Txt>These suggestions are not in your totals. Your typed lines were not changed. Add only the ones you need.</Txt>
      {r.suggestions.map(l => <View key={l.id} style={s.line}>
        <Txt bold>{speciesName(l.speciesId)}</Txt><Txt>About {l.count} fish{!l.checked ? ' · Low confidence' : ''}</Txt>
        <Btn label={`Add ${l.speciesId}`} kind="secondary" onPress={() => onChange({ lines: [...r.lines, l], suggestions: r.suggestions.filter(sp => sp.id !== l.id) })} />
        <Btn label={`Dismiss ${l.speciesId}`} kind="quiet" onPress={() => onChange({ suggestions: r.suggestions.filter(sp => sp.id !== l.id) })} />
      </View>)}
    </Card> : null}
    <Btn label="Add species" icon="plus" kind="secondary" onPress={() => setPicker('new')} />
    {!r.lines.length ? <Txt muted>No catch lines yet. Catch measurements are optional.</Txt> : null}
    {showNotes ? <>
      <Btn label={noteOpen ? 'Hide note' : 'Add note'} kind="quiet" icon="edit-3" onPress={() => setNoteOpen(!noteOpen)} />
      {noteOpen ? <Field label="Notes" value={r.notes} before={original?.notes} onChange={notes => onChange({ notes })} multiline /> : null}
    </> : null}
    <Card><Txt bold>{totalText(r.lines)}</Txt>
      {t.missingWeights ? <Txt>Some weights not entered ({t.missingWeights}).</Txt> : null}
      {t.missingValues ? <Txt>Some values cannot be calculated ({t.missingValues}); missing weights or prices are not treated as zero.</Txt> : null}
    </Card>
    {picker ? <SpeciesPicker onSelect={chooseSpecies} onClose={() => setPicker(null)} /> : null}
    {enlarge ? <Overlay title={`Prepared photo ${r.photo?.scenario}`} onClose={() => setEnlarge(false)}><Image source={demoImage} style={{ width: '100%', height: 350 }} resizeMode="contain" /><Txt>Illustrative source photo. Only canned species and counts are suggested.</Txt></Overlay> : null}
  </>;
}
