import { useCallback, useEffect, useRef, useState } from 'react';
import { signalrService } from '../services/signalr.service';
import type { ConnectionStatus } from '../types/signalr.types';

// Хук управления подключением к SignalR-хабу (FR-05).
// Управляет статусами соединения и обработкой ошибок (ER-01…ER-04).

export interface UseSignalRConnectionResult {
  status: ConnectionStatus;
  connect: (hubUrl: string, token?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export function useSignalRConnection(): UseSignalRConnectionResult {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<ConnectionStatus>('disconnected');

  const updateStatus = useCallback((next: ConnectionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const connect = useCallback(
    async (hubUrl: string, token?: string) => {
      setError(null);
      updateStatus('connecting');
      try {
        await signalrService.connect(hubUrl, token);
        updateStatus('connected');
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        updateStatus('error');
        throw e;
      }
    },
    [updateStatus],
  );

  const disconnect = useCallback(async () => {
    try {
      await signalrService.disconnect();
    } finally {
      updateStatus('disconnected');
    }
  }, [updateStatus]);

  // Регистрация обработчиков событий соединения (ER-01, C-19).
  useEffect(() => {
    signalrService.onReconnecting(() => {
      updateStatus('reconnecting');
    });
    signalrService.onReconnected(() => {
      updateStatus('connected');
    });
    signalrService.onClose((err) => {
      if (err) {
        setError(err.message);
        updateStatus('error');
      } else {
        updateStatus('disconnected');
      }
    });
  }, [updateStatus]);

  const clearError = useCallback(() => setError(null), []);

  return { status, connect, disconnect, error, clearError };
}