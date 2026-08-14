import type { SavedMethod } from '../types/signalr.types';

// Клиентский сервис для работы с сохранёнными методами хаба и телами запросов.
// Хранение в localStorage, по аналогии с сохранёнными подключениями (FR-02, TR-02).
// Максимум 20 сохранённых методов.

const STORAGE_KEY = 'signalr-hub-tester:methods';
const MAX_METHODS = 20;

function readStorage(): SavedMethod[] {
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

function writeStorage(methods: SavedMethod[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
  } catch {
    // Хранилище недоступно/переполнено — сохранённые методы останутся только в памяти сессии.
  }
}

export async function fetchMethods(): Promise<SavedMethod[]> {
  return readStorage();
}

export async function saveMethod(methodName: string, params: string): Promise<SavedMethod> {
  const methods = readStorage();
  const existing = methods.find((m) => m.methodName === methodName && m.params === params);

  const method: SavedMethod = {
    id: existing?.id ?? crypto.randomUUID(),
    methodName,
    params,
    lastUsedAt: new Date().toISOString(),
  };

  const next = [method, ...methods.filter((m) => m.id !== method.id)].slice(0, MAX_METHODS);
  writeStorage(next);
  return method;
}

export async function deleteMethod(id: string): Promise<void> {
  const methods = readStorage().filter((m) => m.id !== id);
  writeStorage(methods);
}
