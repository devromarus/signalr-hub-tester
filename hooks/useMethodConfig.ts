import { useCallback, useEffect, useState } from 'react';
import { deleteMethod, fetchMethods, saveMethod } from '../services/method-config.service';
import type { SavedMethod } from '../types/signalr.types';

// Хук управления сохранёнными методами хаба и телами запросов (по аналогии с
// useConnectionConfig — сохранение конфигураций подключений, FR-02).

export interface UseMethodConfigResult {
  methods: SavedMethod[];
  loading: boolean;
  refresh: () => Promise<void>;
  save: (methodName: string, params: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useMethodConfig(): UseMethodConfigResult {
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMethods();
      setMethods(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (methodName: string, params: string) => {
      await saveMethod(methodName, params);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMethod(id);
      await refresh();
    },
    [refresh],
  );

  return { methods, loading, refresh, save, remove };
}
