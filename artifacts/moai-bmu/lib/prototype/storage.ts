import { PROTOTYPE_KEY, type PrototypeState } from './model';
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
      return parsed;
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
