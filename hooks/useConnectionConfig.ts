import { useCallback, useEffect, useState } from 'react';
import {
  deleteConfig,
  fetchConfigs,
  saveConfig,
} from '../services/connection-config.service';
import type { ConnectionConfig } from '../types/signalr.types';

// Хук управления сохранёнными конфигурациями подключений (FR-02, C-13).

export interface UseConnectionConfigResult {
  configs: ConnectionConfig[];
  loading: boolean;
  refresh: () => Promise<void>;
  save: (hubUrl: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useConnectionConfig(): UseConnectionConfigResult {
  const [configs, setConfigs] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConfigs();
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (hubUrl: string) => {
      await saveConfig(hubUrl);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteConfig(id);
      await refresh();
    },
    [refresh],
  );

  return { configs, loading, refresh, save, remove };
}