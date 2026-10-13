import {
  BMU_NAME,
  DEMO_SITES,
  OFFICIAL_NAME,
  type AppData,
  type CatchItem,
  type LandingRecord,
} from './domain';

const LOCAL_CATCHES = [
  { localName: 'Daga', speciesGroup: 'Anchovy', weight: 8.5 },
  { localName: 'Changu', speciesGroup: 'Rabbitfish', weight: 6.2 },
  { localName: 'Tafi', speciesGroup: 'Parrotfish', weight: 4.8 },
  { localName: 'Mwani', speciesGroup: 'Mixed reef fish', weight: 9.1 },
  { localName: 'Pweza', speciesGroup: 'Octopus', weight: 3.4 },
  { localName: 'Kolekole', speciesGroup: 'Scad', weight: 11.6 },
];

function item(
  id: string,
  options: Partial<CatchItem> & Pick<CatchItem, 'localName' | 'speciesGroup' | 'weightKg'>,
): CatchItem {
  return {
    id,
    localName: options.localName,
    speciesGroup: options.speciesGroup,
    weightKg: options.weightKg,
    weightBasis: options.weightBasis ?? 'measured',
    priceBasis: options.priceBasis ?? 'per_kg',
    priceAmount: options.priceAmount === undefined ? 280 : options.priceAmount,
    photoUri: options.photoUri,
  };
}

function seedRecord(
  index: number,
  options: Partial<LandingRecord> & Pick<LandingRecord, 'status' | 'syncStatus'>,
): LandingRecord {
  const catchInfo = LOCAL_CATCHES[index % LOCAL_CATCHES.length];
  const createdAt = new Date(Date.now() - (index % 7) * 24 * 60 * 60 * 1000 - index * 19 * 60 * 1000).toISOString();
  const record: LandingRecord = {
    id: `DEMO-${String(index + 1).padStart(2, '0')}`,
    site: DEMO_SITES[0],
    landedAt: createdAt,
    vessel: `KLF ${String(24 + index).padStart(3, '0')}`,
    crewCount: 3 + (index % 5),
    gear: index % 2 ? 'Hand line' : 'Basket trap',
    departureTime: '',
    returnTime: '',
    area: '',
    catchItems: [item(`DEMO-${index + 1}-C1`, {
      ...catchInfo,
      weightKg: Math.round((catchInfo.weight + index % 4) * 10) / 10,
      priceAmount: 220 + (index % 4) * 40,
    })],
    observation: '',
    source: 'manual',
    status: options.status,
    syncStatus: options.syncStatus,
    createdAt,
    history: [],
  };
  return { ...record, ...options };
}

export function makeDemoData(): AppData {
  const approved = Array.from({ length: 16 }, (_, index) =>
    seedRecord(index, { status: 'approved', syncStatus: 'simulated', approvedBy: OFFICIAL_NAME, approvedAt: new Date(Date.now() - index * 50 * 60 * 1000).toISOString() }),
  );

  approved[0] = {
    ...approved[0],
    catchItems: [
      item('DEMO-01-C1', { localName: 'Daga', speciesGroup: 'Anchovy', weightKg: 7.5, priceAmount: 180 }),
      item('DEMO-01-C2', { localName: 'Changu', speciesGroup: 'Rabbitfish', weightKg: 5.5, priceAmount: 350 }),
    ],
  };
  approved[1] = {
    ...approved[1],
    catchItems: [item('DEMO-02-C1', { localName: 'Mchanganyiko', speciesGroup: 'Unknown species group', weightKg: 8.2, priceBasis: 'unknown', priceAmount: null })],
  };
  approved[2] = {
    ...approved[2],
    catchItems: [item('DEMO-03-C1', { localName: 'Tafi', speciesGroup: 'Parrotfish', weightKg: 5.3, priceBasis: 'unknown', priceAmount: null })],
  };
  approved[3] = {
    ...approved[3],
    catchItems: [item('DEMO-04-C1', { localName: 'Pweza', speciesGroup: 'Octopus', weightKg: 4.1, priceBasis: 'total', priceAmount: 1900 })],
  };
  approved[4] = {
    ...approved[4],
    catchItems: [item('DEMO-05-C1', { localName: 'Kolekole', speciesGroup: 'Scad', weightKg: 10.5, weightBasis: 'estimated', priceAmount: 250 })],
  };
  approved[15] = {
    ...approved[15],
    catchItems: [item('DEMO-16-C1', { localName: 'Changu', speciesGroup: 'Rabbitfish', weightKg: 8, priceAmount: 350 })],
    history: [{
      at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      by: OFFICIAL_NAME,
      reason: 'Corrected after checking the landing note',
      summary: 'Weight changed from 6.5 kg to 8 kg.',
    }],
  };

  const pendingOne = seedRecord(16, {
    status: 'draft',
    syncStatus: 'waiting',
    vessel: 'Demo Boat 07',
    catchItems: [item('DEMO-17-C1', { localName: 'Tafi', speciesGroup: 'Parrotfish', weightKg: 7.4, priceBasis: 'unknown', priceAmount: null })],
    observation: 'Awaiting official review.',
  });
  const pendingTwo = seedRecord(17, {
    status: 'draft',
    syncStatus: 'waiting',
    vessel: 'Demo Boat 09',
    source: 'photo',
    photoUri: 'prepared-demo',
    catchItems: [item('DEMO-18-C1', { localName: 'Mchanganyiko', speciesGroup: 'Unknown species group', weightKg: 6.8, priceBasis: 'unknown', priceAmount: null })],
    observation: 'Prepared photo suggestion was confirmed by the official.',
  });
  const waiting = seedRecord(18, {
    status: 'approved',
    syncStatus: 'waiting',
    approvedBy: OFFICIAL_NAME,
    approvedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  });
  const corrected = seedRecord(19, {
    status: 'approved',
    syncStatus: 'simulated',
    approvedBy: OFFICIAL_NAME,
    approvedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    catchItems: [item('DEMO-20-C1', { localName: 'Daga', speciesGroup: 'Anchovy', weightKg: 9.4, priceAmount: 210 })],
    history: [{
      at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      by: OFFICIAL_NAME,
      reason: 'Verified against the market slip',
      summary: 'Sale price corrected from KES 1,800 to KES 1,974.',
    }],
  });

  return {
    records: [...approved, pendingOne, pendingTwo, waiting, corrected],
    settings: {
      language: 'en',
      site: DEMO_SITES[0],
      demoConnectivity: true,
    },
  };
}

export const DEMO_BMU_NAME = BMU_NAME;
