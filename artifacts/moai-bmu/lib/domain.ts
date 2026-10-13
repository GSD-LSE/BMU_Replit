export type Language = 'en' | 'sw';
export type LandingStatus = 'draft' | 'approved' | 'rejected';
export type SyncStatus = 'waiting' | 'simulated';
export type PriceBasis = 'per_kg' | 'total' | 'unknown';
export type WeightBasis = 'measured' | 'estimated';
export type CaptureSource = 'manual' | 'voice' | 'photo';

export type CatchItem = {
  id: string;
  localName: string;
  speciesGroup: string;
  weightKg: number;
  weightBasis: WeightBasis;
  priceBasis: PriceBasis;
  priceAmount: number | null;
  photoUri?: string;
};

export type RecordHistoryEvent = {
  at: string;
  by: string;
  reason: string;
  summary: string;
};

export type LandingRecord = {
  id: string;
  site: string;
  landedAt: string;
  vessel: string;
  crewCount: number | null;
  gear: string;
  departureTime: string;
  returnTime: string;
  area: string;
  catchItems: CatchItem[];
  observation: string;
  source: CaptureSource;
  audioUri?: string;
  transcript?: string;
  photoUri?: string;
  seededVoiceError?: boolean;
  status: LandingStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  history: RecordHistoryEvent[];
};

export type AppSettings = {
  language: Language;
  site: string;
  demoConnectivity: boolean;
};

export type AppData = {
  records: LandingRecord[];
  settings: AppSettings;
};

export type CatchDraft = {
  id: string;
  localName: string;
  speciesGroup: string;
  weightKg: string;
  weightBasis: WeightBasis;
  priceBasis: PriceBasis;
  priceAmount: string;
  photoUri?: string;
};

export type LandingForm = {
  site: string;
  landedAt: string;
  vessel: string;
  crewCount: string;
  gear: string;
  departureTime: string;
  returnTime: string;
  area: string;
  catchItems: CatchDraft[];
  observation: string;
  photoUri?: string;
};

export const OFFICIAL_NAME = 'Mariam Asha';
export const BMU_NAME = 'Demo BMU · Kilifi';
export const DEMO_SITES = [
  'Demo Landing A · Kilifi BMU',
  'Demo Landing B · Kilifi BMU',
  'Demo Landing C · Kilifi BMU',
];
export const STORAGE_KEY = 'moai-bmu-demo-v1';

export function makeId(prefix = 'LM'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function newLocalDateTime(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function parseLocalDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(hasZone ? value : `${withSeconds}+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatDateTime(value: string, language: Language = 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Needs confirmation';
  return new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function nairobiDayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function catchItemValue(item: CatchItem): number | null {
  if (item.priceBasis === 'unknown' || item.priceAmount === null) return null;
  if (!Number.isFinite(item.priceAmount) || item.priceAmount <= 0) return null;
  return item.priceBasis === 'total' ? item.priceAmount : item.weightKg * item.priceAmount;
}

export function recordSaleValue(record: LandingRecord): number | null {
  let sum = 0;
  for (const item of record.catchItems) {
    const value = catchItemValue(item);
    if (value === null) return null;
    sum += value;
  }
  return record.catchItems.length ? sum : null;
}

export function validateLanding(record: LandingRecord): string[] {
  const errors: string[] = [];
  if (!record.site.trim()) errors.push('Landing site is required.');
  if (!parseLocalDateTime(record.landedAt)) errors.push('A valid landing date and time are required.');
  if (!record.vessel.trim()) errors.push('Vessel code or name is required.');
  if (!record.catchItems.length) errors.push('Add at least one catch item.');
  record.catchItems.forEach((item, index) => {
    const label = `Catch item ${index + 1}`;
    if (!item.localName.trim() && !item.speciesGroup.trim()) errors.push(`${label} needs a local name or category.`);
    if (!Number.isFinite(item.weightKg) || item.weightKg <= 0) errors.push(`${label} needs a weight greater than 0 kg.`);
    if (item.priceBasis !== 'unknown' && (!item.priceAmount || item.priceAmount <= 0)) {
      errors.push(`${label} needs a positive price, or set price to Unknown.`);
    }
  });
  return errors;
}

export function toCsv(records: LandingRecord[]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = [
    'record_id', 'landing_site', 'landing_time_africa_nairobi', 'vessel',
    'status', 'catch_local_name', 'species_group', 'weight_kg', 'weight_basis',
    'price_basis', 'price_amount_kes', 'recorded_sale_value_kes', 'sync_status',
  ];
  const rows = records.flatMap((record) =>
    record.catchItems.map((item) => [
      record.id,
      record.site,
      formatDateTime(record.landedAt),
      record.vessel,
      record.status,
      item.localName,
      item.speciesGroup,
      item.weightKg,
      item.weightBasis,
      item.priceBasis,
      item.priceAmount,
      catchItemValue(item),
      record.syncStatus === 'simulated' ? 'simulated_sync' : 'waiting',
    ].map(cell).join(',')),
  );
  return [header.map(cell).join(','), ...rows].join('\r\n');
}
