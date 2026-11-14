import { PROTOTYPE_KEY, dayKey, type PrototypeState } from './model';
export type LocalAdapter = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
// Serialize writes so a slow older save can never replace a newer local edit.
export function createLocalStorage(adapter: LocalAdapter) {
  let queue = Promise.resolve();
  return {
    async read(): Promise<PrototypeState | null> {
      const raw = await adapter.getItem(PROTOTYPE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PrototypeState;
      if (![1, 2].includes(parsed.version) || !Array.isArray(parsed.records) || !Array.isArray(parsed.boats) || !parsed.settings) {
        throw new Error('Prototype storage could not be read. Existing data has not been overwritten.');
      }
      const records = parsed.records.map(record => ({
        ...record,
        site: record.site || parsed.settings.site,
        noCatch: record.noCatch ?? false,
        status: (record.status as string) === 'Approved' ? 'Saved' : (record.status as string) === 'Couldn’t send' ? "Couldn't send" : record.status,
        lastSentAt: record.lastSentAt ?? record.sentAt,
        lines: (record.lines ?? []).map(line => ({
          ...line,
          ...(line.price && !line.priceSource ? { priceSource: "today's price" as const, priceSetAt: record.date } : {}),
        })),
        suggestions: record.suggestions ?? [],
      }));
      const dayPrices = Array.isArray(parsed.dayPrices) ? [...parsed.dayPrices] : [];
      for (const record of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
        if (record.deleted) continue;
        for (const line of record.lines) {
          if (!line.price || dayPrices.some(item => item.site === record.site && item.date === dayKey(record.date) && item.speciesId === line.speciesId)) continue;
          dayPrices.push({ site: record.site, date: dayKey(record.date), speciesId: line.speciesId, price: line.price, setAt: line.priceSetAt ?? record.date });
        }
      }
      return {
        ...parsed,
        version: 2,
        trends: { history: 'County loaded', countyReplies: false, reminderCard: false, nextFlagFails: false, chartLines: 'Overlay',
          reminderWeeks: 0, fabVariant: 'extended', fabSide: 'Right', fabHomeButton: false, showAverage: false, chartView: 'Chart', rangeChoice: '3 years',
          ...(parsed.trends ?? {}) },
        flags: Array.isArray(parsed.flags) ? parsed.flags.map((flag, index) => ({
          ...flag, number: flag.number ?? flag.sentCard?.number ?? parsed.flags!.length - index,
        })) : [],
        trendReminderLog: Array.isArray(parsed.trendReminderLog) ? parsed.trendReminderLog.filter(item =>
          !!item && typeof item === 'object' && typeof item.id === 'string') : [],
        settings: { ...parsed.settings, nextSendFails: parsed.settings.nextSendFails ?? false, introSeen: parsed.settings.introSeen ?? false },
        boats: parsed.boats.map(boat => ({ ...boat, archived: boat.archived ?? false })),
        fishers: (parsed.fishers ?? []).map(fisher => ({ ...fisher, archived: fisher.archived ?? false })),
        records,
        dayPrices,
        filters: {
          ...{ days: '7', from: '', to: '', boatId: '', fisherId: '', statuses: [], species: [], search: '' },
          ...(parsed.filters ?? {}),
          statuses: (parsed.filters?.statuses ?? []).filter(status => status !== 'Approved').map(status => status === 'Couldn’t send' ? "Couldn't send" : status),
        },
        attempts: (parsed.attempts ?? []).map(attempt => ({ ...attempt, state: ['Failed', 'Couldn’t send'].includes(attempt.state as string) ? "Couldn't send" : attempt.state })),
        recipients: parsed.recipients ?? [],
        schedule: parsed.schedule ?? { enabled: false, frequency: 'Every 2 weeks', weeks: '2', email: '', firstDate: dayKey() },
      };
    },
    write(state: PrototypeState): Promise<void> {
      const serialized = JSON.stringify(state);
      const operation = queue.then(async () => {
        if (state.settings.failSaves) throw new Error('Local save failed. Try again when this phone is ready.');
        await adapter.setItem(PROTOTYPE_KEY, serialized);
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
