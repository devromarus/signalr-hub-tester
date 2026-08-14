import { Indicator } from '@alfalab/core-components/indicator';
import { Typography } from '@alfalab/core-components/typography';
import type { ConnectionStatus } from '../../types/signalr.types';
import styles from './StatusBar.module.css';

// Отображение статуса соединения цветовым индикатором (UI-01, C-24).
// Зелёный — подключено, красный — ошибка, жёлтый — переподключение, серый — отключено.

interface StatusBarProps {
  status: ConnectionStatus;
  /** Инвертированная цветовая тема текста для тёмной/фирменной подложки (например, шапка). */
  inverted?: boolean;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string }> = {
  disconnected: { label: 'Отключено', color: '#8a8a8e' },
  connecting: { label: 'Подключение…', color: '#0b7fff' },
  connected: { label: 'Подключено', color: '#2fc26e' },
  reconnecting: { label: 'Переподключение…', color: '#f5a623' },
  error: { label: 'Ошибка', color: '#f5222d' },
};

export function StatusBar({ status, inverted }: StatusBarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={styles.statusBar}>
      <Indicator size={16} backgroundColor={config.color} border={inverted ? { color: '#fff', width: 1 } : undefined} />
      <Typography.Text view="primary-medium" color={inverted ? 'primary-inverted' : 'primary'}>
        {config.label}
      </Typography.Text>
    </div>
  );
}