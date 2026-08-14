import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// Хук изменения ширины левой панели подключения перетаскиванием (drag-resize).
// Ширина ограничена MIN_WIDTH/MAX_WIDTH и сохраняется в localStorage между
// сессиями. На узких экранах (адаптивность от 1024px, TR-09, C-07) ширина
// панели переопределяется в CSS через !important — хук на мобильной раскладке
// не задействуется.

const STORAGE_KEY = 'signalr-hub-tester:sidebar-width';
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;

function clamp(value: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

export interface UseResizableSidebarResult {
  width: number;
  isResizing: boolean;
  startResizing: (event: ReactPointerEvent) => void;
}

export function useResizableSidebar(): UseResizableSidebarResult {
  const [width, setWidth] = useState<number>(() => readStoredWidth());
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const widthRef = useRef(width);
  widthRef.current = width;

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const delta = event.clientX - startXRef.current;
    setWidth(clamp(startWidthRef.current + delta));
  }, []);

  const stopResizing = useCallback(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResizing);
    setIsResizing(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    } catch {
      // Хранилище недоступно — ширина панели останется только в памяти сессии.
    }
  }, [handlePointerMove]);

  const startResizing = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      startXRef.current = event.clientX;
      startWidthRef.current = widthRef.current;
      setIsResizing(true);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopResizing);
    },
    [handlePointerMove, stopResizing],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
    };
  }, [handlePointerMove, stopResizing]);

  return { width, isResizing, startResizing };
}
