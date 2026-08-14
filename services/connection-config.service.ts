import type { ConnectionConfig } from '../types/signalr.types';

// Клиентский сервис для работы с сохранёнными конфигурациями подключений.
// Хранение в localStorage (FR-02). Токен НЕ сохраняется (SR-01) — только URL.
// Максимум 10 сохранённых адресов (FR-02).

const STORAGE_KEY = 'signalr-hub-tester:connections';
const MAX_CONFIGS = 10;

function readStorage(): ConnectionConfig[] {
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

function writeStorage(configs: ConnectionConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export async function fetchConfigs(): Promise<ConnectionConfig[]> {
  return readStorage();
}

export async function saveConfig(hubUrl: string): Promise<ConnectionConfig> {
  const configs = readStorage();
  const existing = configs.find((c) => c.hubUrl === hubUrl);

  const config: ConnectionConfig = {
    id: existing?.id ?? crypto.randomUUID(),
    hubUrl,
    lastUsedAt: new Date().toISOString(),
  };

  const next = [config, ...configs.filter((c) => c.id !== config.id)].slice(0, MAX_CONFIGS);
  writeStorage(next);
  return config;
}

export async function deleteConfig(id: string): Promise<void> {
  const configs = readStorage().filter((c) => c.id !== id);
  writeStorage(configs);
}