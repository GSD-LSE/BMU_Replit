import {
  DEMO_SITES,
  makeId,
  newLocalDateTime,
  parseLocalDateTime,
  type LandingRecord,
} from './domain';
import {
  aiSuggestSpecies,
  aiTranscribe,
  type SuggestSpeciesRequest,
  type SuggestSpeciesResponse,
  type TranscribeAudioRequest,
} from '@workspace/api-client-react';

export type DemoAiService = {
  makePreparedVoiceDraft: (site: string) => LandingRecord;
  makePreparedPhotoDraft: (site: string) => LandingRecord;
  transcribeAudio: (request: TranscribeAudioRequest) => Promise<{ transcript: string }>;
  analyzeImage: (request: SuggestSpeciesRequest) => Promise<SuggestSpeciesResponse>;
};

export const aiService: DemoAiService = {
  makePreparedVoiceDraft(site) {
    const now = new Date().toISOString();
    return {
      id: makeId('VOICE'),
      site: site || DEMO_SITES[0],
      landedAt: parseLocalDateTime(newLocalDateTime()) ?? now,
      vessel: 'Demo Boat 01',
      crewCount: null,
      gear: '',
      departureTime: '',
      returnTime: '',
      area: '',
      catchItems: [{
        id: makeId('CATCH'),
        localName: 'Changu',
        speciesGroup: 'Rabbitfish',
        weightKg: 21,
        weightBasis: 'measured',
        priceBasis: 'per_kg',
        priceAmount: 350,
      }],
      observation: '',
      source: 'voice',
      transcript: 'Demo Boat 01 landed 12 kilograms of rabbitfish at Demo Landing A. Price was 350 Kenyan shillings per kilogram.',
      seededVoiceError: true,
      status: 'draft',
      syncStatus: 'waiting',
      createdAt: now,
      history: [],
    };
  },
  makePreparedPhotoDraft(site) {
    const now = new Date().toISOString();
    return {
      id: makeId('PHOTO'),
      site: site || DEMO_SITES[0],
      landedAt: parseLocalDateTime(newLocalDateTime()) ?? now,
      vessel: '',
      crewCount: null,
      gear: '',
      departureTime: '',
      returnTime: '',
      area: '',
      catchItems: [{
        id: makeId('CATCH'),
        localName: 'Changu',
        speciesGroup: 'Rabbitfish',
        weightKg: 0,
        weightBasis: 'measured',
        priceBasis: 'unknown',
        priceAmount: null,
      }],
      observation: '',
      source: 'photo',
      photoUri: 'prepared-demo',
      transcript: 'Prepared demo suggestion: Rabbitfish (Changu). Confirm or correct this suggestion.',
      status: 'draft',
      syncStatus: 'waiting',
      createdAt: now,
      history: [],
    };
  },
  transcribeAudio: (request) => aiTranscribe(request),
  analyzeImage: (request) => aiSuggestSpecies(request),
};
