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
      if (parsed.version !== 1 || !Array.isArray(parsed.records) || !Array.isArray(parsed.boats) || !parsed.settings) {
        throw new Error('Prototype storage could not be read. Existing data has not been overwritten.');
      }
      const records = parsed.records.map(record => ({
        ...record,
        site: record.site || parsed.settings.site,
        noCatch: record.noCatch ?? false,
        status: (record.status as string) === 'Approved' ? 'Saved' : record.status,
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
        records,
        dayPrices,
        filters: {
          ...parsed.filters,
          statuses: parsed.filters.statuses.filter(status => status !== 'Approved'),
        },
      };
    },
    write(state: PrototypeState): Promise<void> {
      const serialized = JSON.stringify(state);
      const operation = queue.then(async () => {
        if (state.settings.failSaves) throw new Error('Simulated local-storage failure. Disable the test failure and retry.');
        await adapter.setItem(PROTOTYPE_KEY, serialized);
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
