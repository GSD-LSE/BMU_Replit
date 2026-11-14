import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { finishPhoto, makeFixtures, type PrototypeState } from './model';
import { createLocalStorage } from './storage';
import { configureLayoutMotion, isReducedMotionEnabled } from '@/components/prototype/motion';

type Mutation = (current: PrototypeState) => PrototypeState;
type Store = {
  data: PrototypeState | null; saved: boolean; error: string;
  change: (mutation: Mutation) => Promise<boolean>; retry: () => Promise<boolean>;
};
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PrototypeState | null>(null);
  const [savedRevision, setSavedRevision] = useState(-1);
  const [error, setError] = useState('');
  const current = useRef<PrototypeState | null>(null);
  const storage = useRef(createLocalStorage(AsyncStorage));
  const alive = useRef(true);
  const persist = (next: PrototypeState): Promise<boolean> => {
    return storage.current.write(next).then(() => {
      if (alive.current) { setSavedRevision(next.revision); setError(''); }
      return true;
    }).catch(e => {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not save on this phone.');
      return false;
    });
  };
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        const loaded = await storage.current.read();
        const parsed = loaded ? { ...loaded, banner: undefined } : makeFixtures();
        current.current = parsed;
        if (alive.current) {
          setData(parsed);
          if (loaded) setSavedRevision(parsed.revision);
          else await persist(parsed);
        }
      } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not load local data.'); }
    })();
    return () => { alive.current = false; };
  }, []);
  const change = async (mutation: Mutation) => {
    if (!current.current) return false;
    const previous = current.current;
    const next = { ...mutation(previous), revision: previous.revision + 1 };
    const photoFinished = previous.records.some(record => record.photo?.state === 'processing'
      && next.records.find(nextRecord => nextRecord.id === record.id)?.photo?.state !== 'processing');
    const filtersChanged = JSON.stringify(previous.filters) !== JSON.stringify(next.filters);
    const layoutChanged = (!!next.undo !== !!previous.undo) || next.banner?.text !== previous.banner?.text
      || next.edit?.section !== previous.edit?.section || filtersChanged || photoFinished;
    if (layoutChanged) configureLayoutMotion(isReducedMotionEnabled());
    current.current = next;
    setData(next);
    return persist(next);
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = current.current;
      if (!snapshot?.records.some(r => !r.deleted && r.photo?.state === 'processing' && (r.photo.dueAt ?? Infinity) <= Date.now())) return;
      void change(s => ({ ...s, records: s.records.map(r => !r.deleted && r.photo?.state === 'processing' && (r.photo.dueAt ?? Infinity) <= Date.now() ? finishPhoto(s, r) : r) }));
    }, 500);
    return () => clearInterval(timer);
  }, []);
  return <Context.Provider value={{ data, saved: !!data && savedRevision === data.revision && !error, error,
    change, retry: () => current.current ? persist(current.current) : Promise.resolve(false) }}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error('PrototypeProvider is required');
  return store;
}
