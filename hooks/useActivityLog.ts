import { useCallback, useRef, useState } from 'react';
import type { LogEntry } from '../types/signalr.types';

// Хук журнала операций с персистентностью в localStorage (FR-24…FR-27).
// Ограничен последними MAX_ENTRIES записями, чтобы не превысить квоту
// localStorage — при переполнении/недоступности хранилища журнал продолжает
// работать в памяти сессии (запись просто не сохраняется на диск).

const STORAGE_KEY = 'signalr-hub-tester:log';
const MAX_ENTRIES = 300;

function readStorage(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Хранилище недоступно/переполнено — журнал остаётся только в памяти сессии.
  }
}

export interface UseActivityLogResult {
  entries: LogEntry[];
  append: (entry: LogEntry) => void;
  clear: () => void;
}

export function useActivityLog(): UseActivityLogResult {
  const [entries, setEntries] = useState<LogEntry[]>(() => readStorage());
  const entriesRef = useRef<LogEntry[]>(entries);

  const append = useCallback((entry: LogEntry) => {
    const next = [...entriesRef.current, entry].slice(-MAX_ENTRIES);
    entriesRef.current = next;
    setEntries(next);
    writeStorage(next);
  }, []);

  const clear = useCallback(() => {
    entriesRef.current = [];
    setEntries([]);
    writeStorage([]);
  }, []);

  return { entries, append, clear };
}
