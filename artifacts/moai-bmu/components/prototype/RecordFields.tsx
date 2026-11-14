import React, { useState } from 'react';
import { View } from 'react-native';
import { usePrototype } from '@/lib/prototype/store';
import { GEARS, PROPULSIONS, VESSELS, id, selectBoat, type Boat, type CatchRecord } from '@/lib/prototype/model';
import { Btn, Card, Choices, Field, Heading, Notice, Overlay, Select, Txt, s } from './ui';

export const BOAT_DETAIL_FIELDS = ['vesselType', 'propulsion', 'horsepower', 'length', 'registration', 'crew'] as const;
export function BoatFields({ r, onChange, original }: { r: CatchRecord; onChange: (patch: Partial<CatchRecord>) => void; original?: CatchRecord }) {
  const { data, change, saved, error } = usePrototype();
  const [adding, setAdding] = useState<'boat' | 'fisher' | null>(null);
  const [name, setName] = useState(''), [vessel, setVessel] = useState('');
  if (!data) return null;
  const recency = [...data.records].sort((a, b) => b.date.localeCompare(a.date)).map(r => r.boatId);
  const boats = [...data.boats].sort((a, b) => (recency.indexOf(a.id) < 0 ? 999 : recency.indexOf(a.id)) - (recency.indexOf(b.id) < 0 ? 999 : recency.indexOf(b.id)));
  const fishers = [...data.fishers].sort((a, b) => Number(b.boatIds.includes(r.boatId)) - Number(a.boatIds.includes(r.boatId)));
  const create = async () => {
    if (!name.trim()) return false;
    if (adding === 'boat') {
      const boat: Boat = { id: id('boat'), name: name.trim(), vesselType: vessel, propulsion: '', horsepower: '', length: '', registration: '', crew: '' };
      if (!await change(s => ({ ...s, boats: [...s.boats, boat] }))) return false;
      onChange(selectBoat(r, boat));
    } else {
      const fisher = { id: id('fisher'), name: name.trim(), boatIds: r.boatId ? [r.boatId] : [] };
      if (!await change(s => ({ ...s, fishers: [...s.fishers, fisher] }))) return false;
      onChange({ fisherId: fisher.id });
    }
    return true;
  };
  return <>
    <Select label="Boat" value={r.boatId} before={original?.boatId} allowEmpty={false}
      options={boats.map(b => ({ value: b.id, label: b.name, detail: b.vesselType || 'No vessel type' }))}
      onChange={value => { const b = data.boats.find(b => b.id === value); if (b) onChange(selectBoat(r, b)); }} />
    <Btn label="Add new boat" kind="secondary" icon="plus" onPress={() => { setName(''); setVessel(''); setAdding('boat'); }} />
    <Select label="Fisher" value={r.fisherId} before={original?.fisherId}
      options={fishers.map(f => ({ value: f.id, label: f.name, detail: f.boatIds.includes(r.boatId) ? 'Linked to this boat' : undefined }))}
      onChange={fisherId => onChange({ fisherId })} />
    <Btn label="Add new fisher" kind="secondary" icon="plus" onPress={() => { setName(''); setAdding('fisher'); }} />
    <Notice>Only the boat is required. Every other field is optional.</Notice>
    {adding ? <Overlay title={adding === 'boat' ? 'Add new boat' : 'Add new fisher'} onClose={() => setAdding(null)}
      saved={error ? 'Not saved' : saved ? 'Saved on this phone' : 'Saving…'}
      footer={<Btn label={adding === 'boat' ? 'Save boat' : 'Save fisher'} disabled={!name.trim()} closeOnPress
        disabledReason={!name.trim() ? `Enter a ${adding} name to continue.` : undefined} onPress={create} />}>
      <Field label="Name" value={name} onChange={setName} />
      {adding === 'boat' ? <Select label="Vessel type" value={vessel} options={VESSELS.map(v => ({ value: v, label: v }))} onChange={setVessel} /> : null}
      <Txt muted>Synthetic names only. This registry is saved on this phone.</Txt>
    </Overlay> : null}
  </>;
}
export function BoatDetails({ r, onChange, original, showScope = true }: {
  r: CatchRecord; onChange: (patch: Partial<CatchRecord>) => void; original?: CatchRecord; showScope?: boolean;
}) {
  const { data } = usePrototype();
  const boat = data?.boats.find(b => b.id === r.boatId);
  const changedBoat = boat && BOAT_DETAIL_FIELDS.some(key => boat[key] !== r[key]);
  return <>
    <Heading>{r.boatName || 'Boat not chosen'}{r.vesselType ? ` · ${r.vesselType}` : ''}</Heading>
    <Select label="Vessel type" value={r.vesselType} before={original?.vesselType} options={VESSELS.map(v => ({ value: v, label: v }))} onChange={vesselType => onChange({ vesselType })} />
    <Select label="Propulsion" value={r.propulsion} before={original?.propulsion} options={PROPULSIONS.map(v => ({ value: v, label: v }))} onChange={propulsion => onChange({ propulsion, horsepower: propulsion.includes('engine') ? r.horsepower : '' })} />
    {r.propulsion.includes('engine') ? <Field label="Horsepower" value={r.horsepower} before={original?.horsepower} numeric onChange={horsepower => onChange({ horsepower })} /> : null}
    <Field label="Vessel length (m)" hint="Tip to tip" value={r.length} before={original?.length} numeric onChange={length => onChange({ length })} />
    <Field label="Registration or origin" value={r.registration} before={original?.registration} onChange={registration => onChange({ registration })} />
    <Field label="Number of crew" value={r.crew} before={original?.crew} numeric onChange={crew => onChange({ crew })} />
    <View style={s.row}>
      <View style={s.flex}><Btn label="Fewer crew" icon="minus" kind="secondary" onPress={() => onChange({ crew: r.crew ? String(Math.max(0, Number(r.crew) - 1)) : '' })} /></View>
      <View style={s.flex}><Btn label="More crew" icon="plus" kind="secondary" onPress={() => onChange({ crew: String((Number(r.crew) || 0) + 1) })} /></View>
    </View>
    {showScope && changedBoat ? <Card>
      <Txt bold>Update the saved boat, or this record only?</Txt>
      <Choices label="Apply boat details to" options={['This record only', 'Update saved boat']} value={r.updateBoat ? 'Update saved boat' : 'This record only'} onChange={v => onChange({ updateBoat: v === 'Update saved boat' })} />
    </Card> : null}
  </>;
}
export function GearTrip({ r, onChange, original }: { r: CatchRecord; onChange: (patch: Partial<CatchRecord>) => void; original?: CatchRecord }) {
  const mesh = /^(GN|BT)/.test(r.gear), hooks = /^(HL|LL|DL)/.test(r.gear);
  return <>
    <Heading>Gear</Heading>
    <Select label="Gear type" value={r.gear} before={original?.gear} options={GEARS.map(v => ({ value: v, label: v }))}
      onChange={gear => onChange({ gear, mesh: /^(GN|BT)/.test(gear) ? r.mesh : '', hookSize: /^(HL|LL|DL)/.test(gear) ? r.hookSize : '', hooks: /^(HL|LL|DL)/.test(gear) ? r.hooks : '' })} />
    <Field label="Total number of gears" value={r.gearCount} before={original?.gearCount} numeric onChange={gearCount => onChange({ gearCount })} />
    {mesh ? <Field label="Mesh size (inches)" hint="Small is 4 or less; large is over 4." value={r.mesh} before={original?.mesh} numeric onChange={mesh => onChange({ mesh })} /> : null}
    {hooks ? <>
      <Field label="Hook size" value={r.hookSize} before={original?.hookSize} onChange={hookSize => onChange({ hookSize })} />
      <Field label="Hooks per line" value={r.hooks} before={original?.hooks} numeric onChange={hooks => onChange({ hooks })} />
    </> : null}
    <Heading>Trip</Heading>
    <Field label="Area fished" value={r.area} before={original?.area} onChange={area => onChange({ area })} />
    <Field label="Date and time out" hint="YYYY-MM-DDTHH:MM · East Africa time" value={r.timeOut} before={original?.timeOut} onChange={timeOut => onChange({ timeOut })} />
    <Field label="Date and time in" hint="YYYY-MM-DDTHH:MM · East Africa time" value={r.timeIn} before={original?.timeIn} onChange={timeIn => onChange({ timeIn })} />
    <Choices label="FAD fishing" value={r.fad} options={['Yes', 'No', 'Not recorded']} onChange={v => onChange({ fad: v === 'Not recorded' ? '' : v, fadType: v === 'Yes' ? r.fadType : '' })} />
    {r.fad === 'Yes' ? <Choices label="FAD type" value={r.fadType} options={['Anchored', 'Free floating']} onChange={fadType => onChange({ fadType })} /> : null}
    {original && (r.fad !== original.fad || r.fadType !== original.fadType) ? <Txt small bold>Changed · Was: {original.fad || 'Not recorded'} {original.fadType}</Txt> : null}
  </>;
}
