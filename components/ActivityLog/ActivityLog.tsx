import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@alfalab/core-components/button';
import { Checkbox } from '@alfalab/core-components/checkbox';
import { Input } from '@alfalab/core-components/input';
import { Typography } from '@alfalab/core-components/typography';
import type { LogEntry, LogType } from '../../types/signalr.types';
import styles from './ActivityLog.module.css';

// Журнал всех операций (FR-24…FR-27).
// Фильтрация по типу (FR-25, C-15), поиск (FR-26, C-15),
// экспорт в JSON (FR-27, C-16), автопрокрутка (UI-03, C-18).

interface ActivityLogProps {
  entries: LogEntry[];
  onClear: () => void;
}

type FilterState = Record<LogType, boolean>;

const INITIAL_FILTER: FilterState = { info: true, error: true, event: true };

export function ActivityLog({ entries, onClear }: ActivityLogProps) {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!filter[entry.type]) {
        return false;
      }
      if (!query) {
        return true;
      }
      const message = entry.message.toLowerCase();
      const data = entry.data !== undefined ? JSON.stringify(entry.data).toLowerCase() : '';
      return message.includes(query) || data.includes(query);
    });
  }, [entries, filter, search]);

  // Автопрокрутка к последней записи (UI-03, C-18)
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered, autoScroll]);

  const toggleFilter = (type: LogType) => {
    setFilter((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signalr-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.log}>
      <div className={styles.toolbar}>
        <Input
          label="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по журналу"
          block
        />
        <div className={styles.filters}>
          <Checkbox
            label="Информация"
            checked={filter.info}
            onChange={() => toggleFilter('info')}
          />
          <Checkbox
            label="Ошибки"
            checked={filter.error}
            onChange={() => toggleFilter('error')}
          />
          <Checkbox
            label="События"
            checked={filter.event}
            onChange={() => toggleFilter('event')}
          />
          <Checkbox
            label="Автопрокрутка"
            checked={autoScroll}
            onChange={() => setAutoScroll((v) => !v)}
          />
        </div>
        <div className={styles.actions}>
          <Button view="secondary" onClick={exportJson} disabled={filtered.length === 0}>
            Экспорт JSON
          </Button>
          <Button view="secondary" onClick={onClear} disabled={entries.length === 0}>
            Очистить
          </Button>
        </div>
      </div>

      <div className={styles.list} ref={listRef}>
        {filtered.length === 0 ? (
          <Typography.Text view="secondary-medium">Журнал пуст</Typography.Text>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className={`${styles.entry} ${styles[entry.type]}`}>
              <Typography.Text view="secondary-medium" tag="span">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Typography.Text>
              <Typography.Text view="primary-medium" tag="span">
                {entry.message}
              </Typography.Text>
              {entry.data !== undefined && (
                <pre className={styles.pre}>
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}