'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { localDb } from './db';
import type { MessStore } from './db';

/**
 * Read from the store and re-render whenever it changes (local edit or cloud sync).
 * `deps` are extra inputs the selector uses, e.g. the selected date.
 */
export function useStore<T>(select: (db: MessStore) => T, deps: unknown[] = []): T {
  const version = useSyncExternalStore(localDb.subscribe, localDb.getVersion, localDb.getVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => select(localDb), [version, ...deps]);
}
