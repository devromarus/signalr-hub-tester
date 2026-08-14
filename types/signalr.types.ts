// Типы данных SignalR Hub Tester

/** Статус соединения с хабом. */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/** Тип журнальной записи. */
export type LogType = 'info' | 'error' | 'event';

/** Запись журнала операций. */
export interface LogEntry {
  id: string;
  timestamp: string; // ISO-строка
  type: LogType;
  message: string;
  data?: unknown;
}

/** Результат вызова метода хаба. */
export interface InvokeResult {
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

/** Результат валидации JSON. */
export interface JsonValidationResult {
  valid: boolean;
  error?: string;
  position?: number;
}

/** Сохранённая конфигурация подключения (хранится в localStorage, токен не сохраняется). */
export interface ConnectionConfig {
  id: string;
  hubUrl: string;
  lastUsedAt: string;
}

/** Сохранённый метод хаба с телом запроса (хранится в localStorage, аналогично ConnectionConfig). */
export interface SavedMethod {
  id: string;
  methodName: string;
  params: string;
  lastUsedAt: string;
}

/** Входящее событие от хаба. */
export interface HubEvent {
  id: string;
  eventName: string;
  data: unknown;
  timestamp: string;
}

/** Элемент потоковой передачи. */
export interface StreamItem {
  id: string;
  data: unknown;
  timestamp: string;
}
