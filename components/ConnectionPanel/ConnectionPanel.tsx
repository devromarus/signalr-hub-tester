import { useEffect, useState } from 'react';
import { Button } from '@alfalab/core-components/button';
import { Input } from '@alfalab/core-components/input';
import { Select } from '@alfalab/core-components/select';
import { Typography } from '@alfalab/core-components/typography';
import { Divider } from '@alfalab/core-components/divider';
import { Spinner } from '@alfalab/core-components/spinner';
import { maskToken } from '../../utils/token-masker';
import type { ConnectionConfig, ConnectionStatus } from '../../types/signalr.types';
import styles from './ConnectionPanel.module.css';

// Панель подключения: ввод URL, токена, кнопки подключения/отключения,
// список сохранённых подключений (FR-01…FR-10).
// Токен хранится только в памяти (SR-01), в localStorage сохраняется только URL.

interface ConnectionPanelProps {
  status: ConnectionStatus;
  configs: ConnectionConfig[];
  selectedHubUrl: string;
  onConnect: (hubUrl: string, token?: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSave: (hubUrl: string) => Promise<void>;
  onSelectConfig: (config: ConnectionConfig) => void;
}

export function ConnectionPanel({
  status,
  configs,
  selectedHubUrl,
  onConnect,
  onDisconnect,
  onSave,
  onSelectConfig,
}: ConnectionPanelProps) {
  const [hubUrl, setHubUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Синхронизация выбранного из списка URL (FR-02)
  useEffect(() => {
    if (selectedHubUrl) {
      setHubUrl(selectedHubUrl);
    }
  }, [selectedHubUrl]);

  const isConnected = status === 'connected';
  const isBusy = status === 'connecting' || status === 'reconnecting' || connecting;

  const handleConnect = async () => {
    if (!hubUrl.trim()) {
      return;
    }
    setConnecting(true);
    try {
      await onConnect(hubUrl.trim(), token || undefined);
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!hubUrl.trim()) {
      return;
    }
    await onSave(hubUrl.trim());
  };

  const selectOptions = configs.map((c) => ({
    key: c.id,
    content: c.hubUrl,
  }));

  return (
    <div className={styles.panel}>
      <Typography.Title tag="h3" view="small">
        Подключение
      </Typography.Title>

      <Input
        label="URL хаба"
        value={hubUrl}
        onChange={(e) => setHubUrl(e.target.value)}
        placeholder="https://example.com/hub"
        block
      />

      <Input
        label="Токен (Bearer)"
        value={showToken ? token : maskToken(token)}
        onChange={(e) => setToken(e.target.value)}
        type={showToken ? 'text' : 'password'}
        rightAddons={
          <Button
            view="secondary"
            size={32}
            onClick={() => setShowToken((v) => !v)}
          >
            {showToken ? 'Скрыть' : 'Показать'}
          </Button>
        }
        block
      />

      <div className={styles.actions}>
        <Button
          view="primary"
          onClick={handleConnect}
          disabled={isConnected || isBusy || !hubUrl.trim()}
          loading={isBusy}
        >
          {isConnected ? 'Подключено' : 'Подключить'}
        </Button>
        <Button
          view="secondary"
          onClick={onDisconnect}
          disabled={!isConnected}
        >
          Отключить
        </Button>
        <Button view="secondary" onClick={handleSave} disabled={!hubUrl.trim()}>
          Сохранить
        </Button>
      </div>

      {isBusy && <Spinner visible preset={24} />}

      <Divider />

      <Typography.Text view="primary-medium">Сохранённые подключения</Typography.Text>
      {configs.length > 0 ? (
        <Select
          options={selectOptions}
          placeholder="Выберите подключение"
          onChange={(payload) => {
            const selected = configs.find((c) => c.id === payload.selected?.key);
            if (selected) {
              onSelectConfig(selected);
            }
          }}
          block
        />
      ) : (
        <Typography.Text view="secondary-medium">Нет сохранённых подключений</Typography.Text>
      )}
    </div>
  );
}