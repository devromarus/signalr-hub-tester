import type { JsonValidationResult } from '../types/signalr.types';

// Валидация JSON перед отправкой (FR-13, C-14).
// При ошибке возвращается позиция ошибки (ER-03, C-21).

export function validateJson(input: string): JsonValidationResult {
  if (!input.trim()) {
    return { valid: true }; // пустые параметры допустимы (FR-16)
  }
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    const position = extractPosition(message);
    return { valid: false, error: message, position };
  }
}

// Извлечение позиции ошибки из сообщения JSON.parse (например, "at position 12").
function extractPosition(message: string): number | undefined {
  const match = message.match(/position\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

// Разбор строки параметров в массив аргументов для вызова метода.
// Пустая строка -> пустой массив (FR-16).
// JSON-массив -> аргументы по порядку.
// JSON-объект/значение -> единственный аргумент.
export function parseArguments(input: string): unknown[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}