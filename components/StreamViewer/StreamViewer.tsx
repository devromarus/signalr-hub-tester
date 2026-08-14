import { useRef, useState } from 'react';
import { Button } from '@alfalab/core-components/button';
import { Input } from '@alfalab/core-components/input';
import { Typography } from '@alfalab/core-components/typography';
import { signalrService } from '../../services/signalr.service';
import type { StreamItem } from '../../types/signalr.types';
import styles from './StreamViewer.module.css';

// Приём потоковых данных (Server-to-Client Streaming) (FR-22) и отмена потока (FR-23).

interface StreamViewerProps {
  isConnected: boolean;
  onStreamItem: (item: StreamItem) => void;
}

export function StreamViewer({ isConnected, onStreamItem }: StreamViewerProps) {
  const [methodName, setMethodName] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [items, setItems] = useState<StreamItem[]>([]);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const startStream = () => {
    if (!methodName.trim() || !isConnected) {
      return;
    }
    try {
      const subject = signalrService.stream<unknown>(methodName.trim());
      const subscription = subject.subscribe({
        next: (data) => {
          const item: StreamItem = {
            id: crypto.randomUUID(),
            data,
            timestamp: new Date().toISOString(),
          };
          setItems((prev) => [...prev, item]);
          onStreamItem(item);
        },
        error: () => setStreaming(false),
        complete: () => setStreaming(false),
      });
      subscriptionRef.current = subscription;
      setStreaming(true);
    } catch {
      setStreaming(false);
    }
  };

  const cancelStream = () => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setStreaming(false);
  };

  return (
    <div className={styles.streamer}>
      <Typography.Title tag="h3" view="small">
        Потоковая передача
      </Typography.Title>

      <div className={styles.controls}>
        <Input
          label="Метод потока"
          value={methodName}
          onChange={(e) => setMethodName(e.target.value)}
          placeholder="StreamMethod"
          block
        />
        {streaming ? (
          <Button view="secondary" onClick={cancelStream}>
            Отменить
          </Button>
        ) : (
          <Button
            view="primary"
            onClick={startStream}
            disabled={!isConnected || !methodName.trim()}
          >
            Запустить
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {items.length === 0 ? (
          <Typography.Text view="secondary-medium">Нет данных потока</Typography.Text>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.item}>
              <Typography.Text view="secondary-medium" tag="span">
                {new Date(item.timestamp).toLocaleTimeString()}
              </Typography.Text>
              <pre className={styles.pre}>
                {JSON.stringify(item.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}